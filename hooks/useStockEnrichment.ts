import { useState } from 'react';
import { Asset, AssetType, DividendEvent } from '../types';
import * as storage from '../services/storage';
import { enrichStockBasicInfo, enrichStockDividendInfo, fetchDividendEventsForSymbol, fetchMarketRegime } from '../services/stock';

interface UseStockEnrichmentProps {
  setToast: (toast: { message: string; count: number } | null) => void;
}

type EnrichStatusType = 'price' | 'dividend';
type EnrichFunction = (stock: Asset) => Promise<Partial<Asset> | null>;

export const useStockEnrichment = ({ setToast }: UseStockEnrichmentProps) => {
  const [enrichStatus, setEnrichStatus] = useState({
    price: { isUpdating: false, progress: { current: 0, total: 0 } },
    dividend: { isUpdating: false, progress: { current: 0, total: 0 } },
  });

  const BATCH_SIZE = 3; // Number of parallel requests

  const enrichData = async (
    type: EnrichStatusType,
    enrichFn: EnrichFunction,
    stocksToUpdate: Asset[],
    onSuccess: (newAssets: Asset[]) => void
  ) => {
    setEnrichStatus(prev => ({ ...prev, [type]: { isUpdating: true, progress: { current: 0, total: stocksToUpdate.length } } }));
    setToast({ message: `${type === 'price' ? '快速更新' : '深度分析'}：正在更新 ${stocksToUpdate.length} 筆資料...`, count: stocksToUpdate.length });

    const currentAssets = storage.getAssets();
    let hasError = false;
    let processedCount = 0;

    // Pre-warm market regime cache before parallel execution
    await fetchMarketRegime(true);

    for (let i = 0; i < stocksToUpdate.length; i += BATCH_SIZE) {
      const batch = stocksToUpdate.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (stock) => {
        try {
          if (!stock.symbol) return;
          const info = await enrichFn(stock);
          
          const assetIndex = currentAssets.findIndex(a => a.id === stock.id);
          if (assetIndex !== -1 && info) {
            const existingAsset = currentAssets[assetIndex];
            const updatedAsset: Asset = { ...existingAsset, ...info, lastUpdated: Date.now() };

            if (type === 'price' && info.currentPrice) {
                 updatedAsset.amount = (Number(existingAsset.shares) || 0) * (Number(info.currentPrice) || 0);
            }
            currentAssets[assetIndex] = updatedAsset;
          }
        } catch (error) {
          console.error(`Enrichment failed for ${stock.symbol}:`, error);
          hasError = true;
        } finally {
          processedCount++;
          setEnrichStatus(prev => ({
            ...prev,
            [type]: { isUpdating: true, progress: { current: processedCount, total: stocksToUpdate.length } }
          }));
        }
      }));
    }

    storage.saveAssets(currentAssets);
    onSuccess(currentAssets);

    setToast({ message: hasError ? `部分資料更新失敗` : `${stocksToUpdate.length} 筆資料更新完成！`, count: stocksToUpdate.length });
    setTimeout(() => setToast(null), 3000);
    setEnrichStatus(prev => ({ ...prev, [type]: { isUpdating: false, progress: { current: 0, total: 0 } } }));
  };

  const getStocksToUpdate = (idsToEnrich: string[] | null = null): Asset[] => {
    const inventory = storage.getAssets().filter(a => a.type === AssetType.STOCK);
    if (idsToEnrich) {
      return inventory.filter(s => idsToEnrich.includes(s.id));
    }
    if (inventory.length === 0) {
      setToast({ message: `庫存中沒有持股可供更新`, count: 0 });
      setTimeout(() => setToast(null), 3000);
      return [];
    }
    const STALE_THRESHOLD = 14 * 24 * 60 * 60 * 1000;
    const priorityStocks = inventory.filter(s => !s.name || s.name === s.symbol || !s.currentPrice || !s.lastUpdated || (Date.now() - (s.lastUpdated || 0)) > STALE_THRESHOLD);
    return priorityStocks.length > 0 ? priorityStocks : inventory;
  };

  const updatePrices = (idsToEnrich: string[] | null = null, onSuccess: (newAssets: Asset[]) => void) => {
    if (enrichStatus.price.isUpdating || enrichStatus.dividend.isUpdating) return;
    const stocksToUpdate = getStocksToUpdate(idsToEnrich);
    if (stocksToUpdate.length === 0) return;
    enrichData('price', enrichStockBasicInfo, stocksToUpdate, onSuccess);
  };

  const updateDividends = (idsToEnrich: string[] | null = null, onSuccess: (newAssets: Asset[]) => void) => {
    if (enrichStatus.price.isUpdating || enrichStatus.dividend.isUpdating) return Promise.resolve();
    const stocksToUpdate = getStocksToUpdate(idsToEnrich);
    if (stocksToUpdate.length === 0) return Promise.resolve();
    return enrichData('dividend', enrichStockDividendInfo, stocksToUpdate, onSuccess);
  };

  const HELD_SYMBOL_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // 目前庫存股票 3 天內不重複掃描

  /**
   * 掃描指定股票代號本年度的除息事件並存回獨立 store（不依附庫存/Asset，全數賣出後仍可追蹤）。
   * 由呼叫端（App.tsx）在 updateDividends 完成後接續呼叫，因此不再檢查 enrichStatus 避免狀態競態。
   *
   * 為降低每次「AI 分析股息」的 FinMind 查詢量：已出清股票的股息事件是固定歷史資料，只要掃過一次就不再重掃；
   * 目前庫存股票則有 3 天冷卻期。
   */
  const updateDividendEvents = async (heldSymbols: string[], soldOutSymbols: string[], onSuccess: () => void) => {
    const scannedAtSnapshot = storage.getDividendScannedAt();
    const now = Date.now();

    const symbolsToScan = [
      ...heldSymbols.filter(sym => !scannedAtSnapshot[sym] || now - scannedAtSnapshot[sym] > HELD_SYMBOL_COOLDOWN_MS),
      ...soldOutSymbols.filter(sym => !scannedAtSnapshot[sym]),
    ];

    if (symbolsToScan.length === 0) { onSuccess(); return; }

    setEnrichStatus(prev => ({ ...prev, dividend: { isUpdating: true, progress: { current: 0, total: symbolsToScan.length } } }));

    let processedCount = 0;
    let eventsMap = storage.getDividendEvents();

    for (let i = 0; i < symbolsToScan.length; i += BATCH_SIZE) {
      const batch = symbolsToScan.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(batch.map(async (symbol) => {
        try {
          const events = await fetchDividendEventsForSymbol(symbol, eventsMap[symbol]);
          return { symbol, events, scanned: true };
        } catch (error) {
          console.error(`Dividend events fetch failed for ${symbol}:`, error);
          return { symbol, events: null, scanned: false };
        } finally {
          processedCount++;
          setEnrichStatus(prev => ({
            ...prev,
            dividend: { isUpdating: true, progress: { current: processedCount, total: symbolsToScan.length } }
          }));
        }
      }));

      // 每一批掃描結果都立刻讀取「當下最新」的 storage 再合併寫回——避免掃描期間使用者在畫面上
      // 把某筆股息標記為已入帳，卻被稍後才寫回的舊快照覆蓋掉（結果交易已建立，畫面卻沒更新）。
      eventsMap = storage.getDividendEvents();
      const scannedAt = storage.getDividendScannedAt();
      batchResults.forEach(({ symbol, events, scanned }) => {
        // events 為 null 代表 FinMind 對這個代號就是沒有股利資料（例如從未配息過），
        // 跟真的抓取失敗一樣都要記錄掃描時間，否則這類股票會每次都被重新掃描，白白浪費查詢量。
        if (events) eventsMap[symbol] = events;
        if (scanned) scannedAt[symbol] = now;
      });
      storage.saveDividendEvents(eventsMap);
      storage.saveDividendScannedAt(scannedAt);
    }

    onSuccess();
    setEnrichStatus(prev => ({ ...prev, dividend: { isUpdating: false, progress: { current: 0, total: 0 } } }));
  };

  return { enrichStatus, updatePrices, updateDividends, updateDividendEvents };
};

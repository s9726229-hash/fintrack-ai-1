
import React from 'react';
import { Asset, AssetType, Currency } from '../../types';
import { ASSET_TYPE_WARM_COLORS, ASSET_TYPE_LABELS } from '../../constants';
import { Edit2, Trash2, AlertCircle, Wallet, TrendingUp, Building2, Coins, CreditCard, MoreHorizontal } from 'lucide-react';
import { formatMoney } from '../../services/format';

interface AssetListProps {
  filteredAssets: Asset[];
  filterType: string;
  onEdit: (asset: Asset) => void;
  onDelete: (id: string) => void;
  calculateDaysSinceUpdate: (timestamp: number) => number;
}

const ASSET_TYPE_ICONS: Record<string, React.ElementType> = {
  CASH: Wallet,
  STOCK: TrendingUp,
  FUND: TrendingUp,
  REAL_ESTATE: Building2,
  CRYPTO: Coins,
  DEBT: CreditCard,
  OTHER: MoreHorizontal,
};

export const AssetList: React.FC<AssetListProps> = ({
  filteredAssets, filterType, onEdit, onDelete, calculateDaysSinceUpdate
}) => {
  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return '-';
    try {
        return new Date(timestamp).toLocaleDateString('sv-SE').slice(5); // MM-DD，固定簡短格式，不分裝置
    } catch {
        return '-';
    }
  };

  const subtotalAssets = filteredAssets.filter(a => a.type !== AssetType.DEBT).reduce((sum, a) => sum + a.amount, 0);
  const subtotalDebt = filteredAssets.filter(a => a.type === AssetType.DEBT).reduce((sum, a) => sum + a.amount, 0);
  const subtotalNet = subtotalAssets - subtotalDebt;

  return (
    <div className="bg-white border border-[#EDE4D6] rounded-2xl overflow-hidden max-h-[600px] flex flex-col">
         {filteredAssets.length > 0 && (
             <div className="grid grid-cols-3 gap-2 p-3 border-b border-[#EDE4D6] bg-[#FBF7F0] shrink-0">
                 {subtotalAssets > 0 ? (
                     <div className="bg-white rounded-lg p-2.5 min-w-0">
                         <div className="text-[#A69B87] text-[10px] font-bold uppercase truncate">資產小計</div>
                         <div className="text-[15px] font-bold text-[#3D3428] tabular-nums whitespace-nowrap">{formatMoney(subtotalAssets)}</div>
                     </div>
                 ) : <div />}
                 {subtotalDebt > 0 ? (
                     <div className="bg-white rounded-lg p-2.5 min-w-0">
                         <div className="text-[#A69B87] text-[10px] font-bold uppercase truncate">負債小計</div>
                         <div className="text-[15px] font-bold text-[#B45B45] tabular-nums whitespace-nowrap">{formatMoney(-subtotalDebt)}</div>
                     </div>
                 ) : <div />}
                 {filterType === 'ALL' && subtotalDebt > 0 && subtotalAssets > 0 ? (
                     <div className="bg-white rounded-lg p-2.5 min-w-0">
                         <div className="text-[#A69B87] text-[10px] font-bold uppercase truncate">淨值小計</div>
                         <div className={`text-[15px] font-bold tabular-nums whitespace-nowrap ${subtotalNet < 0 ? 'text-[#B45B45]' : 'text-[#3D3428]'}`}>
                             {formatMoney(subtotalNet)}
                         </div>
                     </div>
                 ) : <div />}
             </div>
         )}

         <div className="overflow-y-auto flex-1">
            {/* 統一標記：不分桌面/手機 */}
            <div className="sticky top-0 z-10 flex items-center gap-2 bg-[#FBF7F0]/95 backdrop-blur-sm px-3 py-2 border-b border-[#EDE4D6] text-xs text-[#A69B87] uppercase tracking-wider font-medium">
                <div className="flex-1 pl-10">資產名稱</div>
                <div className="w-24 flex-shrink-0 text-right pr-2">金額</div>
                <div className="w-20 flex-shrink-0 text-center">操作</div>
            </div>
            <div className="divide-y divide-[#F3ECDF]">
                {filteredAssets.map(asset => {
                    const daysOld = calculateDaysSinceUpdate(asset.lastUpdated);
                    const isStale = daysOld > 14;
                    const warmColor = ASSET_TYPE_WARM_COLORS[asset.type] || ASSET_TYPE_WARM_COLORS.OTHER;
                    const TypeIcon = ASSET_TYPE_ICONS[asset.type] || MoreHorizontal;
                    const hasProgress = asset.type === AssetType.DEBT && !!asset.originalAmount && asset.originalAmount > 0;
                    return (
                        <div key={asset.id} className="flex items-center gap-2 p-3 hover:bg-[#FBF7F0] transition-colors group">
                            <div className="p-2 rounded-full shrink-0" style={{ backgroundColor: warmColor.bg, color: warmColor.text }}>
                                <TypeIcon size={16}/>
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 truncate">
                                    <span className="font-bold text-[#3D3428] text-sm truncate">{asset.name}</span>
                                    {isStale && asset.type !== AssetType.DEBT && <AlertCircle size={12} className="text-amber-500 shrink-0" />}
                                </div>
                                <div className="text-[11px] text-[#A69B87] truncate tabular-nums">
                                    {ASSET_TYPE_LABELS[asset.type]} · {formatDate(asset.lastUpdated)}
                                    {asset.currency !== Currency.TWD && ` · ${asset.currency} ${asset.originalAmount?.toLocaleString()}`}
                                </div>
                                {hasProgress && <DebtProgressBar asset={asset} className="mt-1" />}
                            </div>
                            <div className="w-24 flex-shrink-0 text-right">
                                <AssetAmountCell asset={asset} />
                            </div>
                            <div className="w-20 flex-shrink-0">
                                <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => onEdit(asset)} className="p-2 rounded-lg text-[#A69B87] hover:bg-[#F6E4DE] hover:text-[#C4523A] transition-all" title="編輯" aria-label={`編輯 ${asset.name}`}>
                                        <Edit2 size={15}/>
                                    </button>
                                    <button onClick={() => onDelete(asset.id)} className="p-2 rounded-lg text-[#A69B87] hover:bg-[#F6E4DE] hover:text-[#B45B45] transition-all" title="刪除" aria-label={`刪除 ${asset.name}`}>
                                        <Trash2 size={15}/>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {filteredAssets.length === 0 && (
                    <div className="text-center py-10 text-[#A69B87] text-sm">尚無資產資料</div>
                )}
            </div>
         </div>
      </div>
  );
};

// 還款進度百分比（0~100，處理負債反而變大的邊界情況）
const debtPaidPercent = (asset: Asset) => {
  const paid = asset.originalAmount! - asset.amount;
  const percent = paid >= 0 ? (paid / asset.originalAmount!) * 100 : 0;
  return Math.min(100, Math.max(0, percent));
};

// 進度條 + 百分比，放在名稱下方次要說明行
const DebtProgressBar: React.FC<{ asset: Asset; className?: string }> = ({ asset, className = '' }) => {
  const percent = debtPaidPercent(asset);
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className="w-11 bg-[#F3ECDF] rounded-full h-1.5 overflow-hidden shrink-0">
        <div className="bg-[#B45B45] h-1.5 rounded-full" style={{ width: `${percent}%` }}></div>
      </div>
      <span className="text-[11px] text-[#A69B87] font-medium whitespace-nowrap">已還 {percent.toFixed(1)}%</span>
    </div>
  );
};

// 金額欄：固定字級（不分裝置），一般資產用主文字色，負債用負債分類色；
// 持有投資顯示未實現損益 badge（紅賺綠賠），另起一行避免跟金額擠在一起。
const AssetAmountCell: React.FC<{ asset: Asset }> = ({ asset }) => {
  const amountColor = asset.type === AssetType.DEBT ? 'text-[#B45B45]' : 'text-[#3D3428]';

  const investBadge = (asset.type === AssetType.STOCK || asset.type === AssetType.FUND) && asset.avgCost && asset.shares
    ? (() => {
        const totalCost = asset.avgCost! * asset.shares!;
        const unrealized = asset.amount - totalCost;
        const roi = totalCost > 0 ? (unrealized / totalCost) * 100 : 0;
        const isProfit = unrealized >= 0;
        return (
          <span className={`text-[10px] px-1.5 py-0.5 rounded tabular-nums font-bold ${isProfit ? 'bg-[#FBEAEA] text-[#C4523A]' : 'bg-[#EAF1EC] text-[#6B9080]'}`}>
            {isProfit ? '+$' : '-$'}{Math.abs(unrealized).toLocaleString(undefined, { maximumFractionDigits: 0 })} ({isProfit ? '+' : ''}{roi.toFixed(1)}%)
          </span>
        );
      })()
    : null;

  return (
    <div>
      <span className={`tabular-nums font-bold leading-none text-sm whitespace-nowrap ${amountColor}`}>
        {asset.type === AssetType.DEBT ? '-' : ''}${asset.amount.toLocaleString()}
      </span>
      {investBadge && <div className="mt-1 flex justify-end">{investBadge}</div>}
    </div>
  );
};

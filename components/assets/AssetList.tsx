
import React from 'react';
import { Asset, AssetType, Currency } from '../../types';
import { ASSET_TYPE_WARM_COLORS, ASSET_TYPE_LABELS } from '../../constants';
import { Edit2, Trash2, AlertCircle } from 'lucide-react';
import { formatMoney } from '../../services/format';

interface AssetListProps {
  filteredAssets: Asset[];
  filterType: string;
  setFilterType: (type: any) => void;
  onEdit: (asset: Asset) => void;
  onDelete: (id: string) => void;
  calculateDaysSinceUpdate: (timestamp: number) => number;
}

export const AssetList: React.FC<AssetListProps> = ({ 
  filteredAssets, filterType, setFilterType, onEdit, onDelete, calculateDaysSinceUpdate 
}) => {
  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return '-';
    try {
        return new Date(timestamp).toLocaleDateString('sv-SE'); // YYYY-MM-DD
    } catch {
        return '-';
    }
  };

  const subtotalAssets = filteredAssets.filter(a => a.type !== AssetType.DEBT).reduce((sum, a) => sum + a.amount, 0);
  const subtotalDebt = filteredAssets.filter(a => a.type === AssetType.DEBT).reduce((sum, a) => sum + a.amount, 0);
  const subtotalNet = subtotalAssets - subtotalDebt;

  return (
    <div className="bg-white border border-[#EDE4D6] rounded-2xl overflow-hidden max-h-[600px] flex flex-col">
         <div className="flex items-center gap-5 px-4 border-b border-[#EDE4D6] overflow-x-auto no-scrollbar shrink-0">
             {[
                 { id: 'ALL', label: '全部' },
                 { id: 'INVEST', label: '股票/基金' },
                 { id: 'CASH', label: '現金/存款' },
                 { id: 'DEBT', label: '負債/貸款' },
             ].map(tab => (
                 <button
                    key={tab.id}
                    onClick={() => setFilterType(tab.id)}
                    className={`py-3 text-sm whitespace-nowrap border-b-2 transition-all ${
                        filterType === tab.id
                        ? 'text-[#C4523A] border-[#C4523A] font-bold'
                        : 'text-[#A69B87] border-transparent hover:text-[#3D3428] font-medium'
                    }`}
                 >
                    {tab.label}
                 </button>
             ))}
         </div>

         {filteredAssets.length > 0 && (
             <div className="flex items-center gap-x-6 gap-y-1 px-4 py-2.5 border-b border-[#EDE4D6] bg-[#FBF7F0] text-xs flex-wrap shrink-0">
                 {subtotalAssets > 0 && (
                     <div className="flex items-center gap-1.5">
                         <span className="text-[#A69B87]">資產小計</span>
                         <span className="tabular-nums font-bold text-[#3D3428]">{formatMoney(subtotalAssets)}</span>
                     </div>
                 )}
                 {subtotalDebt > 0 && (
                     <div className="flex items-center gap-1.5">
                         <span className="text-[#A69B87]">負債小計</span>
                         <span className="tabular-nums font-bold text-[#B45B45]">{formatMoney(-subtotalDebt)}</span>
                     </div>
                 )}
                 {filterType === 'ALL' && subtotalDebt > 0 && subtotalAssets > 0 && (
                     <div className="flex items-center gap-1.5">
                         <span className="text-[#A69B87]">淨值小計</span>
                         <span className={`tabular-nums font-bold ${subtotalNet < 0 ? 'text-[#B45B45]' : 'text-[#3D3428]'}`}>
                             {formatMoney(subtotalNet)}
                         </span>
                     </div>
                 )}
             </div>
         )}

         <div className="overflow-y-auto flex-1">
            {/* 桌面版：表格 */}
            <table className="w-full text-left border-collapse hidden md:table">
                <thead className="sticky top-0 z-10">
                    <tr className="bg-[#FBF7F0] border-b border-[#EDE4D6] text-[#8A7A63] text-xs uppercase tracking-wider">
                        <th className="p-3 font-medium">資產名稱</th>
                        <th className="p-3 font-medium">類別</th>
                        <th className="p-3 font-medium text-right">金額 (TWD)</th>
                        <th className="p-3 font-medium text-right">最後更新</th>
                        <th className="p-3 font-medium text-center">操作</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#F3ECDF] text-sm">
                    {filteredAssets.map(asset => {
                        const daysOld = calculateDaysSinceUpdate(asset.lastUpdated);
                        const isStale = daysOld > 14;
                        const warmColor = ASSET_TYPE_WARM_COLORS[asset.type] || ASSET_TYPE_WARM_COLORS.OTHER;
                        return (
                            <tr key={asset.id} className="hover:bg-[#FBF7F0] transition-colors group">
                                <td className="p-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1 h-8 rounded-full" style={{ backgroundColor: warmColor.bar }}></div>
                                        <div>
                                            <div className="font-bold text-[#3D3428] text-sm flex items-center gap-2">
                                                {asset.name}
                                                {isStale && asset.type !== AssetType.DEBT && <span title="資料已超過14天未更新"><AlertCircle size={14} className="text-amber-500" /></span>}
                                            </div>
                                            {asset.currency !== Currency.TWD && (
                                                <span className="text-[10px] text-[#A69B87] tabular-nums">
                                                    {asset.currency} {asset.originalAmount?.toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-3">
                                    <span className="inline-block px-2 py-1 rounded-full text-[10px] font-medium whitespace-nowrap" style={{ backgroundColor: warmColor.bg, color: warmColor.text }}>
                                        {ASSET_TYPE_LABELS[asset.type]}
                                    </span>
                                </td>
                                <td className="p-3 text-right">
                                    <AssetAmountCell asset={asset} />
                                </td>
                                <td className="p-3 text-right">
                                    <div className="text-xs tabular-nums text-[#A69B87]">{formatDate(asset.lastUpdated)}</div>
                                </td>
                                <td className="p-3 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button onClick={() => onEdit(asset)} className="p-2 rounded-lg text-[#A69B87] hover:bg-[#F6E4DE] hover:text-[#C4523A] transition-all" title="編輯">
                                            <Edit2 size={16}/>
                                        </button>
                                        <button onClick={() => onDelete(asset.id)} className="p-2 rounded-lg text-[#A69B87] hover:bg-[#F6E4DE] hover:text-[#B45B45] transition-all" title="刪除">
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                    {filteredAssets.length === 0 && (
                        <tr><td colSpan={5} className="text-center py-10 text-[#A69B87] text-sm">尚無資產資料</td></tr>
                    )}
                </tbody>
            </table>

            {/* 手機版：緊湊單行列表 */}
            <div className="md:hidden divide-y divide-[#F3ECDF]">
                {filteredAssets.map(asset => {
                    const daysOld = calculateDaysSinceUpdate(asset.lastUpdated);
                    const isStale = daysOld > 14;
                    const warmColor = ASSET_TYPE_WARM_COLORS[asset.type] || ASSET_TYPE_WARM_COLORS.OTHER;
                    const hasProgress = asset.type === AssetType.DEBT && !!asset.originalAmount && asset.originalAmount > 0;
                    return (
                        <div key={asset.id} className="flex items-center gap-2 py-[6px] px-3 min-h-[32px]">
                            <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: warmColor.bar }}></div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1 leading-[14px]">
                                    <span className="text-[11.5px] font-bold text-[#3D3428] truncate">{asset.name}</span>
                                    {isStale && asset.type !== AssetType.DEBT && <AlertCircle size={10} className="text-amber-500 shrink-0" />}
                                </div>
                                <span className="text-[9px] leading-[11px] block" style={{ color: warmColor.text }}>{ASSET_TYPE_LABELS[asset.type]}</span>
                                {hasProgress && <DebtProgressBar asset={asset} className="mt-0.5" />}
                            </div>
                            <div className="text-right shrink-0">
                                <AssetAmountCell asset={asset} compact />
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                                <button onClick={() => onEdit(asset)} className="p-1.5 rounded-lg text-[#A69B87] active:bg-[#F6E4DE] active:text-[#C4523A]" title="編輯" aria-label={`編輯 ${asset.name}`}>
                                    <Edit2 size={14}/>
                                </button>
                                <button onClick={() => onDelete(asset.id)} className="p-1.5 rounded-lg text-[#A69B87] active:bg-[#F6E4DE] active:text-[#B45B45]" title="刪除" aria-label={`刪除 ${asset.name}`}>
                                    <Trash2 size={14}/>
                                </button>
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

// 44px 進度條 + 百分比，用於手機版名稱下方一小行
const DebtProgressBar: React.FC<{ asset: Asset; className?: string }> = ({ asset, className = '' }) => {
  const percent = debtPaidPercent(asset);
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className="w-11 bg-[#F3ECDF] rounded-full h-1.5 overflow-hidden shrink-0">
        <div className="bg-[#B45B45] h-1.5 rounded-full" style={{ width: `${percent}%` }}></div>
      </div>
      <span className="text-[9px] text-[#A69B87] font-medium whitespace-nowrap">已還 {percent.toFixed(1)}%</span>
    </div>
  );
};

// 金額欄：一般資產用主文字色，負債用負債分類色；持有投資顯示未實現損益 badge（紅賺綠賠）；
// 桌面版貸款金額、44px進度條、百分比同一行水平排列；手機版進度條改由外層渲染在名稱下方，
// 此處 compact 模式僅顯示金額本身，避免同一行擁擠。
const AssetAmountCell: React.FC<{ asset: Asset; compact?: boolean }> = ({ asset, compact = false }) => {
  const amountSize = compact ? 'text-[13px]' : 'text-[15px]';
  const amountColor = asset.type === AssetType.DEBT ? 'text-[#B45B45]' : 'text-[#3D3428]';
  const hasProgress = asset.type === AssetType.DEBT && !!asset.originalAmount && asset.originalAmount > 0;

  const amountEl = (
    <span className={`tabular-nums font-bold leading-none ${amountSize} ${amountColor}`}>
      {asset.type === AssetType.DEBT ? '-' : ''}${asset.amount.toLocaleString()}
    </span>
  );

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

  // 桌面版：金額＋進度條＋百分比同一行
  if (hasProgress && !compact) {
    return (
      <div className="flex items-center justify-end gap-1.5">
        {amountEl}
        <DebtProgressBar asset={asset} />
      </div>
    );
  }

  return (
    <div>
      {amountEl}
      {investBadge && <div className="mt-1 flex justify-end">{investBadge}</div>}
    </div>
  );
};

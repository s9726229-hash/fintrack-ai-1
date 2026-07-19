
import React from 'react';
import { Modal, Input, Select, Button } from '../ui';
import { Asset, AssetType, Currency } from '../../types';
import { calculateLoanBalance } from '../../services/finance';
import { Wallet, TrendingUp, Landmark, Bitcoin, Home, CreditCard, Coins, Calendar, Calculator } from 'lucide-react';

interface AssetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: Partial<Asset>;
  setFormData: (data: Partial<Asset>) => void;
  editingId: string | null;
  onSubmit: () => void;
  /** 現金/存款帳戶清單，供負債選擇每月扣款帳戶 */
  cashAccounts?: { id: string; name: string }[];
}

const TYPE_CONFIG: Record<AssetType, { icon: any, label: string, colorClass: string }> = {
  [AssetType.CASH]: { icon: Wallet, label: '現金/存款', colorClass: 'text-[#6B9080]' },
  [AssetType.STOCK]: { icon: TrendingUp, label: '股票投資', colorClass: 'text-[#C86B6B]' },
  [AssetType.FUND]: { icon: Landmark, label: '共同基金', colorClass: 'text-[#C86B6B]' },
  [AssetType.CRYPTO]: { icon: Bitcoin, label: '加密貨幣', colorClass: 'text-[#C08A3E]' },
  [AssetType.REAL_ESTATE]: { icon: Home, label: '房地產', colorClass: 'text-[#B08968]' },
  [AssetType.DEBT]: { icon: CreditCard, label: '負債/貸款', colorClass: 'text-[#B45B45]' },
  [AssetType.OTHER]: { icon: Coins, label: '其他資產', colorClass: 'text-[#A69B87]' },
};

export const AssetFormModal: React.FC<AssetFormModalProps> = ({
  isOpen, onClose, formData, setFormData, editingId, onSubmit, cashAccounts = []
}) => {
    
  const handleAmountChange = (key: 'originalAmount' | 'exchangeRate', value: number) => {
      const newData = { ...formData, [key]: value };
      const safeVal = isNaN(value) ? 0 : value;
      newData[key] = safeVal;

      if (newData.currency !== Currency.TWD) {
          const org = newData.originalAmount || 0;
          const rate = newData.exchangeRate || 1;
          newData.amount = Math.round(org * rate);
      } else if (key === 'originalAmount') {
          if (formData.type !== AssetType.DEBT) {
              newData.amount = safeVal;
          }
      }
      setFormData(newData);
  };

  const calculatedPreview = formData.type === AssetType.DEBT && formData.startDate && formData.originalAmount 
    ? calculateLoanBalance(formData as Asset) 
    : null;

  return (
    <Modal theme="warm" isOpen={isOpen} onClose={onClose} title={editingId ? "編輯資產" : "新增資產"}>
        <div className="space-y-6">
          <div>
            <label className="block text-sm text-[#A69B87] mb-2 font-medium">資產名稱 (Name)</label>
            <Input
                theme="warm"
                value={formData.name || ''}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="例如：薪轉戶、台積電 (2330)、富邦房貸..."
                className="text-lg"
            />
          </div>

          <div>
             <label className="block text-sm text-[#A69B87] mb-2 font-medium">資產類別 (Type)</label>
             <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                    AssetType.CASH, AssetType.STOCK, AssetType.FUND,
                    AssetType.CRYPTO, AssetType.REAL_ESTATE, AssetType.DEBT
                ].map((type) => {
                    const config = TYPE_CONFIG[type];
                    const isSelected = formData.type === type;
                    const isDebt = type === AssetType.DEBT;
                    let bgClass = "bg-[#FBF7F0] border-[#EDE4D6] text-[#A69B87] hover:bg-white hover:border-[#C4A98A]";
                    if (isSelected) {
                        if (isDebt) bgClass = "bg-[#F6E4DE] border-[#B45B45] text-[#3D3428]";
                        else bgClass = "bg-[#FBEAEA] border-[#C4523A] text-[#3D3428]";
                    }

                    return (
                        <button
                            key={type}
                            onClick={() => setFormData({...formData, type: type})}
                            className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 group ${bgClass}`}
                        >
                            <config.icon size={24} className={`mb-2 ${isSelected ? (isDebt ? 'text-[#B45B45]' : 'text-[#C4523A]') : config.colorClass} group-hover:scale-110 transition-transform`} />
                            <span className="text-xs font-bold">{config.label}</span>
                        </button>
                    )
                })}
             </div>
          </div>

          <div className="relative border border-[#EDE4D6] rounded-xl p-4 bg-[#FBF7F0]">
             <div className="absolute -top-3 left-3 bg-white px-2 text-xs font-bold text-amber-600 flex items-center gap-1">
                <Coins size={12}/> {formData.type === AssetType.DEBT ? '貸款原始金額' : '金額與幣別'}
             </div>
             <div className="flex gap-4">
                 <div className="w-1/3">
                    <label className="block text-[10px] text-[#A69B87] mb-1 uppercase">幣別</label>
                    <Select theme="warm" value={formData.currency} onChange={e => {
                        setFormData({...formData, currency: e.target.value as Currency});
                        if(e.target.value === Currency.TWD) handleAmountChange('exchangeRate', 1);
                    }} className="h-12">
                        {Object.values(Currency).map(c => <option key={c} value={c}>{c}</option>)}
                    </Select>
                 </div>
                 <div className="flex-1">
                    <label className="block text-[10px] text-[#A69B87] mb-1 uppercase">
                        {formData.type === AssetType.DEBT ? '原始貸款總額 (Original)' : `金額 (${formData.currency})`}
                    </label>
                    <Input
                        theme="warm"
                        type="number"
                        value={formData.originalAmount || ''}
                        onChange={e => handleAmountChange('originalAmount', parseFloat(e.target.value))}
                        className="text-xl h-12"
                        placeholder="0.00"
                    />
                 </div>
             </div>
             {formData.currency !== Currency.TWD && (
                 <div className="mt-3 pt-3 border-t border-[#EDE4D6] flex items-center justify-between animate-fade-in">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-[#A69B87]">匯率</span>
                        <Input
                            theme="warm"
                            type="number"
                            value={formData.exchangeRate || ''}
                            onChange={e => handleAmountChange('exchangeRate', parseFloat(e.target.value))}
                            className="text-sm w-20 py-1 px-2 h-auto"
                        />
                    </div>
                    <div className="text-right">
                        <span className="text-xs text-[#A69B87] mr-2">折合台幣</span>
                        <span className="text-base font-bold text-[#3D3428] tabular-nums">NT$ {formData.amount?.toLocaleString()}</span>
                    </div>
                 </div>
             )}

             {formData.type === AssetType.DEBT && formData.startDate && (
                 <div className="mt-3 pt-3 border-t border-[#EDE4D6] flex items-center justify-between animate-fade-in">
                    <div className="text-xs text-[#A69B87] flex items-center gap-1">
                        <Calculator size={12}/> 系統試算當前剩餘本金
                    </div>
                    <div className="text-right">
                        <span className="text-base font-bold text-[#B45B45] tabular-nums">
                            ${calculatedPreview !== null ? calculatedPreview.toLocaleString() : '-'}
                        </span>
                    </div>
                 </div>
             )}
          </div>

          {formData.type === AssetType.DEBT && (
             <div className="bg-[#F6E4DE]/40 p-4 rounded-xl border border-[#B45B45]/20 space-y-4 animate-fade-in">
                <h4 className="text-sm font-bold text-[#B45B45] flex items-center gap-2">
                    <CreditCard size={16}/> 貸款詳細資訊
                </h4>
                <div>
                     <label className="block text-xs text-[#B45B45]/80 mb-1 flex items-center gap-1">
                         <Calendar size={12}/> 貸款起始日 (Start Date)
                     </label>
                     <Input
                        theme="warm"
                        type="date"
                        className="border-[#B45B45]/30 focus:border-[#B45B45]"
                        value={formData.startDate || ''}
                        onChange={e => setFormData({...formData, startDate: e.target.value})}
                     />
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-[#B45B45]/80 mb-1">年利率 (%)</label>
                      <Input
                        theme="warm"
                        className="border-[#B45B45]/30 focus:border-[#B45B45]"
                        type="number"
                        value={formData.interestRate || ''}
                        onChange={e => setFormData({...formData, interestRate: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#B45B45]/80 mb-1">總年期 (年)</label>
                      <Input
                        theme="warm"
                        className="border-[#B45B45]/30 focus:border-[#B45B45]"
                        type="number"
                        value={formData.termYears || ''}
                        onChange={e => setFormData({...formData, termYears: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#B45B45]/80 mb-1">寬限期 (年)</label>
                      <Input
                        theme="warm"
                        className="border-[#B45B45]/30 focus:border-[#B45B45]"
                        type="number"
                        placeholder="0"
                        value={formData.interestOnlyPeriod || ''}
                        onChange={e => setFormData({...formData, interestOnlyPeriod: parseFloat(e.target.value)})}
                      />
                    </div>
                </div>
                {cashAccounts.length > 0 && (
                    <div>
                        <label className="block text-[10px] text-[#B45B45]/80 mb-1 flex items-center gap-1">
                            <Wallet size={12}/> 每月扣款帳戶（用於扣款帳戶餘額監控）
                        </label>
                        <Select
                            theme="warm"
                            className="border-[#B45B45]/30 focus:border-[#B45B45]"
                            value={formData.paymentAccountId || ''}
                            onChange={e => setFormData({ ...formData, paymentAccountId: e.target.value || undefined })}
                        >
                            <option value="">未設定</option>
                            {cashAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </Select>
                    </div>
                )}
                <p className="text-[10px] text-[#B45B45]/70">
                    * 系統將依據起始日自動攤提本金，您無需手動更新餘額。
                </p>
             </div>
          )}

          <div className="pt-2">
            <Button theme="warm" className="w-full py-3.5 text-lg font-bold" onClick={onSubmit}>
                {editingId ? '儲存變更' : '確認新增資產'}
            </Button>
          </div>
        </div>
    </Modal>
  );
};

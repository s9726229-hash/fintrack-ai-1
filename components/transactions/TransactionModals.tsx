
import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, Select } from '../ui';
import { Transaction } from '../../types';
import { Pencil, Info } from 'lucide-react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../constants';

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (t: Transaction) => void;
  editingData?: Transaction | null;
}

export const AddTransactionModal: React.FC<TransactionFormModalProps> = ({ isOpen, onClose, onSubmit, editingData }) => {
  const [formData, setFormData] = useState<Partial<Transaction>>({});

  const isEditing = !!editingData;

  useEffect(() => {
    if (isOpen) {
        if (isEditing) {
            setFormData(editingData);
        } else {
            // Reset for a new entry
            setFormData({
                type: 'EXPENSE',
                date: new Date().toISOString().split('T')[0],
                category: '餐飲',
                item: '',
                amount: undefined
            });
        }
    }
  }, [isOpen, editingData]);

  const handleSubmit = () => {
    if (!formData.amount || !formData.item) return;
    const transactionData = {
        id: isEditing ? editingData.id : crypto.randomUUID(),
        date: formData.date || new Date().toISOString().split('T')[0],
        amount: Number(formData.amount),
        category: formData.category || '其他',
        item: formData.item,
        type: formData.type as 'EXPENSE' | 'INCOME',
        source: isEditing ? editingData.source : 'MANUAL',
        note: formData.note,
        invoiceId: formData.invoiceId,
    };
    onSubmit(transactionData as Transaction);
    onClose();
  };

  return (
    <Modal theme="warm" isOpen={isOpen} onClose={onClose} title={isEditing ? "編輯紀錄" : "新增收支"}>
      <div className="space-y-6">
             <div className="space-y-4 animate-fade-in">
                 <div className="grid grid-cols-2 gap-4">
                     <div className="flex bg-[#FBF7F0] rounded-lg p-1 border border-[#EDE4D6]">
                        <button
                            onClick={() => setFormData({...formData, type: 'EXPENSE', category: '餐飲'})}
                            className={`flex-1 py-1.5 text-sm rounded font-medium transition-all ${formData.type === 'EXPENSE' ? 'bg-[#EAF1EC] text-[#6B9080] shadow-sm' : 'text-[#A69B87] hover:text-[#3D3428]'}`}
                        >
                            支出
                        </button>
                        <button
                            onClick={() => setFormData({...formData, type: 'INCOME', category: '薪資'})}
                            className={`flex-1 py-1.5 text-sm rounded font-medium transition-all ${formData.type === 'INCOME' ? 'bg-[#FBEAEA] text-[#C4523A] shadow-sm' : 'text-[#A69B87] hover:text-[#3D3428]'}`}
                        >
                            收入
                        </button>
                     </div>
                     <Input
                        theme="warm"
                        type="date"
                        value={formData.date}
                        onChange={e => setFormData({...formData, date: e.target.value})}
                        className="text-center"
                     />
                 </div>

                 <div>
                    <label className="block text-xs text-[#A69B87] mb-1">項目名稱</label>
                    <Input
                        theme="warm"
                        placeholder="例如：午餐、薪水"
                        value={formData.item || ''}
                        onChange={e => setFormData({...formData, item: e.target.value})}
                        className="h-11"
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs text-[#A69B87] mb-1">分類</label>
                       <Select
                          theme="warm"
                          value={formData.category}
                          onChange={e => setFormData({...formData, category: e.target.value})}
                          className="h-11"
                       >
                          {(formData.type === 'EXPENSE' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(c => (
                              <option key={c} value={c}>{c}</option>
                          ))}
                       </Select>
                    </div>
                    <div>
                       <label className="block text-xs text-[#A69B87] mb-1">金額</label>
                       <Input
                            theme="warm"
                            type="number"
                            placeholder="0"
                            className="text-lg h-11"
                            value={formData.amount || ''}
                            onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})}
                       />
                    </div>
                 </div>

                 <div className="pt-2">
                    <Button theme="warm" className="w-full py-3" onClick={handleSubmit}>{isEditing ? '儲存變更' : '確認新增'}</Button>
                 </div>
             </div>
      </div>
    </Modal>
  );
};

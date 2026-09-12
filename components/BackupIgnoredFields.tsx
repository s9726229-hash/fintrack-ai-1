import React from 'react';
import { groupIgnoredFields } from '../services/backup/status';

export function BackupIgnoredFields({ secrets, unknown }: { secrets: string[]; unknown: string[] }) {
  const groups = groupIgnoredFields(unknown);
  const sections = [
    { title: '已忽略舊版憑證欄位', detail: 'API 金鑰與 Token 不匯入，請在本裝置重新設定。', keys: secrets },
    { title: '已略過本機設定', detail: '例如 Google Client ID、外觀與備份操作紀錄，保留本裝置原有設定，不影響帳目。', keys: groups.device },
    { title: '已略過停用的技術分析參數', detail: '這些是舊版股票分析門檻，不是資產、交易或股息資料。', keys: groups.retired },
    { title: '已忽略未知欄位', detail: '目前版本不認得這些欄位，請保留原始備份供日後檢查。', keys: groups.unknown },
  ];
  return <>{sections.filter(section => section.keys.length).map(section => <div key={section.title} className="text-xs text-[#8A7A63]">
    <p className="font-bold">{section.title}</p><p>{section.detail}</p>
    <details><summary className="cursor-pointer">查看欄位名稱（{section.keys.length}）</summary><p className="break-all">{section.keys.join('、')}</p></details>
  </div>)}</>;
}

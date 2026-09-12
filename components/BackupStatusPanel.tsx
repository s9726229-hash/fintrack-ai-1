import React from 'react';
import { needsBackupReminder, readBackupStatus } from '../services/backup/status';

export function BackupStatusPanel({ compact = false, onOpenSettings }: { compact?: boolean; onOpenSettings?: () => void }) {
  const status = readBackupStatus(localStorage);
  const reminder = needsBackupReminder(status);
  if (compact && !reminder) return null;
  return <div className="rounded-xl border border-[#EDE4D6] bg-[#FBF7F0] p-3 text-sm text-[#8A7A63]" aria-label="備份狀態">
    {reminder && <p className="font-medium text-amber-800">備份提醒：本機尚無紀錄，或距離上次匯出／雲端備份已滿 7 天。整理完本週帳目後，記得備份。</p>}
    {!compact && <>
      <p>最近手動匯出：{status.exportedAt ? new Date(status.exportedAt).toLocaleString('zh-TW') : '尚無紀錄'}</p>
      <p>最近雲端備份成功：{status.cloudAt ? new Date(status.cloudAt).toLocaleString('zh-TW') : '尚無紀錄'}</p>
      <p className="text-xs mt-1">時間僅代表本裝置的操作紀錄，不代表目前資料已完整備份。匯出後請確認檔案確實保存在下載資料夾；不會自動上傳。</p>
    </>}
    {onOpenSettings && <button className="underline mt-2" onClick={onOpenSettings}>前往設定備份</button>}
  </div>;
}

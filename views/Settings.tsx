
import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Modal } from '../components/ui';
import { clearAllData, downloadBackupFile, getGoogleClientId, saveGoogleClientId, getFeeDiscount, saveFeeDiscount } from '../services/storage';
import { initGapi, initGis, handleAuthClick, uploadToDrive, downloadFromDrive, getBackupMetadata, checkConnection } from '../services/googleDrive';
import { Download, Upload, CheckCircle2, AlertCircle, X, Cloud, RefreshCw, LogIn, History, Trash2, Key, Sparkles, Percent } from 'lucide-react';
import { fetchFinMindUsage } from '../services/stock';
import { createBackupEnvelope, serializeBackup } from '../services/backup/export';
import type { BackupPreview, ParsedBackup } from '../services/backup/model';
import { parseBackupJson } from '../services/backup/parse';
import { buildBackupPreview } from '../services/backup/preview';
import { replacePortableData } from '../services/backup/replace';
import { APP_VERSION } from '../services/appVersion';
import { readPortableSnapshot } from '../services/backup/snapshot';

interface SettingsProps {
  onDataChange: () => void;
  reloadPage?: () => void;
  onImportStart?: () => Promise<void>;
  onImportFinish?: () => void;
}




export const Settings: React.FC<SettingsProps> = ({
  onDataChange,
  reloadPage = () => window.location.reload(),
  onImportStart = () => Promise.resolve(),
  onImportFinish = () => undefined,
}) => {
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [feeDiscount, setFeeDiscount] = useState(0.28);

  const [finmindToken, setFinmindToken] = useState('');
  const [apiUsage, setApiUsage] = useState<{ user_count: number, api_request_limit: number } | null>(null);
  const [googleClientId, setGoogleClientId] = useState('');
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [isDriveLoading, setIsDriveLoading] = useState(false);

  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [previewContent, setPreviewContent] = useState<{ parsed: ParsedBackup; preview: BackupPreview } | null>(null);

  useEffect(() => {
    setFeeDiscount(getFeeDiscount());
    setFinmindToken(localStorage.getItem('ft_finmind_token') || '');
    fetchFinMindUsage().then(setApiUsage);
    const storedClientId = getGoogleClientId();
    if (storedClientId) {
        setGoogleClientId(storedClientId);
        autoInitDrive(storedClientId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const autoInitDrive = async (clientId: string) => {
      try {
          await initGapi();
          await initGis(clientId);
          if (checkConnection()) setIsDriveConnected(true);
      } catch (e) {
          console.debug("Drive auto-init skipped", e);
      }
  };

  const showNotify = (type: 'success' | 'error', message: string) => {
      setNotification({ type, message });
      setTimeout(() => setNotification(null), 5000);
  };

  const serializeCurrentBackup = () => serializeBackup(
      createBackupEnvelope(readPortableSnapshot(localStorage), new Date().toISOString()),
  );

  const prepareImport = (raw: string) => {
      const result = parseBackupJson(raw);
      if (!result.ok) {
          setPreviewContent(null);
          setIsPreviewModalOpen(false);
          showNotify('error', `備份無法匯入：${result.errors.map((error) => `${error.path} — ${error.message}`).join('；')}`);
          return;
      }

      setPreviewContent({
          parsed: result.parsed,
          preview: buildBackupPreview(readPortableSnapshot(localStorage), result.parsed),
      });
      setIsPreviewModalOpen(true);
  };

  const closePreview = () => {
      if (isImporting) return;
      setIsPreviewModalOpen(false);
      setPreviewContent(null);
  };


  
  const handleSaveFeeDiscount = () => {
      saveFeeDiscount(feeDiscount);
      showNotify('success', '手續費折扣已儲存！');
  };

  const handleSaveFinMindToken = () => {
      localStorage.setItem('ft_finmind_token', finmindToken.trim());
      showNotify('success', 'FinMind API Token Saved!');
        fetchFinMindUsage().then(setApiUsage);
  };

  const handleSaveClientId = () => {
      saveGoogleClientId(googleClientId.trim());
      showNotify('success', 'Google Client ID 已儲存。請嘗試點擊連接。');
      autoInitDrive(googleClientId.trim());
  };

  const handleConnectDrive = async () => {
      if (!googleClientId) {
          showNotify('error', '請先輸入 Google Client ID');
          return;
      }
      setIsDriveLoading(true);
      try {
          await initGapi();
          await initGis(googleClientId);
          await handleAuthClick();
          setIsDriveConnected(true);
          showNotify('success', 'Google Drive 連接成功！');
          const backup = await getBackupMetadata();
          if (backup) {
              const date = new Date(backup.modifiedTime).toLocaleString();
              if (confirm(`🔍 偵測到雲端備份檔\n\n備份時間：${date}\n\n是否立即下載並還原至此裝置？`)) {
                  await performRestore();
              }
          }
      } catch (e: any) {
          showNotify('error', `連接失敗: ${e.message || '授權錯誤，請檢查來源網址設定'}`);
      } finally {
          setIsDriveLoading(false);
      }
  };

  const handleBackupToDrive = async () => {
      if(!isDriveConnected) return;
      setIsDriveLoading(true);
      try {
          await uploadToDrive(serializeCurrentBackup());
          showNotify('success', '備份成功！安全備份已儲存至您的 Google Drive。');
      } catch (e) {
          showNotify('error', '上傳失敗，請檢查網路或授權。');
      } finally {
          setIsDriveLoading(false);
      }
  };

  const performRestore = async () => {
      try {
          const raw = await downloadFromDrive();
          prepareImport(raw);
      } catch (e: any) {
           showNotify('error', `下載失敗: ${e.message || '找不到備份檔'}`);
      }
  };

  const handleRestoreFromDrive = async () => {
      if(!isDriveConnected) return;
      setIsDriveLoading(true);
      try {
          await performRestore();
      } finally {
          setIsDriveLoading(false);
      }
  };

  const handleExportBackup = () => {
      downloadBackupFile(
          serializeCurrentBackup(),
          `fintrack_ai_backup_${new Date().toISOString().split('T')[0]}.json`,
      );
  };

  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result;
        if (typeof result === 'string') prepareImport(result);
        else showNotify('error', '無法讀取備份檔案。');
      };
      reader.onerror = () => showNotify('error', '無法讀取備份檔案。');
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (!previewContent) return;
    setIsImporting(true);
    let importLockRequested = false;
    let keepImportLocked = false;
    let replacementStarted = false;
    try {
      importLockRequested = true;
      await onImportStart();
      const date = new Date().toISOString().split('T')[0];
      downloadBackupFile(serializeCurrentBackup(), `fintrack_ai_pre_import_${date}.json`);
      replacementStarted = true;
      const result = await replacePortableData(previewContent.parsed.snapshot);

      if (!result.ok) {
        if (result.code === 'rollback_failed') {
          keepImportLocked = true;
          reloadPage();
          return;
        }
        const message = result.code === 'recovery_unavailable'
          ? '無法建立復原紀錄，目前資料尚未變更。'
          : '匯入失敗，已還原原有資料。預覽仍保留，請取消或重新嘗試。';
        showNotify('error', message);
        return;
      }

      setIsPreviewModalOpen(false);
      setPreviewContent(null);
      keepImportLocked = true;
      onDataChange();
      showNotify('success', '匯入成功！即將重新整理頁面...');
      setTimeout(reloadPage, 1000);
    } catch (error: any) {
      if (replacementStarted) {
        keepImportLocked = true;
        reloadPage();
      } else {
        showNotify('error', `匯入失敗：${error?.message || '無法建立匯入前備份。'}`);
      }
    } finally {
      if (importLockRequested && !keepImportLocked) onImportFinish();
      if (!keepImportLocked) setIsImporting(false);
    }
  };

  const handleReset = () => {
    if (confirm("確定要重置系統嗎？所有資料都會被刪除。")) {
        clearAllData();
        setGoogleClientId('');
        setIsDriveConnected(false);
        onDataChange();
        showNotify('success', '系統已重置。');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in relative pb-20">
      <div>
         <h2 className="text-[19px] font-semibold mb-2 text-[#3D3428]">系統設定</h2>
         <p className="text-[#A69B87]">管理 API 金鑰、雲端同步與資料安全性。</p>
      </div>

      {notification && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 animate-fade-in sticky top-4 z-50 ${notification.type === 'success' ? 'bg-[#EAF1EC] border-[#6B9080]/50 text-[#6B9080]' : 'bg-[#FBEAEA] border-[#C4523A]/50 text-[#C4523A]'}`}>
            {notification.type === 'success' ? <CheckCircle2 size={24}/> : <AlertCircle size={24}/>}
            <div className="flex-1 pt-0.5">
                <p className="text-sm font-bold">{notification.message}</p>
            </div>
            <button onClick={() => setNotification(null)}><X size={16}/></button>
        </div>
      )}

      {/* API Settings */}
      <Card theme="warm" className="border-amber-500/30">
          <h3 className="text-lg font-bold flex items-center gap-2 text-[#3D3428] mb-4">
            <Key className="text-amber-600"/> API 金鑰設定
          </h3>
          <div className="bg-[#FBF7F0] p-4 rounded-xl border border-[#EDE4D6] space-y-4">
              <div>
                  <label className="text-sm text-[#3D3428] mb-2 block">FinMind API Token</label>
                  <div className="flex gap-2">
                      <Input theme="warm" type="password" value={finmindToken} onChange={(e) => setFinmindToken(e.target.value)} placeholder="輸入 FinMind Token" className="text-sm" />
                      <Button theme="warm" onClick={handleSaveFinMindToken} variant="secondary" className="shrink-0">儲存</Button>
                  </div>
                                      <p className="text-xs text-[#A69B87] mt-2">用於取得外資、投信等籌碼資料。若不輸入預設使用免費 Token 額度 (每小時 300 次)</p>
                    {apiUsage && (
                        <div className="mt-4 p-3 bg-white rounded-lg border border-[#EDE4D6]">
                            <h4 className="text-sm font-bold text-[#3D3428] mb-2">API 使用量 (每小時重置)</h4>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-[#A69B87]">目前用量</span>
                                <span className={apiUsage.user_count >= apiUsage.api_request_limit * 0.8 ? "text-red-600" : "text-[#6B9080]"}>
                                    {apiUsage.user_count} / {apiUsage.api_request_limit}
                                </span>
                            </div>
                        </div>
                    )}
              </div>
          </div>
      </Card>

      <Card theme="warm">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-[#3D3428]"><History className="text-amber-600"/> 本地資料管理</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button theme="warm" onClick={handleExportBackup} variant="secondary" className="w-full text-xs"><Download size={16} className="mr-2"/> 匯出 JSON 備份</Button>
            <div className="relative">
                <input type="file" onChange={handleImportFileSelect} accept=".json" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <Button theme="warm" variant="secondary" className="w-full text-xs" as="div"><Upload size={16} className="mr-2"/> 匯入備份還原</Button>
            </div>
        </div>
        <p className="mt-3 text-xs text-[#A69B87]">備份不包含 Gemini API Key 與 FinMind Token，換裝置後需重新設定。</p>
        <div className="mt-6 pt-6 border-t border-[#EDE4D6]"><Button theme="warm" onClick={handleReset} variant="danger" className="w-full text-[10px] uppercase font-bold"><Trash2 size={16} className="mr-2"/> 重置並清除所有本地資料</Button></div>
      </Card>

      {/* Google Drive Sync */}
      <Card theme="warm">
          <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2 text-[#3D3428]">
                <Cloud className="text-blue-500"/> Google Drive 雲端同步
              </h3>
              {isDriveConnected && (
                  <span className="bg-[#EAF1EC] text-[#6B9080] text-[10px] px-2 py-1 rounded-full border border-[#6B9080]/30 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#6B9080] animate-pulse"></div> 已連線
                  </span>
              )}
          </div>
          <div className="bg-[#FBF7F0] p-4 rounded-xl border border-[#EDE4D6] space-y-4">
              <div className="text-sm text-[#A69B87]">
                  <p className="mb-4">將所有帳務資料備份至您的私人雲端 (Google Drive)，解決跨裝置同步需求。</p>

                  <div className="space-y-2">
                      <label className="block text-xs font-medium text-[#A69B87] uppercase tracking-wider">OAuth Client ID</label>
                      <div className="flex gap-2">
                          <Input theme="warm" type="text" value={googleClientId} onChange={(e) => setGoogleClientId(e.target.value)} placeholder="輸入 Google Cloud Client ID" className="text-xs" />
                          <Button theme="warm" onClick={handleSaveClientId} variant="secondary" className="shrink-0 h-10 px-3">儲存</Button>
                      </div>
                      <p className="text-[10px] text-[#C4A98A]">* 請在 Google Cloud Console 設定授權來源 (Javascript Origins)。</p>
                  </div>
              </div>

              <div className="flex flex-col md:flex-row gap-3 pt-2">
                  <Button theme="warm" onClick={handleConnectDrive} disabled={isDriveLoading || (isDriveConnected && checkConnection())} className={`flex-1 ${isDriveConnected ? 'bg-[#6B9080] hover:bg-[#5f8272] cursor-default' : 'bg-blue-600 hover:bg-blue-500'}`}>
                      {isDriveLoading ? <RefreshCw className="animate-spin" size={18}/> : isDriveConnected ? <CheckCircle2 size={18}/> : <LogIn size={18}/>}
                      {isDriveConnected ? '雲端服務已就緒' : '連接 Google 帳號'}
                  </Button>
                  {isDriveConnected && (<><Button theme="warm" onClick={handleBackupToDrive} disabled={isDriveLoading} variant="secondary" className="flex-1"><Upload size={18} className="mr-2"/> 雲端備份</Button><Button theme="warm" onClick={handleRestoreFromDrive} disabled={isDriveLoading} variant="secondary" className="flex-1"><Cloud size={18} className="mr-2"/> 雲端還原</Button></>)}
              </div>
          </div>
      </Card>

      {/* Investment Settings */}
      <Card theme="warm" className="border-[#C4523A]/20">
          <h3 className="text-lg font-bold flex items-center gap-2 text-[#3D3428] mb-4">
            <Sparkles className="text-[#C4523A]"/> 投資設定
          </h3>
          <div className="bg-[#FBF7F0] p-4 rounded-xl border border-[#EDE4D6] space-y-6">
              <div>
                  <label className="text-sm text-[#3D3428] mb-2 block">股票手續費折扣</label>
                  <div className="flex gap-2">
                      <div className="relative flex-1">
                           <Input theme="warm" type="number" step="0.01" value={feeDiscount} onChange={(e) => setFeeDiscount(Number(e.target.value))} placeholder="例如: 0.28" className="pl-9 text-sm" />
                           <Percent size={16} className="absolute left-3 top-3 text-[#A69B87]"/>
                      </div>
                      <Button theme="warm" onClick={handleSaveFeeDiscount} variant="secondary" className="shrink-0">儲存</Button>
                  </div>
                  <p className="text-xs text-[#A69B87] mt-2">請輸入您的券商折扣，例如 2.8 折請輸入 0.28。此設定將影響損益計算的準確性。</p>
              </div>
          </div>
      </Card>




      <div className="text-center text-[10px] text-[#C4A98A] pb-4">
          <p>FinTrack AI v{APP_VERSION}</p>
      </div>

      <Modal theme="warm" isOpen={isPreviewModalOpen} onClose={closePreview} title="匯入預覽">
        {previewContent && (
            <div className="space-y-4">
                <div className="bg-[#FBF7F0] p-3 rounded-lg border border-[#EDE4D6] text-xs">
                    <p className="text-[#3D3428]">備份時間：<span className="text-[#3D3428] font-bold">{new Date(previewContent.preview.metadata.createdAt).toLocaleString()}</span></p>
                    <p className="text-[#A69B87]">備份版本：<span className="text-[#3D3428] font-bold">{previewContent.preview.metadata.appVersion}</span></p>
                    <p className="text-[#A69B87]">備份格式：<span className="text-[#3D3428] font-bold">Schema {previewContent.preview.metadata.schemaVersion}</span></p>
                </div>
                <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/30 text-xs text-amber-700 flex items-start gap-2">
                    <AlertCircle size={20}/><span><span className="font-bold">完整取代</span>：確認前會先下載目前財務資料；API 憑證與此裝置設定不會被匯入檔覆蓋。</span>
                </div>
                <div className="overflow-x-auto rounded-lg border border-[#EDE4D6]">
                    <table className="w-full text-xs text-[#3D3428]">
                        <thead className="bg-[#FBF7F0] text-[#8A7A63]">
                            <tr><th className="p-2 text-left">資料</th><th className="p-2 text-right">目前</th><th className="p-2 text-right">匯入後</th><th className="p-2 text-right">差異</th></tr>
                        </thead>
                        <tbody>
                            {previewContent.preview.rows.map((row) => (
                                <tr key={row.key} className="border-t border-[#EDE4D6]">
                                    <td className="p-2">{row.label}</td>
                                    <td className="p-2 text-right tabular-nums">{row.before}</td>
                                    <td className="p-2 text-right tabular-nums">{row.after}</td>
                                    <td className={`p-2 text-right tabular-nums ${row.delta < 0 ? 'text-[#C4523A]' : 'text-[#6B9080]'}`}>{row.delta > 0 ? `+${row.delta}` : row.delta}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {previewContent.preview.migrationNotes.length > 0 && (
                    <div className="text-xs text-[#8A7A63]"><p className="font-bold">格式遷移</p>{previewContent.preview.migrationNotes.map((note) => <p key={note}>{note}</p>)}</div>
                )}
                {Object.entries(previewContent.preview.deduplicationCounts).some(([, count]) => count > 0) && (
                    <div className="text-xs text-[#8A7A63]"><p className="font-bold">重複資料處理</p>{Object.entries(previewContent.preview.deduplicationCounts).filter(([, count]) => count > 0).map(([key, count]) => <p key={key}>{key} 已去除 {count} 筆重複資料。</p>)}</div>
                )}
                {previewContent.preview.ignoredSecretKeys.length > 0 && (
                    <div className="text-xs text-[#8A7A63]"><p className="font-bold">已忽略舊版憑證欄位</p><p>{previewContent.preview.ignoredSecretKeys.join('、')}</p></div>
                )}
                {previewContent.preview.ignoredUnknownKeys.length > 0 && (
                    <div className="text-xs text-[#8A7A63]"><p className="font-bold">已忽略未知欄位</p><p>{previewContent.preview.ignoredUnknownKeys.join('、')}</p></div>
                )}
                {previewContent.preview.rows.some((row) => row.reset) && (
                    <div className="text-xs text-[#C4523A]"><p className="font-bold">歸零提醒</p>{previewContent.preview.rows.filter((row) => row.reset).map((row) => <p key={row.key}>{row.label}將歸零。</p>)}</div>
                )}
                <div className="flex gap-2 pt-4 border-t border-[#EDE4D6]">
                    <Button theme="warm" variant="secondary" onClick={closePreview} disabled={isImporting} className="flex-1">取消</Button>
                    <Button theme="warm" onClick={handleConfirmImport} disabled={isImporting} loading={isImporting} className="flex-1">完整取代目前財務資料</Button>
                </div>
            </div>
        )}
      </Modal>

    </div>
  );
};







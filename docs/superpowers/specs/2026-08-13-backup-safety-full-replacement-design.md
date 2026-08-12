# FinTrackAI 備份安全與完整取代設計

日期：2026-08-13

狀態：已由使用者確認

範圍：第一階段資料安全修正，不包含密碼加密、全站 IndexedDB 遷移、效能拆分或大型模組重構

## 1. 目標

本階段修正目前備份與還原流程的三個主要問題：

1. 備份檔包含 Gemini API key 與 FinMind token。
2. 介面宣稱 Google Drive 備份已加密，但實際上傳的是明文 JSON。
3. 匯入會逐項寫入 `localStorage`，可能形成新舊資料混合或部分寫入狀態。

完成後，備份不含秘密；匯入會先完整驗證，再以備份快照取代目前財務資料；寫入失敗或匯入途中關閉 App 時，能從 IndexedDB 復原日誌回復。

## 2. 已確認的產品決策

- 採用「完整取代」，不是合併匯入。
- 備份排除 Gemini API key 與 FinMind token。
- 舊備份即使含有憑證，新版匯入器也必須忽略。
- Google Client ID 與主題屬於裝置設定，匯入時保留目前裝置值。
- 使用 IndexedDB 保存短期復原日誌；主要應用資料仍保留在 `localStorage`。
- Google Drive 備份仍是明文 JSON。本階段修正文案，不加入密碼加密。
- 匯入前由使用者動作觸發下載一份不含秘密的「匯入前備份」，作為額外復原管道。

## 3. 資料分類

### 3.1 可攜式財務資料

以下資料納入備份，並在匯入時完整取代：

- `ft_assets`
- `ft_transactions`
- `ft_recurring`
- `ft_recurring_executed`
- `ft_portfolio_history`
- `ft_budgets`
- `ft_stock_history`
- `ft_stock_transactions`
- `ft_stock_fee_discount`
- `ft_tech_params`
- `ft_dividend_events`
- `ft_dividend_scanned_at`

若合法備份缺少其中一個欄位，標準化後使用該欄位的安全預設值。集合使用 `[]` 或 `{}`，費率與技術參數使用當前版本預設值。這表示備份缺少的財務資料會被清空或重設，不會保留目前裝置上的舊值。

### 3.2 裝置設定

以下資料不由備份覆蓋：

- `ft_theme`
- `ft_google_client_id`

Google Client ID 不是使用者秘密，但與目前部署來源及裝置設定有關，因此保留目前裝置值，避免還原其他裝置的設定後破壞登入。

### 3.3 秘密

以下欄位永不寫入新備份，也永不從備份匯入：

- `ft_api_key`
- `ft_finmind_token`

匯入舊備份時若偵測到這些欄位，預覽必須顯示「已忽略舊版憑證欄位」，但不得顯示欄位內容。

### 3.4 快取與暫存狀態

行情、掃描或 DSSLab raw cache 不納入備份。完整取代成功後，僅清除已明確登記為可重建的快取 key；不得使用 `localStorage.clear()`，以免刪除秘密、裝置設定或其他同網域資料。

## 4. 備份格式

新格式採一個具版本的信封物件：

```ts
interface BackupEnvelope {
  metadata: {
    format: 'fintrack-ai-backup';
    schemaVersion: number;
    appVersion: string;
    createdAt: string;
  };
  data: PortableFinancialData;
}
```

- `schemaVersion` 控制資料 migration，不以 App 顯示版本代替。
- `appVersion` 由單一建置版本來源產生，不再在 `storage.ts` 寫死。
- `createdAt` 使用 ISO 8601。
- 本機下載與 Google Drive 必須呼叫同一個序列化函式，避免產生兩種備份語意。
- 匯出函式只接收已分類的可攜式財務資料，不得從整個 `localStorage` 列舉內容。

## 5. 模組邊界

備份功能拆成下列獨立單元：

### `backup/schema`

定義目前備份格式、標準資料形狀、安全預設值及驗證結果。不直接讀寫瀏覽器儲存空間。

### `backup/migrations`

把已知舊格式轉成目前 `PortableFinancialData`。既有「Asset 內嵌股票交易」的資料搬移與去重在這一層完成。migration 不得修改傳入的原始物件。

### `backup/parse`

負責 JSON 解析、格式辨識、migration、schema 驗證與標準化，回傳成功快照或結構化錯誤。此階段不得寫入任何持久化資料。

### `backup/export`

從目前儲存層建立不含秘密的 `BackupEnvelope`，供本機下載與 Google Drive 共用。

### `backup/recoveryJournal`

只管理 IndexedDB 復原日誌，包括建立、讀取、更新狀態與刪除。不理解個別財務欄位。

### `backup/replace`

協調匯入交易：建立復原日誌、寫入標準快照、回讀驗證、失敗回復及完成後清除日誌。

### `backup/preview`

比較目前標準快照與待匯入快照，產生純資料的預覽模型，供設定頁呈現。

## 6. 匯入資料流

1. 使用者選擇本機備份，或要求從 Google Drive 下載。
2. 系統取得原始 JSON 字串，但尚不寫入資料。
3. `parse` 辨識格式並執行必要 migration。
4. 驗證所有必要欄位、資料型別及有限數值，產生目前版本的標準快照。
5. 系統讀取目前財務資料，產生匯入前後差異預覽。
6. 使用者確認「完整取代目前財務資料」。
7. 在同一次使用者操作中下載不含秘密的匯入前備份。
8. 建立 IndexedDB 復原日誌；建立失敗時停止匯入，現有資料不變。
9. 暫停會寫入財務資料的背景工作。
10. 逐項寫入完整標準快照。缺少欄位已在標準化階段轉成安全預設值。
11. 清除已登記的可重建快取。
12. 回讀所有受管理 key，重新標準化並與目標快照比較。
13. 相同則將日誌標記為 `verified`，再刪除日誌並重新載入資料。
14. 任一步驟失敗，立即由日誌寫回匯入前快照並進行回讀驗證。

Google Drive 還原不得直接呼叫舊 `importData()`；它只負責取得 JSON，後續必須走同一套預覽、確認與完整取代管線。

## 7. IndexedDB 復原日誌

使用獨立資料庫，例如 `fintrack-ai-recovery`，保存至多一筆活動中的匯入：

```ts
interface ImportRecoveryJournal {
  id: string;
  startedAt: string;
  schemaVersion: number;
  status: 'prepared' | 'writing' | 'verified';
  previousSnapshot: PortableFinancialData;
  targetDigest: string;
}
```

- `previousSnapshot` 不含 API key、FinMind token、Google Client ID 或主題。
- `targetDigest` 是標準快照經穩定鍵排序序列化後計算的 SHA-256，用於識別預計寫入的資料，不在日誌重複保存整份目標快照。
- 建立日誌後、第一次寫入 localStorage 前，狀態改為 `writing`。
- 回讀驗證通過後標記 `verified`，隨即刪除。
- 日誌建立或讀取失敗時不得繼續匯入。

### App 啟動時的中斷處理

App 在載入財務資料及啟動自動任務前檢查日誌：

- 無日誌：正常啟動。
- `prepared`：尚未開始取代，可安全刪除日誌後正常啟動。
- `writing`：暫停自動任務，顯示阻擋式復原畫面，讓使用者執行「回復匯入前資料」。
- `verified`：代表資料已完成驗證但清理中斷；刪除日誌後正常啟動。

`writing` 狀態不能提供「忽略並繼續」，避免背景工作在不確定資料上繼續寫入。若回復失敗，保留日誌並提供下載復原快照與重試，不自動清除資料。

## 8. 驗證規則

驗證採「拒絕不安全資料，保留可辨識舊資料」原則：

- 根節點必須是物件。
- 新格式必須具有正確的 `metadata.format`、支援的 `schemaVersion` 與合法 `createdAt`。
- 已知集合必須是陣列或物件，不接受以錯誤型別代替。
- 金額、股數、價格、費率等必須是有限數值。
- 必要識別欄位和交易類型必須在允許集合中。
- 未知的非核心欄位可以忽略並在預覽列出。
- 已知核心欄位若結構錯誤，整份匯入失敗，不做部分跳過。
- migration 可進行已定義的去重與欄位搬移，但不得猜測無法辨識的財務資料。

驗證錯誤使用結構化資訊回報欄位路徑與原因，介面顯示友善摘要，不輸出秘密值。

## 9. 預覽與確認介面

預覽至少顯示：

- 備份日期、App 版本與 schema 版本。
- 資產、一般交易、固定收支、預算、股票交易、股息事件等目前數量與匯入後數量。
- 增加、減少、歸零或重設的項目。
- 執行過的 migration 與去重筆數。
- 被忽略的舊版憑證欄位。
- 被忽略的未知非核心欄位。

主動作文字使用「完整取代目前財務資料」。說明需明確指出：裝置上的 API key、FinMind token、主題與 Google Client ID 會保留；備份缺少的財務類別會清空或回復預設值。

## 10. 文案與文件修正

- 「備份成功！資料已加密存儲至您的 Google Drive。」改為「備份已儲存至您的 Google Drive。」
- README 不再宣稱「無資料外洩風險」或「Google Drive 雲端加密同步」。
- README 說明主要財務資料預設儲存在瀏覽器；啟用 Google Drive 備份或市場資料服務時會與對應外部服務通訊。
- 設定頁提示備份不包含 API key 與 FinMind token，換裝置後需重新設定。

## 11. 錯誤處理

- JSON 或 schema 錯誤：不建立日誌、不寫入資料，顯示可理解的錯誤摘要。
- IndexedDB 不可用：停止匯入，說明此瀏覽器目前無法提供安全復原；不得降級成不受保護的直接寫入。
- localStorage 容量或寫入失敗：從日誌立即回復並驗證。
- 回復失敗：保留日誌，阻止自動任務，提供重試與下載復原快照。
- Google Drive 網路錯誤：維持現有資料，不進入匯入交易。
- 使用者取消預覽：丟棄解析結果，不改變任何持久化資料。

## 12. 測試策略

新增可由 `npm test` 執行的測試基礎，優先覆蓋純函式與儲存協調器：

### 單元測試

- 新格式序列化不包含兩個秘密欄位。
- 舊格式 migration 搬移 Asset 內嵌股票交易並去重。
- 缺少財務欄位時產生明確安全預設值。
- 錯誤型別、非有限數值及不支援 schema 會被拒絕。
- 預覽正確計算增加、減少及歸零。

### 儲存整合測試

- 正常完整取代後，受管理 key 與目標快照一致。
- 備份缺少的欄位不會殘留舊資料。
- 兩個秘密及裝置設定保持原值。
- 任一 localStorage 寫入失敗時回復原快照。
- `writing` 日誌在下次啟動可完成回復。
- `prepared` 與 `verified` 日誌能安全清理。
- IndexedDB 無法建立時零寫入。

### 使用流程驗證

- 本機匯入與 Google Drive 還原顯示相同預覽。
- 取消、格式錯誤與網路失敗都不改變現有資料。
- 匯入前備份可再次通過解析與預覽。
- TypeScript、production build 及主要新增／編輯／刪除資料流程通過。

## 13. 完成標準

- 新產生的本機與 Google Drive 備份都不包含 Gemini API key 或 FinMind token。
- 舊備份內的秘密不會覆蓋目前裝置設定。
- 匯入只在完整解析、migration 與驗證後才能確認。
- 完整取代不留下備份中不存在的舊財務資料。
- 寫入失敗能立即回復；匯入途中關閉 App，重新啟動後能從持久化日誌回復。
- 匯入不使用 `localStorage.clear()`。
- Google Drive 與本機檔案共用同一資料管線。
- UI 與 README 不再宣稱未實作的加密或零外洩風險。
- 新增測試、TypeScript 與 production build 全部通過。

## 14. 非本階段範圍

- 使用密碼或 Web Crypto 加密備份。
- 將主要資料全面遷移至 IndexedDB。
- 合併式匯入與逐筆衝突解決。
- API proxy、Worker secret 或帳號系統。
- bundle code splitting、Dashboard／stock 模組拆分。
- 一般 localStorage 損壞資料的完整修復中心；本階段只處理匯入交易造成的中斷復原。

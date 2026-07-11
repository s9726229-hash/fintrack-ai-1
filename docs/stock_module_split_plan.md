# 股票分析模組分拆計畫

> 建立時間：2026-07-08
> 更新時間：2026-07-12
> 狀態：**DSSLab 已補回股票投資功能**（庫存總覽/技術監控/交易紀錄/股息分析）；**FinTrackAI 本體已移除「技術監控」分頁**（其餘庫存/交易/股息功能不變）。兩邊都通過 typecheck + 瀏覽器實測。
> 下次開工前，請直接從此文件接續討論。

## 股票投資（Investments）拆分決定（2026-07-12 第二輪）

在確認 DSSLab 可以正常運作並用真實資料驗證後，使用者決定進一步調整分工：
1. **`views/Investments.tsx`（庫存總覽/技術監控/交易紀錄/股息分析）整份複製到 DSSLab**，DSSLab 現在有自己完整一份 Investments 功能（含 `components/investments/*`、`components/transactions/TransactionFilters.tsx`、`hooks/useStockEnrichment.ts`、`hooks/useDailySnapshot.ts`），不再只靠匯入交易紀錄跑分析。
2. **FinTrackAI 本體移除「技術監控」分頁**——因為即時技術訊號監控本質上是 DSS 家族功能，本體只保留跟淨資產/記帳相關的「庫存總覽」「交易紀錄」「股息分析」三個分頁。

執行內容：
- DSSLab：複製 `views/Investments.tsx`、`components/investments/*`（8 個檔案）、`components/transactions/TransactionFilters.tsx`、`hooks/useStockEnrichment.ts`、`hooks/useDailySnapshot.ts`；`App.tsx` 補回 `assets`/`stockHistory` state 與所有 Investments 需要的 handler；`types.ts` 的 `ViewState` 加回 `INVESTMENTS`；`Sidebar.tsx`/`MobileBottomNav.tsx`/`Layout.tsx` 加回「股票投資」導覽項目與 `isEnrichingInBackground` 指示燈。
- FinTrackAI：`views/Investments.tsx` 移除「技術監控」分頁按鈕與整個內容區塊（原 `activeTab === 'MONITOR'` 區塊，約 290 行）、對應的 rescan useEffect、`services/signalColors.ts` 的具名 import、`getTechParameters` import、`LineChart` icon import。`ActiveTab` 型別移除 `'MONITOR'`。
- 兩邊都跑過 `npx tsc --noEmit`（0 錯誤）與瀏覽器實測：DSSLab 的股票投資分頁四個 tab 都正常渲染；FinTrackAI 的股票投資分頁只剩三個 tab，無殘留 `MONITOR` 字串、無 console 錯誤。

**遺留事項**：
- 確認過：FinTrackAI 本體現在**沒有任何檔案**再 import `services/signalColors.ts`（技術監控分頁是唯一使用者，已隨分頁移除）。這個檔案在本體變成完全死碼，DSSLab 已有自己一份，本體這份可以直接刪除——目前先保留未刪，因為使用者沒有明確要求刪這個檔案本身，只要求移除技術監控分頁。
- FinTrackAI Investments.tsx 裡「分析技術面」「5分鐘自動更新」按鈕與底層的 `handleUpdateBias`/`useStockEnrichment` 機制還留著，但拿掉 MONITOR 分頁後這些按鈕算出來的 `techSignal`/`rsi`/`ma20` 等欄位已經沒有任何畫面會顯示——目前判斷這超出「移除技術監控分頁」的字面範圍，先不動，如果之後想一併清掉再處理。
- DSSLab 的 Investments 現在吃自己那份 localStorage 的 `assets`/`transactions`，跟本體是分開的兩份資料，需要靠使用者手動用 Settings 的匯出/匯入維持同步（沒有自動同步機制）。

## 動工進度（2026-07-12）

1. ✅ 複製 FinTrackAI 全部原始碼到 `DSSLab` 資料夾（排除 `node_modules`、`.git`），重新 `git init`，第一筆 commit `d26941f`。
2. ✅ 裁減 `App.tsx`：只保留 `Watchlist`、`DSSLab`（內含 `BacktestView`）、`TechDocs`、`Settings` 四個 view；`stockTransactions` 狀態從新專案自己的 localStorage 讀取。
3. ✅ 裁減 `types.ts` 的 `ViewState`、`components/Layout.tsx`、`Sidebar.tsx`、`MobileBottomNav.tsx`、`MobileHeader.tsx` 導覽項目，品牌名稱改為「DSS Lab」。
4. ✅ 刪除不需要的 views（`Dashboard`、`Assets`、`Transactions`、`Budget`、`Recurring`、`Investments`、`History`、`Guide`）、hooks（`useAutoTasks`、`useDailySnapshot`、`useStockEnrichment`）、components（`investments/*`、`assets/*`、`transactions/*`）、`services/finance.ts`。
5. ✅ `npm install` + `npx tsc --noEmit` 通過，無型別錯誤。
6. ✅ 瀏覽器實測：Watchlist、DSS 實驗室（含匯出/匯入全域數據按鈕）、Settings（含「匯出 JSON 備份」/「匯入備份還原」）皆正常渲染。DSS 實驗室正確顯示「尚無完整交易紀錄」（因為還沒匯入資料，符合預期）。

7. ✅ **真實資料驗證通過**：用使用者 2026-07-06 的本體備份檔（`fintrack_ai_backup_2026-07-06.json`，540 筆股票交易）匯入 DSSLab（排除 `ft_api_key`/`ft_finmind_token`/`ft_google_client_id` 等敏感欄位，只寫入 `ft_stock_transactions`/`ft_stock_history`/`ft_watchlists`/`ft_tech_params`/`ft_stock_fee_discount`），DSS 實驗室正確算出 254 筆完整交易、整體勝率 86.6%、各標的勝率排行——確認「本體匯出 → 新專案匯入 → DSS 分析照跑」這條路徑是通的。驗證用的暫存檔（`public/seed-data.json`）已刪除，未進入 git。

**DSSLab 待辦（暫停中）**：
- `.claude/launch.json` 的設定名稱已從「FinTrack AI Dev Server」改為「DSS Lab Dev Server」，避免跟 FinTrackAI 本體撞名（用 `name` 啟動時曾經因為撞名啟動到錯的專案）。
- `manifest.json`、`metadata.json`、`apple-mobile-web-app-title` 裡還留著 FinTrack 品牌字樣，屬於 PWA/cosmetic 設定，不影響功能，之後想統一品牌再改。
- 目前驗證是我直接寫 localStorage 模擬匯入結果；正式的「匯出 JSON 備份 → 匯入備份還原」UI 流程（檔案選取）尚未實機點過一次，之後使用者自己操作時要留意。
- DSSLab 目前一堆變更還沒 commit（裁減 App.tsx、刪除 views/hooks/components 等），要不要 commit 由使用者決定。

## FinTrackAI 本體 DSS 移除進度（2026-07-12）

1. ✅ 刪除 `views/Watchlist.tsx`、`views/DSSLab.tsx`、`views/BacktestView.tsx`、`views/TechDocs.tsx`。
2. ✅ `App.tsx`：移除這四個 view 的 import 與對應區塊；`stockTransactions` state、`Investments`/`Dashboard` 的耦合維持不變（本來就要留）。
3. ✅ `components/layout/Sidebar.tsx`：移除「選股掃描」「DSS 實驗室」「技術說明」三個導覽項目。
4. ✅ `types.ts`：`ViewState` 移除 `WATCHLIST`/`DSS_LAB`/`TECH_DOCS`；移除 `WatchlistGroup` interface 及 `LocalStorageData.ft_watchlists` 欄位。
5. ✅ `services/storage.ts`：移除 `getWatchlists`/`saveWatchlists`、`DSSProfile`/`DSSProfileCategoryStats` 型別、`getDSSProfiles`/`saveDSSProfiles`、`getBacktestCache`/`saveBacktestCache`（含 `BACKTEST_CACHE_KEY`），以及 `exportData`/`getFullDataJson`/`importData` 裡對應這些欄位的行。
6. ✅ `constants.ts`：移除 `STORAGE_KEYS.WATCHLISTS`。
7. ✅ `views/Settings.tsx`：移除 `DSSProfilesCard` 元件與套用邏輯（「DSS 設定檔」卡片），移除對應 import；其餘（API 金鑰、備份匯出入、技術面參數設定）維持不動，因為 `Investments.tsx` 仍要用。
8. ✅ **`services/stock.ts`、`services/signalColors.ts` 原封不動保留**——修正先前規劃文件寫的「要搬走的」，這兩個檔案其實是 `Investments.tsx`/`Dashboard.tsx`/`Settings.tsx`/`hooks/useStockEnrichment.ts`/`hooks/useDailySnapshot.ts` 共用，只能複製給 DSSLab，本體不能刪。內含只有 DSS 用得到的函式（例如 `runBacktest`）目前留著當死碼，沒有進一步拆分。
9. ✅ `npx tsc --noEmit` 通過，無型別錯誤；全文搜尋確認沒有殘留的 `Watchlist`/`DSSLab`/`BacktestView`/`TechDocs`/`WatchlistGroup`/`DSSProfile` 引用。
10. ✅ 瀏覽器實測：側邊欄剩 7 個財務相關項目（總覽儀表板、資產管理、股票投資、收支記帳、預算與分析、固定收支、版本紀錄），Dashboard/Investments/Settings 頁面都正常渲染，「DSS 設定檔」卡片確認消失、技術面參數設定維持正常（Investments 訊號計算需要）。

**FinTrackAI 待辦**：
- 目前一堆變更還沒 commit，要不要 commit 由使用者決定。
- `services/stock.ts` 內未使用的 DSS-only 函式（`runBacktest` 等）尚未清理，屬於死碼但無害；之後想精簡可以再處理。
- `AssetType.STOCK` 保留（因為 Investments/庫存還在），不用理會先前文件寫的「待決定歸屬」。

## 目標

把「DSS 分析」相關功能搬出這個專案，變成獨立的另一套軟體。
**股票投資（Investments 頁面的庫存總覽 & 交易紀錄）留在 FinTrackAI 本體**，不隨 DSS 搬走——因此淨資產計算（股票市值）完全不受影響，2026-07-12 已排除原本的 (a)/(b)/(c) 三選項討論，因為問題本身不存在了。

搬遷範圍明確包含：
- DSS 機制（DSS 實驗室、DSS 回測分析、V5.0 雙軌決策引擎）
- 參數篩選（±N 日最佳進場/出場分析、六組參數資料庫中位數萃取、背離分析、DSSProfile 設定檔套用）
- 選股掃描（Watchlist）— 本身耦合最淺，直接一起搬

**不搬走、留在本體的**：
- `views/Investments.tsx`（庫存總覽、交易紀錄、技術監控）——繼續是淨資產股票市值的來源
- 對應的 storage keys：`ft_stock_history`、`ft_stock_transactions`、`ft_stock_fee_discount`

## 新專案的資料取得方式（2026-07-12 決定）

新專案（DSS 實驗室/回測/選股掃描）需要庫存 & 交易紀錄資料來跑分析，但這份資料的「本尊」留在 FinTrackAI。決定採用**匯入複本**方式：
- 比照現有 DSS 實驗室「全域數據匯出/匯入」機制，使用者手動從 FinTrackAI 匯出 `stockTransactions`（含庫存）成 JSON，再匯入新專案。
- 單向、非即時同步：新專案裡的是分析用的複本，不寫回、不影響本體資料。
- 使用者需要時（例如交易異動後想重跑分析）手動重新匯出/匯入更新複本。

## 現況分析（搬遷前必須知道的耦合狀況）

### 規模
股票相關程式碼約 5400 行，佔全專案 view/service 程式碼將近一半：
- `views/DSSLab.tsx`：1681 行
- `services/stock.ts`：1603 行
- `views/Watchlist.tsx`：789 行
- `views/Investments.tsx`：746 行
- `views/BacktestView.tsx`：598 行
- `services/signalColors.ts`：75 行
- `views/TechDocs.tsx`：652 行（大部分是股票 DSS 相關文件，非股票部分很少）

### 架構現況：純前端 SPA + localStorage，沒有後端/API 層
這是整個分拆計畫最大的風險來源。目前資料完全存在瀏覽器 localStorage（`services/storage.ts` + `constants.ts` 的 `STORAGE_KEYS`），沒有任何 client-server 邊界。

### 耦合點（依耦合深度排序，最深的排最前面）

1. **股票庫存繼續是 `Asset` 陣列的一部分，且不搬**：`ft_assets` 裡 `type === AssetType.STOCK` 的那幾筆，跟現金/房地產/負債存在同一份陣列，驅動 Dashboard 的淨資產、資產配置圓餅圖（`views/Dashboard.tsx`、`views/Assets.tsx`）。**2026-07-12 決定：`Investments.tsx` 留在本體，此耦合維持原狀，不需處理。**
2. **Dashboard 現金流計算直接讀 `stockTransactions`**：`views/Dashboard.tsx` 拿 `StockTransaction[]` 算已實現損益，當作月度收支的「股票收入」項目。因為交易紀錄留在本體，此耦合同樣維持原狀。
3. **技術監控留在 `views/Investments.tsx`**（MONITOR tab），跟庫存 CRUD 共用同一份 `inventory`、`onUpdate`/`onUpdateMultiple` handler——本體不變動。
4. **DSS 實驗室要搬走，但需要讀 `stockTransactions`**：自己一套快取（`ft_dsslab_raw_cache`、`ft_dsslab_optimal_cache`、`ft_dsslab_exit_cache`、`ft_backtest_cache`、`ft_dss_profiles`），資料來源改為**從本體匯出的複本**（見上方「新專案的資料取得方式」），不是即時讀取本體 state。`ft_tech_params`（`TechParameters`）目前也被 Investments/Watchlist 讀去算訊號燈號——新專案要不要也搬走這份設定，或各自維護一份，待動工時再細看。
5. **選股掃描（Watchlist）幾乎無耦合**：不吃 App 共用 state，自己抓資料、自己管理 `ft_watchlists`，直接搬。

### 目前使用的 storage keys
留在本體（不搬）：`ft_stock_history`、`ft_stock_transactions`、`ft_stock_fee_discount`。
搬到新專案（或在新專案重新建立）：`ft_watchlists`、`ft_tech_params`（待定，見上）、`ft_dsslab_raw_cache`、`ft_dsslab_optimal_cache`、`ft_dsslab_exit_cache`、`ft_backtest_cache`、`ft_dss_profiles`。

## 建議的搬遷策略：先複製、驗證、再移除（非一次性搬移）

1. **複製整個 repo**（不是只挑 DSS 相關檔案）作為新專案起點——因為 DSS 頁面依賴 `components/layout`、`types.ts`、`services/storage.ts` 等共用底層，單獨複製會直接壞掉。
2. 在新專案裡移除非 DSS 頁面（Dashboard、收支記帳、預算、固定收支等）**以及 `Investments.tsx`**（庫存/交易紀錄留在本體，新專案不需要 CRUD 這份資料，只需要讀取匯入的複本），只留 `Watchlist`、`DSSLab`、`BacktestView`、`services/stock.ts`（視情況拆出分析用得到的部分）、`services/signalColors.ts`。
3. 新專案第一次啟動需要「種子資料」：把本體的 `stockTransactions`（含庫存）匯出一次匯入進去（比照 DSS 實驗室既有的「全域數據匯出/匯入」機制延伸）。
4. **這段期間本體維持完全不動**，新專案獨立驗證跑得動、資料正確——不會有功能中斷期。
5. 驗證穩定後，才開始從本體移除 DSS 相關頁面/程式碼/路由（`Watchlist`、`DSSLab`、`BacktestView` 三者）。

## 分拆範圍清單（供未來動工時對照）

**要搬走的**：
- `views/Watchlist.tsx`、`views/DSSLab.tsx`、`views/BacktestView.tsx`
- `services/stock.ts`（DSS 分析用到的部分）、`services/signalColors.ts`
- `views/TechDocs.tsx` 中「DSS 決策輔助系統」「DSS 參數提取機制」相關內容
- storage keys：`ft_watchlists`、`ft_dsslab_*`、`ft_backtest_cache`、`ft_dss_profiles`

**留在 FinTrackAI 本體的**：
- `views/Dashboard.tsx`、`views/Assets.tsx`、`views/Transactions.tsx`、`views/Budget.tsx`、`views/Recurring.tsx`、`views/History.tsx`
- `views/Investments.tsx`（庫存總覽、交易紀錄、技術監控）——**2026-07-12 決定保留，不搬**
- `services/finance.ts`、`services/storage.ts`
- storage keys：`ft_assets`、`ft_transactions`、`ft_recurring`、`ft_recurring_executed`、`ft_portfolio_history`、`ft_budgets`、`ft_stock_history`、`ft_stock_transactions`、`ft_stock_fee_discount`

**待決定歸屬**：
- `ft_tech_params`（`TechParameters`）：新專案是否需要獨立一份，還是隨匯入複本一起帶過去，動工時再定
- `services/stock.ts` 是否需要拆成「本體用（庫存/交易 CRUD）」與「DSS 分析用」兩份，避免新專案帶著用不到的程式碼

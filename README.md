<div align="center">

# 💹 FinTrack AI

**個人財務管理 × 股票庫存記錄**

![Version](https://img.shields.io/badge/版本-V7.8.0-6366f1?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=for-the-badge&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-PWA-646cff?style=for-the-badge&logo=vite)

> 所有資料儲存於本地瀏覽器，無伺服器、無資料外洩風險。

</div>

---

## ℹ️ 專案定位

FinTrack AI 是**單純的個人財務管理工具**：資產總覽、收支記帳、預算、固定收支，外加股票庫存/交易紀錄的基本追蹤。

台股技術分析、DSS 雙軌決策引擎、選股掃描、回測分析等進階功能已分拆至獨立專案 **[DSS Lab](https://github.com/s9726229-hash/dss-lab)**，本體不再處理個股訊號判斷。兩個專案透過「匯出 JSON 備份 → 匯入」單向橋接股票交易資料，各自獨立運作、互不影響。

---

## ✨ 主要功能

### 💰 個人財務管理
- 資產與負債追蹤（含貸款寬限期計算）
- 每月收支、固定收支、預算管理
- AI 語音記帳、電子發票 CSV 匯入
- 現金流預測與淨值趨勢圖

### 💼 股票投資（Investments）
- **庫存總覽**：個股持倉成本、市值、未實現損益
- **交易紀錄**：買賣紀錄匯入與定期定額標記
- **股息分析**：除息日、年化殖利率、已領/預估股息
- 即時股價更新（TWSE + OTC 雙來源）

### ☁️ 資料管理
- 一鍵匯出 / 匯入 JSON 備份
- Google Drive 雲端加密同步（可選）
- PWA：可安裝至手機桌面，離線可用

---

## 🚀 本地啟動

**需求：** [Node.js](https://nodejs.org/) v18+

```bash
# 1. 安裝依賴
npm install

# 2. 啟動開發伺服器
npm run dev
# → http://localhost:3000
```

---

## 📦 建置與部署

```bash
npm run build   # 產生 dist/ 靜態檔案
```

本專案已設定 GitHub Actions（`.github/workflows/deploy.yml`），push 至 `main` 分支後自動部署至 GitHub Pages。

---

## 🛠 技術棧

| 項目 | 技術 |
|---|---|
| 前端框架 | React 18 + TypeScript |
| 建置工具 | Vite + vite-plugin-pwa |
| 樣式 | Tailwind CSS（Dark Theme） |
| 台股價格 | TWSE mis.twse.com.tw（Cloudflare Worker 代理） |
| 資料儲存 | localStorage（純本地，無後端） |
| 雲端同步 | Google Drive API（選用） |

---

<div align="center">
  <sub>FinTrack AI — 財務管理工具，投資決策請自行判斷</sub>
</div>

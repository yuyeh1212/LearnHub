# LearnHub

LearnHub 是 React + Vite 前端與 Express + PostgreSQL API 組成的學習平台 MVP，包含課程目錄、帳密登入、選課、Lesson Player、跨裝置學習進度與短效私有內容交付。

## 啟動

第一次使用時，先複製 `.env.example` 為 `.env`，依 [資料庫設定](docs/database-setup.md) 套用三個 migration、執行本機 seed，並準備私有展示內容：

```powershell
.\scripts\prepare-local-content.ps1
```

分別啟動 API 與前端：

```powershell
.\run-api.ps1
.\run-dev.ps1
```

再開啟 `http://127.0.0.1:4173/`。內容交付設定與安全邊界請見 [私有內容交付](docs/content-delivery.md)。

## 目前範圍

- 使用 CSS tokens 固定色彩、字體、圓角、陰影與互動速度。
- 首頁與 Lesson Player 直接讀取 API 課程資料；課程搜尋支援 cursor 分頁與前端「載入更多」。
- 帳密登入、註冊、短效 JWT、到期重新登入提示、登入／註冊 rate limiting 與安全標頭已接上。
- 登入後可選課，並同步目前單元、觀看秒數與完成狀態；若分頁關閉前最後一次同步失敗，會保留待重試的進度寫入。
- 影片與教材以短效簽章 URL 交付，實際儲存位置不會進入前端 bundle 或 API DTO。
- PostgreSQL migration 與本機 seed 目前仍需手動執行。
- 「我的學習」會整理已加入課程、最近單元與完成比例，讓學員能接續上次進度。
- 私有內容支援本機檔案與 Supabase Storage；Vercel Cron 會定期呼叫 heartbeat endpoint，降低 Supabase 專案閒置暫停風險。
- Vercel 首次部署設定請見 [`docs/vercel-deployment.md`](docs/vercel-deployment.md)。

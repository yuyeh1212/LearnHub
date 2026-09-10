# LearnHub Web

LearnHub 的 React + Vite 前端雛型，包含 Landing 與 Lesson Player。

## 啟動

在本資料夾使用 PowerShell 執行：

```powershell
.\run-dev.ps1
```

再開啟 `http://127.0.0.1:4173/`。首頁的「繼續學習」可進入 Lesson Player；播放器可手動標記完成並更新進度。

## 目前範圍

- 使用 CSS tokens 固定色彩、字體、圓角、陰影與互動速度。
- Landing 與 Lesson Player 為可操作的前端原型。
- Landing 與 Lesson Player 目前仍使用前端範例資料；課程、登入與影片串流尚未串接。
- PostgreSQL schema 已定義在 `db/migrations/0001_learning_core.sql`，但尚未對任何資料庫執行。
- 學習資料與 API 契約請見 `docs/learning-api-v1.md`；資料庫設定說明請見 `docs/database-setup.md`。

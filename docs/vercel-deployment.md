# LearnHub Vercel 部署

LearnHub 使用 Vite 靜態前端與同網域 Vercel Function。`api/[...path].ts` 會把 `/api/*` 請求交給既有 Express 應用程式，前端則由 `dist` 提供。

## Configure Project

- Project Name：`learn-hub`
- Application Preset：`Vite`
- Root Directory：`./`
- Build Command：使用預設的 `npm run build`
- Output Directory：使用預設的 `dist`

## Production 環境變數

在 Vercel 的 Environment Variables 設定以下值。所有密鑰只存於 Vercel，不要提交到 Git。

| 名稱 | 值或來源 |
| --- | --- |
| `DATABASE_URL` | Supabase Connect 畫面的 Transaction pooler URL；填入資料庫密碼並使用 port `6543` |
| `JWT_SECRET` | 至少 32 字元的 production 專用隨機值 |
| `CONTENT_SIGNING_SECRET` | 與 `JWT_SECRET` 不同、至少 32 字元的隨機值 |
| `VITE_API_BASE_URL` | `/api/v1` |
| `CONTENT_STORAGE_DRIVER` | `supabase` |
| `CONTENT_ACCESS_TTL_SECONDS` | `900` |
| `CRON_SECRET` | 至少 16 字元的隨機值；Vercel Cron 會用 `Authorization: Bearer <CRON_SECRET>` 呼叫 heartbeat |
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SECRET_KEY` | Supabase server-side secret key |
| `SUPABASE_STORAGE_BUCKET` | `learnhub-content` |

同網域部署不需設定 `CORS_ORIGIN`。`PUBLIC_API_BASE_URL` 與 `CONTENT_STORAGE_ROOT` 只供本機檔案模式使用，Vercel 不需設定。`PORT` 由 Vercel 管理，也不需設定。

## 首次部署後驗證

1. 開啟網站首頁，確認三門展示課程可以載入。
2. 開啟 `/api/v1/health`，應回傳 `{ "status": "ok" }`。
3. 開啟 `/api/v1/ready`，應回傳 `{ "status": "ready" }`。
4. 註冊一個展示帳戶，加入課程並完成一個單元。
5. 回到「我的學習」，確認課程、目前單元與完成比例同步更新。
6. 播放影片並下載教材，確認 Supabase Storage 的短效連結正常。
7. 在 Vercel Cron Jobs 確認 `/api/v1/cron/supabase-heartbeat` 有排程；若手動測試，必須帶上 `Authorization: Bearer <CRON_SECRET>`。

若 Production 部署無法通過健康檢查或完整學習流程，先在 Vercel Deployments 中將上一個正常部署設為 Production，不要在故障版本上直接修改資料庫。

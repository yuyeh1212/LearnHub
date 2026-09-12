# 私有內容交付

LearnHub 不再把儲存服務的原始位置直接交給瀏覽器。課程單元 API 會把 `content_assets.storage_key` 轉成短效簽章網址；瀏覽器只能在期限內，以指定的 `inline`（影片）或 `attachment`（教材）用途存取內容。

## 邊界

- `content_assets` 保存供應商中立的物件鍵值、媒體類型與原始檔名。
- `lessons.video_asset_id` 與 `lesson_resources.content_asset_id` 指向內容物件。
- `GET /api/v1/content-assets/{assetId}` 驗證 HMAC 簽章、到期時間與用途後才提供檔案。
- 本機使用 `storage/private`；此目錄不進 Git，也不會被 Vite 打包。
- 影片端點支援單一 HTTP Range，讓瀏覽器可以讀取 metadata、拖曳及續播。

目前課程單元仍是公開預覽，因此任何人都可向單元 API 取得短效網址；簽章的作用是隱藏實際儲存鍵值、限制網址壽命及避免永久 hotlink。未來若課程改為付費內容，應在簽發網址前再驗證登入與選課資格。

## 本機準備

先執行 `0003_private_content_assets.sql`，再重新執行本機 seed。最後準備私有內容：

```powershell
# 可在本機／測試環境執行｜唯讀：否｜鎖表：不鎖表｜改動資料：只寫入 storage/private 檔案
.\scripts\prepare-local-content.ps1
```

也可以傳入自己的 MP4；檔案只會複製到被 Git 忽略的本機私有目錄：

```powershell
# 可在本機／測試環境執行｜唯讀：否｜鎖表：不鎖表｜改動資料：只寫入 storage/private 檔案
.\scripts\prepare-local-content.ps1 -VideoSourcePath 'C:\path\to\lesson.mp4'
```

## 環境設定

- `PUBLIC_API_BASE_URL`：瀏覽器可存取的 `/api/v1` 公開基底網址。
- `CONTENT_STORAGE_ROOT`：本機私有內容根目錄。
- `CONTENT_ACCESS_TTL_SECONDS`：短效網址存活秒數，預設 900 秒。
- `CONTENT_SIGNING_SECRET`：本機儲存模式使用的內容簽章密鑰；正式環境應與 JWT 密鑰分開。Supabase 模式使用 Storage 自己的簽章機制，不需要此值。

前端會在最早一個內容網址到期前一分鐘重新取得單元資料；媒體載入失敗時也能手動重新簽發網址。

## Supabase Storage

`0003_private_content_assets.sql` 會建立 private `learnhub-content` bucket。設定 `CONTENT_STORAGE_DRIVER="supabase"`、`DATABASE_URL`、`SUPABASE_URL`、`SUPABASE_SECRET_KEY` 與 `SUPABASE_STORAGE_BUCKET` 後，後端會透過官方 Supabase SDK 產生 Storage signed URL，影片流量不會經過 Express 伺服器。

`SUPABASE_SECRET_KEY` 只能存在後端環境；不可使用 `VITE_` 前綴、不可提交 Git，也不可貼進前端程式。準備好 bucket 與環境變數後，上傳本機私有展示內容：

```powershell
# 需確認後才能在遠端 Supabase 執行｜唯讀：否｜鎖表：不鎖表｜改動資料：上傳或覆寫兩個 Storage objects
& 'C:\Program Files\nodejs\node.exe' .\scripts\upload-content-to-supabase.mjs
```

啟動 API 後，可實際驗證課程資料、影片 Range request 與教材下載；輸出只包含狀態與路徑，不會印出簽章 token：

```powershell
# 會對本機 API 與遠端私有物件做只讀請求
npm run content:verify
```

Supabase bucket 保持 private，且不建立給 `anon` 或 `authenticated` 的 Storage policy；只有持有後端 secret key 的 API 可以簽發網址。若正式內容有付費或選課限制，還需在 `GET /lessons/{lessonId}` 簽發前驗證使用者資格。

若未設定 Supabase driver，開發環境仍可使用本機 `ContentStorage` adapter。HTTP 與資料庫契約不因 provider 改變。

# 資料庫基礎

LearnHub 使用 PostgreSQL。初始結構定義於 `db/migrations/0001_learning_core.sql`，學習狀態擴充定義於 `db/migrations/0002_course_learning_states.sql`，私有內容物件定義於 `db/migrations/0003_private_content_assets.sql`，密碼重設 token 定義於 `db/migrations/0004_password_reset_tokens.sql`；migration 目前仍需依序手動執行。

## 本輪建立的資料模型

- `users`：帳號、密碼雜湊與角色。密碼絕不儲存明文。
- `courses`、`chapters`、`lessons`、`lesson_resources`：課程內容與教材。
- `enrollments`：使用者加入的課程，限制同一帳號只能加入一次。
- `lesson_progress`：使用者每個單元的播放位置與完成時間，限制一個帳號在同一單元只有一筆進度。
- `course_learning_states`：使用者每門課目前停留的單元，讓跨裝置開啟播放器時能回到上次的位置。
- `content_assets`：供應商中立的私有影片與教材 metadata；課程資料只保存物件鍵值，不公開實際磁碟位置。
- `password_reset_tokens`：一次性密碼重設 token 的 hash、有效期限與使用狀態；不保存明文 token。

課程整體完成率不寫入資料表，而是在讀取時由單元完成資料計算，避免兩份進度資料不同步。

## 完整性保護

- 章節、單元與教材都有課程／父層內的固定排序，資料庫會阻擋重複排序。
- 課程狀態、帳號角色與教材類型由 `CHECK` 限制在已定義的值。
- 刪除課程或單元時，相關內容與該內容的學習進度會一併移除，避免孤立資料。
- 電子信箱以不分大小寫的唯一索引限制重複註冊。

## 本機設定

複製 `.env.example` 為 `.env`，再填入本機 PostgreSQL 的連線字串與隨機 JWT 密鑰。`.env` 已被 Git 忽略，不應放入真實密碼、正式環境連線字串或私密金鑰。

## 尚未執行 migration 的原因

目前尚未確認任何資料庫環境、備份狀態或連線設定，因此沒有自動執行 migration。正式環境套用前應先確認備份或時間點還原（PITR）、檢視實際 SQL，並安排以新的 forward migration 修正問題，而不是依賴 down migration。

## 本機展示資料

`db/seeds/local-demo-content.sql` 只供本機開發展示課程目錄與播放器。它不含帳號、密碼或選課紀錄，也不應套用到正式環境。要讓首頁與播放器取得資料，請先依序完成四個 migration、執行種子檔，再執行 `scripts/prepare-local-content.ps1` 準備被 Git 忽略的本機私有檔案。

執行本機 API 時，`.env` 的 `VITE_API_BASE_URL` 可維持為 `http://127.0.0.1:3001/api/v1`。它是瀏覽器可見的公開設定，只能放 API 位址，不能放 JWT、資料庫帳密或其他私密資訊。

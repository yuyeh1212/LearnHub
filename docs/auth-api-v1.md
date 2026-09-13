# Authentication API v1

所有端點都使用 JSON，基底路徑為 `/api/v1`。失敗回應使用 RFC 9457 Problem Details，`Content-Type` 為 `application/problem+json`。

## `POST /auth/register`

建立學員帳號並回傳存取權杖。

```json
{
  "email": "learner@example.com",
  "password": "a-strong-password-with-12-or-more-characters",
  "displayName": "王小明"
}
```

- `201 Created`：回傳 `accessToken`、`tokenType`、`expiresInSeconds` 與不含密碼雜湊的 `user`。
- `400 VALIDATION_ERROR`：格式不正確、密碼少於 12 個字元，或傳入未定義欄位。
- `409 EMAIL_ALREADY_REGISTERED`：電子信箱已註冊。

## `POST /auth/login`

以帳密換取 15 分鐘有效的 Bearer access token。

```json
{
  "email": "learner@example.com",
  "password": "a-strong-password-with-12-or-more-characters"
}
```

- `200 OK`：回傳和註冊端點相同的驗證結果。
- `401 INVALID_CREDENTIALS`：帳號不存在或密碼錯誤；兩種情況使用相同回應，避免洩漏帳號是否存在。

## `POST /auth/password-reset-requests`

申請密碼重設。此端點一律回傳相同語意的成功訊息，不透露信箱是否已註冊。

```json
{
  "email": "learner@example.com"
}
```

- `202 Accepted`：回傳通用訊息與重設連結有效時間。
- `400 VALIDATION_ERROR`：電子信箱格式不正確或傳入未定義欄位。
- `429 RATE_LIMIT_EXCEEDED`：短時間內申請太多次。

本機與 Beta 測試可將 `PASSWORD_RESET_DEBUG_RESPONSE` 設為 `true`，API 會額外回傳一次性的 `resetToken`，讓前端在尚未串接寄信服務前完成重設流程。公開 production 若沒有刻意做手動測試，應設為 `false`。

## `POST /auth/password-resets`

使用一次性 token 設定新密碼。成功後同一使用者其他未使用的重設 token 會一併失效。

```json
{
  "token": "password-reset-token",
  "password": "a-new-strong-password-with-12-or-more-characters"
}
```

- `200 OK`：密碼已更新，使用者需重新登入。
- `400 PASSWORD_RESET_TOKEN_INVALID`：token 不存在、已使用或已過期。
- `400 VALIDATION_ERROR`：密碼少於 12 個字元，或傳入未定義欄位。
- `429 RATE_LIMIT_EXCEEDED`：短時間內重設嘗試太多次。

## `GET /auth/me`

讀取目前登入使用者。

```http
Authorization: Bearer <accessToken>
```

- `200 OK`：回傳 `{ id, email, displayName, role }`。
- `401 UNAUTHENTICATED`：沒有、失效或格式錯誤的權杖。

## 開發啟動

1. 建立 `.env`，並從 `.env.example` 填入本機 PostgreSQL 連線字串、JWT 密鑰與前端來源。
2. 確認 migration 已在本機資料庫執行後，以 `./run-api.ps1` 啟動 API。
3. API 預設使用 `http://127.0.0.1:3001`；前端開發站使用 `http://127.0.0.1:4173`。

JWT 存取權杖只放在記憶體或安全的短期儲存策略中；目前瀏覽器介面使用 `sessionStorage` 維持同一分頁工作階段，重新載入時會以 `GET /auth/me` 驗證權杖。密碼重設 token 只以 SHA-256 hash 保存於資料庫，明文 token 僅在建立當下用於寄送或 Beta debug response。不要將密碼、JWT 密鑰、重設 token 或資料庫連線字串放入前端的 `VITE_` 環境變數。

# LearnHub 學習資料模型與 API v1

這份契約定義產品資料的責任邊界。公開課程目錄、課程大綱與單元內容已由 Express API 實作；使用前需完成本機資料庫 migration 與連線設定。

## 產品資料模型

| 資源 | 代表的事實 | 關係與約束 |
| --- | --- | --- |
| `users` | 可登入的使用者個人資料 | `auth_user_id` 必須唯一；帳密交由認證供應商處理，不寫入此表。 |
| `courses` | 一門可供選修的課程 | `slug` 必須唯一；狀態為 `draft`、`published` 或 `archived`。 |
| `chapters` | 課程內的章節 | `course_id + position` 必須唯一。 |
| `lessons` | 章節內的一個學習單元 | `chapter_id + position` 必須唯一；`duration_seconds > 0`。 |
| `lesson_resources` | 單元附件，例如程式碼與講義 | 屬於一個單元，下載 URL 由儲存服務產生。 |
| `enrollments` | 使用者選修某門課的紀錄 | `user_id + course_id` 必須唯一。 |
| `lesson_progress` | 使用者在一個單元的觀看位置與完成時間 | `user_id + lesson_id` 必須唯一；`position_seconds >= 0`。 |

`CourseProgress` 是 API 回傳的彙總資料，不建立重複的完成百分比欄位。完成百分比應由 `lesson_progress.completed_at` 和課程單元總數即時計算，避免資料不同步。

## 建議的 PostgreSQL 關聯

```text
users ──< enrollments >── courses ──< chapters ──< lessons ──< lesson_resources
  │                                             │
  └──────────────────────< lesson_progress >────┘
```

初版需要的索引：

- `courses (status, category, created_at DESC)`：課程目錄與分類查詢。
- `chapters (course_id, position)`：讀取課程大綱。
- `lessons (chapter_id, position)`：讀取章節單元。
- `enrollments (user_id, course_id)`：使用者的已選課清單與唯一性。
- `lesson_progress (user_id, lesson_id)`：儲存觀看位置與完成狀態。

最壞情況：若沒有 `enrollments` 與 `lesson_progress` 的唯一約束，同一使用者可能會出現重複選課或多份互相衝突的觀看紀錄。

## REST API v1

所有路由以 `/api/v1` 起始。需要使用者資料的路由必須驗證登入身分；未登入回傳 `401`。

| 方法與路徑 | 用途 | 成功回應 |
| --- | --- | --- |
| `GET /courses?query=&category=&cursor=&limit=` | 課程目錄與搜尋 | `200 CursorPage<CourseSummary>` |
| `GET /courses/{courseId}` | 課程基本資訊 | `200 CourseDetail` |
| `GET /courses/{courseId}/outline` | 課程、章節與單元大綱 | `200 CourseOutline` |
| `GET /lessons/{lessonId}` | 播放頁所需的單元與附件 | `200 LessonDetail` |
| `POST /enrollments` | 選修課程；body 為 `{ "courseId": "..." }` | `201 Enrollment` |
| `GET /me/enrollments` | 目前使用者已選修的課程 | `200 CursorPage<Enrollment>` |
| `GET /me/course-progress/{courseId}` | 課程完成度與每個單元進度 | `200 CourseProgress` |
| `PATCH /me/course-progress/{courseId}` | 更新目前學習單元 | `200 CourseProgress` |
| `PUT /me/lesson-progress/{lessonId}` | 冪等更新觀看秒數與完成狀態 | `200 LessonProgress` |

`PUT /me/lesson-progress/{lessonId}` 的 body：

```json
{
  "positionSeconds": 95,
  "completed": false
}
```

後端必須驗證：使用者已選修該單元所屬課程、`positionSeconds` 不為負數，且單元存在。輸出只回傳前端需要的 DTO，不外洩認證或儲存服務內部資訊。

## 錯誤格式

所有錯誤使用 RFC 9457 Problem Details，回應標頭為 `application/problem+json`：

```json
{
  "type": "https://api.learnhub.example/problems/validation-error",
  "title": "Validation Failed",
  "status": 400,
  "detail": "positionSeconds 必須是大於或等於 0 的整數。",
  "instance": "/api/v1/me/lesson-progress/lesson_123",
  "code": "LESSON_PROGRESS_VALIDATION_FAILED",
  "errors": [
    { "field": "positionSeconds", "message": "must be an integer greater than or equal to 0" }
  ]
}
```

## 前端銜接順序

1. 已以 `src/contracts/learning.ts` 的型別建立 API client，首頁與播放器已串接課程目錄、課程大綱與單元內容。
2. 登入畫面完成後，將播放器的暫存進度換成 `GET`／`PUT` 進度 API。
3. 最後接影音與資源儲存服務的授權 URL。

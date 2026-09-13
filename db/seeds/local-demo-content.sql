-- Local development seed only. Do not run against production.
-- Contains no user accounts, passwords, or enrollments.

BEGIN;

INSERT INTO content_assets (id, storage_key, media_type, original_file_name, byte_size)
VALUES
  ('f2531bf3-d447-40cb-a907-4bd66c111001', 'demo/videos/flower.mp4', 'video/mp4', 'react-hooks-demo.mp4', NULL),
  ('f2531bf3-d447-40cb-a907-4bd66c111002', 'demo/resources/useFetch.ts', 'text/plain; charset=utf-8', 'useFetch.ts', NULL)
ON CONFLICT (id) DO UPDATE SET
  storage_key = EXCLUDED.storage_key,
  media_type = EXCLUDED.media_type,
  original_file_name = EXCLUDED.original_file_name,
  byte_size = COALESCE(EXCLUDED.byte_size, content_assets.byte_size);

INSERT INTO courses (id, slug, title, summary, category, instructor_name, cover_image_url, status)
VALUES
  ('b2531bf3-d447-40cb-a907-4bd66c111001', 'react-architecture', 'React 前端實戰：從畫面到資料流', '從元件、state、props 到 API 資料流，練習把前端架構拆清楚。', '軟體工程', '林育賢', 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=1200&q=80', 'published'),
  ('b2531bf3-d447-40cb-a907-4bd66c111002', 'product-analytics', '產品數據分析實戰：從指標到決策', '學會設計指標、讀懂數據，再把分析結果變成產品決策。', '資料分析', '陳怡安', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80', 'published'),
  ('b2531bf3-d447-40cb-a907-4bd66c111003', 'ux-design', 'UX 設計流程：從研究到產品決策', '把訪談、觀察和設計系統串起來，做出能落地的產品方案。', '設計職能', '黃子庭', 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?auto=format&fit=crop&w=1200&q=80', 'published')
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  category = EXCLUDED.category,
  instructor_name = EXCLUDED.instructor_name,
  cover_image_url = EXCLUDED.cover_image_url,
  status = EXCLUDED.status;

INSERT INTO chapters (id, course_id, position, title)
VALUES
  ('c2531bf3-d447-40cb-a907-4bd66c111001', 'b2531bf3-d447-40cb-a907-4bd66c111001', 1, '第 1 章：Hooks 與非同步資料'),
  ('c2531bf3-d447-40cb-a907-4bd66c111002', 'b2531bf3-d447-40cb-a907-4bd66c111002', 1, '第 1 章：從問題到可用指標'),
  ('c2531bf3-d447-40cb-a907-4bd66c111003', 'b2531bf3-d447-40cb-a907-4bd66c111003', 1, '第 1 章：把研究變成設計方向')
ON CONFLICT (id) DO UPDATE SET
  course_id = EXCLUDED.course_id,
  position = EXCLUDED.position,
  title = EXCLUDED.title;

INSERT INTO lessons (id, chapter_id, position, title, description, duration_seconds, content_type, video_url)
VALUES
  ('d2531bf3-d447-40cb-a907-4bd66c111001', 'c2531bf3-d447-40cb-a907-4bd66c111001', 1, 'React 怎麼更新畫面', '從元件渲染、state 和 props 開始，看懂畫面為什麼會變。', 760, 'video', 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'),
  ('d2531bf3-d447-40cb-a907-4bd66c111002', 'c2531bf3-d447-40cb-a907-4bd66c111001', 2, 'useEffect 與 API 資料', '練習用 useEffect 取得資料，並處理中止請求和競態問題。', 920, 'video', 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'),
  ('d2531bf3-d447-40cb-a907-4bd66c111003', 'c2531bf3-d447-40cb-a907-4bd66c111001', 3, '把重複邏輯整理成 Hook', '把重複的資料請求和狀態整理成可以重用的自訂 Hook。', 1085, 'video', 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'),
  ('d2531bf3-d447-40cb-a907-4bd66c111004', 'c2531bf3-d447-40cb-a907-4bd66c111001', 4, 'Context 適合放什麼狀態', '用幾個常見情境判斷哪些狀態該放 Context，哪些不用。', 1335, 'video', 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'),
  ('d2531bf3-d447-40cb-a907-4bd66c111005', 'c2531bf3-d447-40cb-a907-4bd66c111002', 1, '找出會影響決策的產品指標', '從北極星指標開始，分辨哪些數字真的能幫助團隊做決定。', 840, 'video', 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'),
  ('d2531bf3-d447-40cb-a907-4bd66c111006', 'c2531bf3-d447-40cb-a907-4bd66c111003', 1, '把使用者觀察整理成設計方向', '把訪談和觀察整理成假設，再轉成下一版產品可以採用的方向。', 780, 'video', 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4')
ON CONFLICT (id) DO UPDATE SET
  chapter_id = EXCLUDED.chapter_id,
  position = EXCLUDED.position,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  duration_seconds = EXCLUDED.duration_seconds,
  content_type = EXCLUDED.content_type,
  video_url = EXCLUDED.video_url;

UPDATE lessons
SET video_asset_id = 'f2531bf3-d447-40cb-a907-4bd66c111001'
WHERE id IN (
  'd2531bf3-d447-40cb-a907-4bd66c111001',
  'd2531bf3-d447-40cb-a907-4bd66c111002',
  'd2531bf3-d447-40cb-a907-4bd66c111003',
  'd2531bf3-d447-40cb-a907-4bd66c111004',
  'd2531bf3-d447-40cb-a907-4bd66c111005',
  'd2531bf3-d447-40cb-a907-4bd66c111006'
);

INSERT INTO lesson_resources (id, lesson_id, position, title, kind, download_url, size_bytes)
VALUES
  ('e2531bf3-d447-40cb-a907-4bd66c111001', 'd2531bf3-d447-40cb-a907-4bd66c111002', 1, 'useFetch.ts 範例檔', 'code', 'https://raw.githubusercontent.com/microsoft/TypeScript/main/README.md', 1024)
ON CONFLICT (id) DO NOTHING;

UPDATE lesson_resources
SET content_asset_id = 'f2531bf3-d447-40cb-a907-4bd66c111002'
WHERE id = 'e2531bf3-d447-40cb-a907-4bd66c111001';

COMMIT;

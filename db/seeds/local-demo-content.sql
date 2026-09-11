-- Local development seed only. Do not run against production.
-- Contains no user accounts, passwords, or enrollments.

BEGIN;

INSERT INTO courses (id, slug, title, summary, category, instructor_name, cover_image_url, status)
VALUES
  ('b2531bf3-d447-40cb-a907-4bd66c111001', 'react-architecture', 'React 全端工程師培養課程', '從 React 核心心智模型到非同步狀態管理，建立可維護的前端架構能力。', '軟體工程', '林育賢', 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=1200&q=80', 'published'),
  ('b2531bf3-d447-40cb-a907-4bd66c111002', 'product-analytics', '產品數據分析實戰：從指標到決策', '從指標設計、資料解讀到產品決策，建立實用的分析方法。', '資料分析', '陳怡安', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80', 'published'),
  ('b2531bf3-d447-40cb-a907-4bd66c111003', 'ux-design', 'UX 策略與產品設計工作流', '以研究、策略與設計系統串連出能推動產品的設計流程。', '設計職能', '黃子庭', 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?auto=format&fit=crop&w=1200&q=80', 'published')
ON CONFLICT (id) DO NOTHING;

INSERT INTO chapters (id, course_id, position, title)
VALUES
  ('c2531bf3-d447-40cb-a907-4bd66c111001', 'b2531bf3-d447-40cb-a907-4bd66c111001', 1, '第 8 章：深入 Hooks 與非同步狀態管理'),
  ('c2531bf3-d447-40cb-a907-4bd66c111002', 'b2531bf3-d447-40cb-a907-4bd66c111002', 1, '第 1 章：從問題到可用指標'),
  ('c2531bf3-d447-40cb-a907-4bd66c111003', 'b2531bf3-d447-40cb-a907-4bd66c111003', 1, '第 1 章：建立有方向的設計流程')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lessons (id, chapter_id, position, title, description, duration_seconds, content_type, video_url)
VALUES
  ('d2531bf3-d447-40cb-a907-4bd66c111001', 'c2531bf3-d447-40cb-a907-4bd66c111001', 1, 'React 核心心智模型', '從元件渲染、state 與 props 的關係開始，建立判斷 UI 變化的核心心智模型。', 760, 'video', 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'),
  ('d2531bf3-d447-40cb-a907-4bd66c111002', 'c2531bf3-d447-40cb-a907-4bd66c111001', 2, 'useEffect 與 API 整合', '理解 useEffect 的生命週期，並實作安全的非同步請求、中止與競態預防。', 920, 'video', 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'),
  ('d2531bf3-d447-40cb-a907-4bd66c111003', 'c2531bf3-d447-40cb-a907-4bd66c111001', 3, '自訂 Hook 封裝技巧', '把重複的資料請求與狀態管理收斂為可重複使用的自訂 Hook。', 1085, 'video', 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'),
  ('d2531bf3-d447-40cb-a907-4bd66c111004', 'c2531bf3-d447-40cb-a907-4bd66c111001', 4, '全域狀態管理與 Context', '掌握 Context 的適用情境，並評估全域狀態的模組邊界。', 1335, 'video', 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'),
  ('d2531bf3-d447-40cb-a907-4bd66c111005', 'c2531bf3-d447-40cb-a907-4bd66c111002', 1, '找出真正影響決策的產品指標', '從北極星指標出發，辨識能反映產品價值與使用者行為的關鍵數據。', 840, 'video', 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'),
  ('d2531bf3-d447-40cb-a907-4bd66c111006', 'c2531bf3-d447-40cb-a907-4bd66c111003', 1, '從使用者洞察到設計策略', '將研究觀察整理成可推進產品設計的清晰假設與策略。', 780, 'video', 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lesson_resources (id, lesson_id, position, title, kind, download_url, size_bytes)
VALUES
  ('e2531bf3-d447-40cb-a907-4bd66c111001', 'd2531bf3-d447-40cb-a907-4bd66c111002', 1, 'useFetch.ts 範例檔', 'code', 'https://raw.githubusercontent.com/microsoft/TypeScript/main/README.md', 1024)
ON CONFLICT (id) DO NOTHING;

COMMIT;

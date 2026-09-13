BEGIN;

UPDATE courses
SET
  title = 'React 前端實戰：從畫面到資料流',
  summary = '從元件、state、props 到 API 資料流，練習把前端架構拆清楚。'
WHERE id = 'b2531bf3-d447-40cb-a907-4bd66c111001';

UPDATE courses
SET
  title = '產品數據分析實戰：從指標到決策',
  summary = '學會設計指標、讀懂數據，再把分析結果變成產品決策。'
WHERE id = 'b2531bf3-d447-40cb-a907-4bd66c111002';

UPDATE courses
SET
  title = 'UX 設計流程：從研究到產品決策',
  summary = '把訪談、觀察和設計系統串起來，做出能落地的產品方案。'
WHERE id = 'b2531bf3-d447-40cb-a907-4bd66c111003';

UPDATE chapters
SET title = '第 1 章：Hooks 與非同步資料'
WHERE id = 'c2531bf3-d447-40cb-a907-4bd66c111001';

UPDATE chapters
SET title = '第 1 章：把研究變成設計方向'
WHERE id = 'c2531bf3-d447-40cb-a907-4bd66c111003';

UPDATE lessons
SET
  title = 'React 怎麼更新畫面',
  description = '從元件渲染、state 和 props 開始，看懂畫面為什麼會變。'
WHERE id = 'd2531bf3-d447-40cb-a907-4bd66c111001';

UPDATE lessons
SET
  title = 'useEffect 與 API 資料',
  description = '練習用 useEffect 取得資料，並處理中止請求和競態問題。'
WHERE id = 'd2531bf3-d447-40cb-a907-4bd66c111002';

UPDATE lessons
SET
  title = '把重複邏輯整理成 Hook',
  description = '把重複的資料請求和狀態整理成可以重用的自訂 Hook。'
WHERE id = 'd2531bf3-d447-40cb-a907-4bd66c111003';

UPDATE lessons
SET
  title = 'Context 適合放什麼狀態',
  description = '用幾個常見情境判斷哪些狀態該放 Context，哪些不用。'
WHERE id = 'd2531bf3-d447-40cb-a907-4bd66c111004';

UPDATE lessons
SET
  title = '找出會影響決策的產品指標',
  description = '從北極星指標開始，分辨哪些數字真的能幫助團隊做決定。'
WHERE id = 'd2531bf3-d447-40cb-a907-4bd66c111005';

UPDATE lessons
SET
  title = '把使用者觀察整理成設計方向',
  description = '把訪談和觀察整理成假設，再轉成下一版產品可以採用的方向。'
WHERE id = 'd2531bf3-d447-40cb-a907-4bd66c111006';

COMMIT;

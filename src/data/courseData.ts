export interface Course {
  id: string
  category: string
  title: string
  instructor: string
  learners: string
  progress?: number
  tone: 'blue' | 'teal' | 'cyan'
}

export const featuredCourses: Course[] = [
  { id: 'react-architecture', category: '軟體工程', title: 'React 全端工程師培養課程', instructor: '林育賢', learners: '1,248 人學習中', tone: 'blue' },
  { id: 'product-analytics', category: '資料分析', title: '產品數據分析實戰：從指標到決策', instructor: '陳怡安', learners: '862 人學習中', tone: 'teal' },
  { id: 'ux-design', category: '設計職能', title: 'UX 策略與產品設計工作流', instructor: '黃子庭', learners: '736 人學習中', tone: 'cyan' },
]

export const learningPoints = [
  { title: 'Race Condition 預防', description: '釐清非同步請求交錯時，如何避免舊資料覆蓋新狀態。' },
  { title: 'AbortController 整合', description: '在元件卸載或請求切換時，中止不需要的 API 呼叫。' },
  { title: '自訂 Hook 模組化', description: '把常用的資料請求邏輯收斂成可重複使用的介面。' },
]

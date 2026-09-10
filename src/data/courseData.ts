export interface Course {
  id: string
  category: string
  title: string
  instructor: string
  learners: string
  progress?: number
  tone: 'blue' | 'teal' | 'cyan'
}

export interface Lesson {
  id: string
  chapter: string
  title: string
  duration: string
  durationMinutes: number
}

export const reactCourse = {
  id: 'react-architecture',
  title: 'React 全端工程師培養課程',
  chapter: '第 8 章：深入 Hooks 與非同步狀態管理',
  lessons: [
    { id: '8-1', chapter: '第 8 章 · 單元 1', title: 'React 核心心智模型', duration: '12:40', durationMinutes: 13 },
    { id: '8-2', chapter: '第 8 章 · 單元 2', title: 'useEffect 與 API 整合', duration: '15:20', durationMinutes: 15 },
    { id: '8-3', chapter: '第 8 章 · 單元 3', title: '自訂 Hook 封裝技巧', duration: '18:05', durationMinutes: 18 },
    { id: '8-4', chapter: '第 8 章 · 單元 4', title: '全域狀態管理與 Context', duration: '22:15', durationMinutes: 22 },
  ] satisfies Lesson[],
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

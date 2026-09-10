import { useState } from 'react'
import { SiteHeader } from '../../components/SiteHeader'
import { Button } from '../../components/ui/Button'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { learningPoints } from '../../data/courseData'
import './lessonPlayer.css'

const lessons = [
  { id: '8-1', title: 'React 核心心智模型', duration: '12:40', status: 'done' },
  { id: '8-2', title: 'useEffect 與 API 整合', duration: '15:20', status: 'active' },
  { id: '8-3', title: '自訂 Hook 封裝技巧', duration: '18:05', status: 'open' },
  { id: '8-4', title: '全域狀態管理與 Context', duration: '22:15', status: 'open' },
]

export function LessonPlayerPage() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [notice, setNotice] = useState('')
  const completion = isComplete ? 50 : 42

  const handleComplete = () => {
    setIsComplete((current) => !current)
    setNotice(isComplete ? '已恢復為進行中。' : '已標記完成，進度已同步更新。')
  }

  return (
    <div className="lesson-page">
      <a className="skip-link" href="#lesson-content">跳至主要內容</a>
      <SiteHeader mode="player" />
      <main id="lesson-content" className="lesson-shell">
        <nav className="breadcrumbs" aria-label="麵包屑"><a href="#home">我的課程</a><span>/</span><a href="#home">React 全端工程師培養課程</a><span>/</span><span>第 8 章</span></nav>
        <div className="lesson-layout">
          <section className="lesson-main" aria-labelledby="lesson-title">
            <div className={`player ${isPlaying ? 'player--playing' : ''}`}>
              <div className="player__top"><span>LESSON 8.2</span><span>React 18 Architecture Masterclass</span></div>
              <div className="code-window" aria-hidden="true"><div className="code-window__bar" /><code>useEffect(() =&gt; {'{'}<br />&nbsp;&nbsp;const controller = new AbortController();<br />&nbsp;&nbsp;fetchData({'{'} signal: controller.signal {'}'});<br />&nbsp;&nbsp;return () =&gt; controller.abort();<br />{'}'}, [endpoint]);</code></div>
              <div className="mentor-card"><div className="mentor-card__glow" /><span>講師引導</span><strong>Sophia</strong></div>
              <button className="play-button" type="button" aria-label={isPlaying ? '暫停影片' : '播放影片'} onClick={() => setIsPlaying((playing) => !playing)}><i /></button>
              <div className="player__controls"><div className="player__timeline"><span style={{ width: isPlaying ? '52%' : '42%' }} /></div><div><span>{isPlaying ? '07:52' : '06:42'} / 15:20</span><span>1.25x　1080p</span></div></div>
            </div>
            <div className="lesson-content">
              <div className="lesson-content__heading"><div><p>第 8 章 · 單元 2　·　15 分鐘 · 影片課程</p><h1 id="lesson-title">useEffect 與 API 整合</h1></div><Button variant={isComplete ? 'secondary' : 'primary'} onClick={handleComplete}>{isComplete ? '已標記完成' : '標記為已完成'}</Button></div>
              {notice && <p className="lesson-notice" role="status">{notice}</p>}
              <p className="lesson-content__summary">本單元深入探討 React 18 中的 useEffect 生命週期機制，示範如何安全處理非同步 API 請求、快取策略與 AbortController 競態預防，並封裝成高效的可複用自訂 Hook。</p>
              <section className="points-grid" aria-label="核心學習要點">{learningPoints.map((point) => <article key={point.title}><span aria-hidden="true" /><h2>{point.title}</h2><p>{point.description}</p></article>)}</section>
              <section className="resource-card"><div className="resource-card__file" aria-hidden="true">JS</div><div><h2>章節講義與範例代碼</h2><p>useFetch.ts 範例與完整測試案例（ZIP，3.2 MB）</p></div><button type="button">下載資源包</button></section>
              <nav className="lesson-pager" aria-label="單元導覽"><a href="#lesson">← 上一單元：React 核心心智模型</a><button type="button" onClick={() => setNotice('下一單元已準備好，正式串接路由後即可帶入下一支影片。')}>下一單元：自訂 Hook 封裝技巧 →</button></nav>
            </div>
          </section>
          <aside className="course-outline" aria-label="課程大綱">
            <div className="course-outline__head"><div><p>課程大綱目錄</p><h2>React 全端實戰課程</h2></div><span>{completion}% 完成度</span></div>
            <ProgressBar value={completion} label={`課程完成進度 ${completion}%`} size="small" />
            <div className="outline-chapter"><div className="outline-chapter__title"><span>第 8 章：深入 Hooks 與非同步狀態管理</span><span>4 單元</span></div>{lessons.map((lesson) => { const lessonStatus = lesson.status === 'active' && isComplete ? 'done' : lesson.status; return <button type="button" className={`outline-lesson outline-lesson--${lessonStatus}`} key={lesson.id} onClick={() => setNotice(`已選取 ${lesson.id} ${lesson.title}。`)}><span className="outline-lesson__mark" aria-hidden="true" /> <span>{lesson.id} {lesson.title}</span><time>{lesson.duration}</time></button> })}</div>
            <button type="button" className="collapsed-chapter">第 9 章：客製化 Hook 架構設計 <span>⌄</span></button>
          </aside>
        </div>
      </main>
    </div>
  )
}

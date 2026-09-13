import { useCallback, useEffect, useRef, useState } from 'react'
import type { LessonDetail } from '../../contracts/learning'
import { formatPlaybackTime } from '../learning/formatPlaybackTime'
import './lessonVideoPlayer.css'

export interface LessonStartGate {
  actionLabel: string
  description: string
  error?: string
  eyebrow: string
  isPending?: boolean
  onAction: () => boolean | Promise<boolean>
  pendingLabel?: string
  title: string
}

interface LessonVideoPlayerProps {
  lesson: Pick<LessonDetail, 'id' | 'title' | 'videoUrl'>
  isLoadingProgress: boolean
  isRefreshingSource: boolean
  savedPositionSeconds: number
  startGate: LessonStartGate | null
  onEnded: () => void
  onPause: () => void
  onPositionChange: (seconds: number) => void
  onRefreshSource: () => void
}

export function LessonVideoPlayer({ lesson, isLoadingProgress, isRefreshingSource, savedPositionSeconds, startGate, onEnded, onPause, onPositionChange, onRefreshSource }: LessonVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const lastSavedPosition = useRef(Math.floor(savedPositionSeconds))
  const hasRestoredPosition = useRef(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasMediaError, setHasMediaError] = useState(false)
  const [isRestoringPosition, setIsRestoringPosition] = useState(savedPositionSeconds > 0)
  const [isStartingLearning, setIsStartingLearning] = useState(false)

  useEffect(() => {
    lastSavedPosition.current = Math.floor(savedPositionSeconds)
    hasRestoredPosition.current = false
    setIsPlaying(false)
    setHasMediaError(false)
    setIsRestoringPosition(savedPositionSeconds > 0)
    setIsStartingLearning(false)
  }, [lesson.id, lesson.videoUrl])

  const restoreSavedPosition = useCallback(() => {
    const video = videoRef.current
    if (!video || isLoadingProgress || video.readyState < HTMLMediaElement.HAVE_METADATA || hasRestoredPosition.current) {
      return
    }

    if (savedPositionSeconds <= 0 || savedPositionSeconds >= video.duration) {
      hasRestoredPosition.current = true
      setIsRestoringPosition(false)
      return
    }

    if (Math.abs(video.currentTime - savedPositionSeconds) < 0.5) {
      hasRestoredPosition.current = true
      setIsRestoringPosition(false)
      return
    }

    setIsRestoringPosition(true)
    video.currentTime = savedPositionSeconds
  }, [isLoadingProgress, savedPositionSeconds])

  useEffect(() => {
    restoreSavedPosition()
  }, [restoreSavedPosition])

  const handleTimeUpdate = () => {
    const video = videoRef.current
    if (!video) {
      return
    }

    const positionSeconds = Math.floor(video.currentTime)
    if (positionSeconds === lastSavedPosition.current) {
      return
    }

    lastSavedPosition.current = positionSeconds
    onPositionChange(positionSeconds)
  }

  const handleTogglePlayback = () => {
    const video = videoRef.current
    if (!video || startGate || isLoadingProgress || isRestoringPosition) {
      return
    }

    if (video.paused) {
      void video.play()
      return
    }

    video.pause()
  }

  const handleRetry = () => {
    setHasMediaError(false)
    onRefreshSource()
  }

  const handleEnded = () => {
    handleTimeUpdate()
    onEnded()
  }

  const handlePause = () => {
    setIsPlaying(false)
    if (videoRef.current?.ended) return
    handleTimeUpdate()
    onPause()
  }

  const handleSeeked = () => {
    if (!isRestoringPosition) return
    hasRestoredPosition.current = true
    setIsRestoringPosition(false)
  }

  const handleStartLearning = async () => {
    if (!startGate || isStartingLearning || startGate.isPending) return
    setIsStartingLearning(true)

    try {
      const shouldPlay = await startGate.onAction()
      if (shouldPlay) {
        await videoRef.current?.play().catch(() => undefined)
      }
    } finally {
      setIsStartingLearning(false)
    }
  }

  const isPreparingPlayback = Boolean(startGate) || isLoadingProgress || isRestoringPosition
  const isGatePending = isStartingLearning || startGate?.isPending

  return (
    <div className={`player lesson-video-player ${isPlaying ? 'player--playing' : ''}`}>
      <video
        key={`${lesson.id}:${lesson.videoUrl}`}
        ref={videoRef}
        className="lesson-video-player__media"
        controls={!isPreparingPlayback}
        playsInline
        preload="metadata"
        onEnded={handleEnded}
        onError={() => setHasMediaError(true)}
        onLoadedMetadata={restoreSavedPosition}
        onPause={handlePause}
        onPlay={() => setIsPlaying(true)}
        onSeeked={handleSeeked}
        onTimeUpdate={handleTimeUpdate}
      >
        <source src={lesson.videoUrl} type="video/mp4" />
        你的瀏覽器不支援影片播放。
      </video>
      <div className="player__top"><span>LESSON {lesson.id}</span><span>{formatPlaybackTime(savedPositionSeconds)} 已觀看</span></div>
      {!hasMediaError && !isPreparingPlayback && <button className="play-button" type="button" aria-label={isPlaying ? '暫停影片' : '播放影片'} onClick={handleTogglePlayback}><i /></button>}
      {!hasMediaError && startGate && <div className="lesson-video-player__gate"><div><span className="lesson-video-player__gate-eyebrow">{startGate.eyebrow}</span><h2>{startGate.title}</h2><p>{startGate.description}</p>{startGate.error && <p className="lesson-video-player__gate-error" role="alert">{startGate.error}</p>}<button type="button" disabled={isGatePending} onClick={() => void handleStartLearning()}>{isGatePending ? startGate.pendingLabel ?? '處理中…' : startGate.actionLabel}</button></div></div>}
      {!hasMediaError && !startGate && (isLoadingProgress || isRestoringPosition) && <div className="lesson-video-player__restoring" role="status"><span aria-hidden="true" /><p>{isLoadingProgress ? '正在取得上次進度…' : '正在回到上次看到的位置…'}</p></div>}
      {hasMediaError && <div className="lesson-video-player__error" role="alert"><p>影片授權可能已過期，請重新取得播放連結。</p><button type="button" disabled={isRefreshingSource} onClick={handleRetry}>{isRefreshingSource ? '重新取得中…' : '重新取得播放連結'}</button></div>}
    </div>
  )
}

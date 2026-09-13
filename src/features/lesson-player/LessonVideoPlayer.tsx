import { useEffect, useRef, useState } from 'react'
import type { LessonDetail } from '../../contracts/learning'
import { formatPlaybackTime } from '../learning/formatPlaybackTime'
import './lessonVideoPlayer.css'

interface LessonVideoPlayerProps {
  lesson: Pick<LessonDetail, 'id' | 'title' | 'videoUrl'>
  isRefreshingSource: boolean
  savedPositionSeconds: number
  onEnded: () => void
  onPause: () => void
  onPositionChange: (seconds: number) => void
  onRefreshSource: () => void
}

export function LessonVideoPlayer({ lesson, isRefreshingSource, savedPositionSeconds, onEnded, onPause, onPositionChange, onRefreshSource }: LessonVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const lastSavedPosition = useRef(Math.floor(savedPositionSeconds))
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasMediaError, setHasMediaError] = useState(false)

  useEffect(() => {
    lastSavedPosition.current = Math.floor(savedPositionSeconds)
    setIsPlaying(false)
    setHasMediaError(false)
  }, [lesson.id, lesson.videoUrl])

  const handleLoadedMetadata = () => {
    const video = videoRef.current
    if (!video || savedPositionSeconds <= 0 || savedPositionSeconds >= video.duration) {
      return
    }

    video.currentTime = savedPositionSeconds
  }

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
    if (!video) {
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
    handleTimeUpdate()
    onPause()
  }

  return (
    <div className={`player lesson-video-player ${isPlaying ? 'player--playing' : ''}`}>
      <video
        key={`${lesson.id}:${lesson.videoUrl}`}
        ref={videoRef}
        className="lesson-video-player__media"
        controls
        playsInline
        preload="metadata"
        onEnded={handleEnded}
        onError={() => setHasMediaError(true)}
        onLoadedMetadata={handleLoadedMetadata}
        onPause={handlePause}
        onPlay={() => setIsPlaying(true)}
        onTimeUpdate={handleTimeUpdate}
      >
        <source src={lesson.videoUrl} type="video/mp4" />
        你的瀏覽器不支援影片播放。
      </video>
      <div className="player__top"><span>LESSON {lesson.id}</span><span>{formatPlaybackTime(savedPositionSeconds)} 已觀看</span></div>
      {!hasMediaError && <button className="play-button" type="button" aria-label={isPlaying ? '暫停影片' : '播放影片'} onClick={handleTogglePlayback}><i /></button>}
      {hasMediaError && <div className="lesson-video-player__error" role="alert"><p>影片授權可能已過期，請重新取得播放連結。</p><button type="button" disabled={isRefreshingSource} onClick={handleRetry}>{isRefreshingSource ? '重新取得中…' : '重新取得播放連結'}</button></div>}
    </div>
  )
}

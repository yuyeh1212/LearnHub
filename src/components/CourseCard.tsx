import type { CourseSummary } from '../contracts/learning'

interface CourseCardProps {
  course: CourseSummary
}

const tones = ['blue', 'teal', 'cyan'] as const

function getCourseTone(courseId: string) {
  const characterTotal = [...courseId].reduce((total, character) => total + character.charCodeAt(0), 0)
  return tones[characterTotal % tones.length]
}

export function CourseCard({ course }: CourseCardProps) {
  const learnerLabel = course.learnerCount
    ? `${new Intl.NumberFormat('zh-TW').format(course.learnerCount)} 人學習中`
    : '最新上架'

  return (
    <article className="course-card">
      <div className={`course-art course-art--${getCourseTone(course.id)}`}>
        <span>{course.category}</span>
        <div className="course-art__lines" aria-hidden="true"><i /><i /><i /></div>
        <div className="course-art__module" aria-hidden="true" />
      </div>
      <div className="course-card__body">
        <p className="course-card__meta">{course.category}</p>
        <h3>{course.title}</h3>
        <p className="course-card__instructor">講師 {course.instructorName}</p>
        <div className="course-card__footer">
          <span>{learnerLabel}</span>
          <a href={`#lesson/${course.id}`} aria-label={`開始 ${course.title}`}>開始學習 →</a>
        </div>
      </div>
    </article>
  )
}

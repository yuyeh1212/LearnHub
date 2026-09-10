import type { Course } from '../data/courseData'

interface CourseCardProps {
  course: Course
}

export function CourseCard({ course }: CourseCardProps) {
  return (
    <article className="course-card">
      <div className={`course-art course-art--${course.tone}`}>
        <span>{course.category}</span>
        <div className="course-art__lines" aria-hidden="true"><i /><i /><i /></div>
        <div className="course-art__module" aria-hidden="true" />
      </div>
      <div className="course-card__body">
        <p className="course-card__meta">{course.category}</p>
        <h3>{course.title}</h3>
        <p className="course-card__instructor">講師 {course.instructor}</p>
        <div className="course-card__footer">
          <span>{course.learners}</span>
          <a href="#lesson" aria-label={`開始 ${course.title}`}>開始學習 →</a>
        </div>
      </div>
    </article>
  )
}

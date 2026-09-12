const apiBaseUrl = process.env.PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001/api/v1'
const lessonId = process.env.CONTENT_VERIFY_LESSON_ID ?? 'd2531bf3-d447-40cb-a907-4bd66c111002'

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const lessonResponse = await fetch(`${apiBaseUrl}/lessons/${lessonId}`)
assert(lessonResponse.ok, `Lesson request failed with ${lessonResponse.status}`)

const lesson = await lessonResponse.json()
assert(lesson.videoUrl, 'Lesson response has no video URL')
assert(lesson.videoAccessExpiresAt, 'Lesson response has no video expiration time')
assert(lesson.resources?.length > 0, 'Lesson response has no downloadable resource')

const videoUrl = new URL(lesson.videoUrl)
const videoResponse = await fetch(videoUrl, { headers: { Range: 'bytes=0-1023' } })
assert([200, 206].includes(videoResponse.status), `Video request failed with ${videoResponse.status}`)
assert(videoResponse.headers.get('content-type')?.startsWith('video/mp4'), 'Video content type is not video/mp4')
const videoBytes = (await videoResponse.arrayBuffer()).byteLength
assert(videoBytes > 0, 'Video response is empty')

const resource = lesson.resources[0]
assert(resource.downloadUrl, 'Resource has no download URL')
assert(resource.accessExpiresAt, 'Resource has no expiration time')
const resourceUrl = new URL(resource.downloadUrl)
const resourceResponse = await fetch(resourceUrl)
assert(resourceResponse.ok, `Resource request failed with ${resourceResponse.status}`)
const resourceText = await resourceResponse.text()
assert(resourceText.includes('useFetch'), 'Resource content does not match the expected fixture')

console.info(JSON.stringify({
  lessonId,
  resourcePath: resourceUrl.pathname,
  resourceStatus: resourceResponse.status,
  videoBytes,
  videoPath: videoUrl.pathname,
  videoStatus: videoResponse.status,
}))

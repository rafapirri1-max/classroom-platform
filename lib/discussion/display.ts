export function formatDiscussionDisplayLabel(
  anonymous: boolean,
  responseNumber: number,
  studentName: string
): string {
  if (anonymous) {
    return `Response #${responseNumber}`
  }
  return studentName.trim() || 'Student'
}

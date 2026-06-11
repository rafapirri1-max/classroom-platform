export const WORDCLOUD_ACTIVITY_ID = 'wordcloud'

export const DEFAULT_WORDCLOUD_MAX_ANSWER_LENGTH = 40

export type WordCloudPhase = 'collecting' | 'revealed'

export type WordCloudLaunchConfig = {
  type: 'wordcloud'
  question: string
  phase: WordCloudPhase
  maxAnswerLength: number
}

export type WordCloudMyResponsePayload = {
  id: string
  answer_text: string
  created_at: string
}

export type WordCloudTeacherResponseItem = {
  id: string
  answer_text: string
  display_label: string
  created_at: string
}

export type WordCloudResponsesPayload = {
  activity_instance_id: string
  question: string
  phase: WordCloudPhase
  response_count: number
  responses: WordCloudTeacherResponseItem[]
}

export type WordCloudAggregateWord = {
  text: string
  count: number
}

export type WordCloudAggregatePayload = {
  activity_instance_id: string
  question: string
  phase: WordCloudPhase
  response_count: number
  words: WordCloudAggregateWord[] | null
}

export type WordCloudPlacedWord = {
  text: string
  count: number
  fontSize: number
  color: string
  left: number
  top: number
  rotation: number
}

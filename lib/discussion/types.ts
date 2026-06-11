export const DISCUSSION_ACTIVITY_ID = 'discussion'

export type DiscussionPhase = 'collecting' | 'voting' | 'results'

export type DiscussionLaunchConfig = {
  type: 'discussion'
  question: string
  anonymous: boolean
  selectedResponseId: string | null
  phase: DiscussionPhase
}

export type DiscussionResponseRow = {
  id: string
  student_id: string
  response_number: number
  display_label: string
  response_text: string
  created_at: string
}

export type DiscussionResponsesPayload = {
  activity_instance_id: string
  question: string
  anonymous: boolean
  phase: DiscussionPhase
  selectedResponseId: string | null
  responses: DiscussionResponseRow[]
}

export type DiscussionComparisonSide = {
  id: string
  response_number: number
  display_label: string
  response_text: string
}

export type DiscussionVotePairPayload = {
  activity_instance_id: string
  phase: DiscussionPhase
  left: DiscussionComparisonSide
  right: DiscussionComparisonSide
  canonical_left_id: string
  canonical_right_id: string
}

export type DiscussionVoteResultRow = {
  response_id: string
  response_number: number
  display_label: string
  response_text: string
  vote_count: number
}

export type DiscussionVoteResultsPayload = {
  activity_instance_id: string
  phase: DiscussionPhase
  question: string
  anonymous: boolean
  total_votes_cast: number
  response_count: number
  results: DiscussionVoteResultRow[]
}

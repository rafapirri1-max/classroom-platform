export const POLL_ACTIVITY_ID = 'poll'

export type PollOption = {
  id: string
  label: string
}

export type PollLaunchConfig = {
  type: 'poll'
  question: string
  options: PollOption[]
  allowMultiple: boolean
}

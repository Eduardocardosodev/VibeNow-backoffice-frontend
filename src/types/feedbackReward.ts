export interface FeedbackRewardConfig {
  enabled: boolean
  message: string | null
}

export interface PatchFeedbackRewardBody {
  enabled?: boolean
  message?: string | null
}

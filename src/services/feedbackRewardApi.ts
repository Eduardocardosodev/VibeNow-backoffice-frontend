import { apiGetJson, apiPatchJson } from '@/lib/apiClient'
import type {
  FeedbackRewardConfig,
  PatchFeedbackRewardBody,
} from '@/types/feedbackReward'

function normalize(raw: unknown): FeedbackRewardConfig {
  if (!raw || typeof raw !== 'object') {
    return { enabled: false, message: null }
  }
  const o = raw as Record<string, unknown>
  return {
    enabled: Boolean(o.enabled),
    message: o.message == null || o.message === '' ? null : String(o.message),
  }
}

export async function fetchFeedbackReward(
  establishmentId: number,
): Promise<FeedbackRewardConfig> {
  const raw = await apiGetJson<unknown>(
    `/establishments/${establishmentId}/feedback-reward`,
  )
  return normalize(raw)
}

export async function patchFeedbackReward(
  establishmentId: number,
  body: PatchFeedbackRewardBody,
): Promise<FeedbackRewardConfig> {
  const raw = await apiPatchJson<unknown>(
    `/establishments/${establishmentId}/feedback-reward`,
    body,
  )
  return normalize(raw)
}

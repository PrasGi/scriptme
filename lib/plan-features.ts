/**
 * Returns the plan's features list for display on billing and LP.
 * Features are set by admin (e.g. via "Generate features from limits" then edit) and stored in plan.features.
 */

export interface PlanForDisplay {
  features?: string[];
}

/**
 * Returns features to show for this plan (non-empty strings from plan.features).
 */
export function getDisplayFeatures(plan: PlanForDisplay | null | undefined): string[] {
  if (!plan) return [];
  return (plan.features ?? []).filter((f) => typeof f === 'string' && f.trim().length > 0);
}

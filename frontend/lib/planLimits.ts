/**
 * lib/planLimits.ts
 * Free vs Pro plan limits and enforcement helpers.
 */

export type Plan = 'free' | 'pro';

export const PLAN_LIMITS = {
  free: {
    maxKeywords: 1,
    articlesPerKeyword: 5,
    bookmarksEnabled: false,
  },
  pro: {
    maxKeywords: 5,
    articlesPerKeyword: 20,
    bookmarksEnabled: true,
  },
} as const;

export function getPlanLimits(plan: Plan) {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

export function canAddMoreKeywords(plan: Plan, currentCount: number): boolean {
  return currentCount < getPlanLimits(plan).maxKeywords;
}

export function canUseBookmarks(plan: Plan): boolean {
  return getPlanLimits(plan).bookmarksEnabled;
}

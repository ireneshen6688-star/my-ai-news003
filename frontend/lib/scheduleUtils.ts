/**
 * lib/scheduleUtils.ts
 * Utilities for computing next_run_at and time windows for digest subscriptions.
 * All times stored as Unix epoch seconds (INTEGER) in D1.
 */

export type Frequency = 'daily' | 'weekly' | 'monthly';

export interface SubscriptionSchedule {
  frequency: Frequency;
  /** 0=Sun … 6=Sat — used for weekly */
  weekday?: number | null;
  /** 1–28 — used for monthly */
  month_date?: number | null;
  /** 0–23 */
  send_hour: number;
  /** 0–59 */
  send_minute: number;
}

/**
 * Compute the next UTC epoch (seconds) at which this subscription should fire,
 * starting from `afterEpoch` (defaults to now).
 *
 * Strategy:
 *   - Build a candidate Date in UTC using the subscription's hour/minute.
 *   - Advance day by day (for daily), week by week, or month by month
 *     until we find a slot that is strictly AFTER afterEpoch.
 *
 * NOTE: send_hour/send_minute are treated as UTC for simplicity at MVP stage.
 * (User timezone support can be added later by storing a tz offset.)
 */
export function computeNextRunAt(
  schedule: SubscriptionSchedule,
  afterEpoch: number = Math.floor(Date.now() / 1000),
): number {
  const { frequency, weekday, month_date, send_hour, send_minute } = schedule;
  const h = send_hour ?? 8;
  const m = send_minute ?? 0;

  // Start from the next whole minute after afterEpoch
  const afterMs = afterEpoch * 1000;

  if (frequency === 'daily') {
    // Next occurrence of HH:MM UTC, at least 1 minute from now
    const candidate = new Date(afterMs);
    candidate.setUTCHours(h, m, 0, 0);
    if (candidate.getTime() <= afterMs) {
      candidate.setUTCDate(candidate.getUTCDate() + 1);
    }
    return Math.floor(candidate.getTime() / 1000);
  }

  if (frequency === 'weekly') {
    const targetDay = weekday ?? 1; // default Monday
    const candidate = new Date(afterMs);
    candidate.setUTCHours(h, m, 0, 0);
    // Advance until we hit the right weekday AND it's after afterMs
    for (let i = 0; i < 8; i++) {
      if (candidate.getUTCDay() === targetDay && candidate.getTime() > afterMs) {
        return Math.floor(candidate.getTime() / 1000);
      }
      candidate.setUTCDate(candidate.getUTCDate() + 1);
    }
    // Fallback: shouldn't happen
    return Math.floor(candidate.getTime() / 1000);
  }

  if (frequency === 'monthly') {
    const targetDate = month_date ?? 1;
    const candidate = new Date(afterMs);
    candidate.setUTCHours(h, m, 0, 0);
    candidate.setUTCDate(targetDate);
    if (candidate.getTime() <= afterMs) {
      // Advance to next month
      candidate.setUTCMonth(candidate.getUTCMonth() + 1);
      candidate.setUTCDate(targetDate);
    }
    return Math.floor(candidate.getTime() / 1000);
  }

  // Fallback: 24h from now
  return afterEpoch + 86400;
}

/**
 * Compute the time window [start, end] (epoch seconds) for a digest run.
 *
 * Rules:
 *  - If last_successful_run_at is set → window = [last_successful_run_at, now]
 *  - Otherwise (first run) → window = [now - defaultWindow, now]
 *  - Cap the window at maxWindow to avoid huge catch-up runs after long outages.
 */
export interface TimeWindow {
  start: number; // epoch seconds
  end: number;   // epoch seconds
}

const DEFAULT_WINDOWS: Record<Frequency, number> = {
  daily: 86400,       // 1 day
  weekly: 7 * 86400,  // 7 days
  monthly: 30 * 86400, // 30 days
};

// Hard cap: max window even after failures / first run
const MAX_WINDOWS: Record<Frequency, number> = {
  daily: 2 * 86400,
  weekly: 14 * 86400,
  monthly: 60 * 86400,
};

export function computeTimeWindow(
  frequency: Frequency,
  lastSuccessfulRunAt: number | null | undefined,
  nowEpoch: number = Math.floor(Date.now() / 1000),
): TimeWindow {
  const maxWindow = MAX_WINDOWS[frequency];
  const defaultWindow = DEFAULT_WINDOWS[frequency];

  let start: number;

  if (lastSuccessfulRunAt) {
    // Non-first run: use last success as start
    start = lastSuccessfulRunAt;
  } else {
    // First run: use default window
    start = nowEpoch - defaultWindow;
  }

  // Cap: don't go further back than maxWindow
  const minStart = nowEpoch - maxWindow;
  if (start < minStart) start = minStart;

  return { start, end: nowEpoch };
}

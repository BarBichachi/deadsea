// Kind drives rendering and rules: exactly one 'lunch' per user; 'meal' (e.g. breakfast) is styled like lunch
// but not counted; 'rest' is shown as rest, not an activity
export type ActivityKind = 'activity' | 'lunch' | 'meal' | 'rest';

export const ACTIVITY_KINDS: readonly ActivityKind[] = ['activity', 'lunch', 'meal', 'rest'];

export interface Activity {
  id: string;
  /** Start time, "HH:MM" (24h). */
  time: string;
  name: string;
  kind: ActivityKind;
  /** Everyone must attend (e.g. breakfast, transport). */
  shared: boolean;
  /** 5-digit user IDs. */
  participants: string[];
}

export interface Dataset {
  /** Monotonic version used for optimistic concurrency on admin saves. */
  version: number;
  updatedAt: string;
  activities: Activity[];
}

export interface ScheduleItem {
  time: string;
  name: string;
  kind: ActivityKind;
}

export type IssueCode =
  | 'LUNCH_COUNT'
  | 'MISSING_SHARED'
  | 'TIME_CONFLICT'
  | 'INVALID_ID'
  | 'DUPLICATE_ID'
  | 'INVALID_TIME'
  | 'EMPTY_NAME'
  | 'DUPLICATE_ACTIVITY_ID';

export interface Issue {
  code: IssueCode;
  /** 'error' blocks saving; 'warning' must be fixed before the trip but does not block intermediate saves. */
  severity: 'error' | 'warning';
  userId?: string;
  activityId?: string;
  /** Hebrew, admin-facing. */
  message: string;
}

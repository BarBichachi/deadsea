import type { Dataset, ScheduleItem } from './types.ts';

// Sorted union of all participant IDs across activities
export function collectUserIds(dataset: Dataset): string[] {
  const ids = new Set<string>();
  for (const a of dataset.activities) for (const id of a.participants) ids.add(id);
  return [...ids].sort();
}

// Activities in display order: by start time, ties keep their original (column) order
function sortedActivities(dataset: Dataset) {
  return dataset.activities
    .map((activity, index) => ({ activity, index }))
    .sort((x, y) => x.activity.time.localeCompare(y.activity.time) || x.index - y.index)
    .map((x) => x.activity);
}

// One user's schedule, or null if the ID appears in no activity
export function buildUserSchedule(dataset: Dataset, userId: string): ScheduleItem[] | null {
  const items = sortedActivities(dataset)
    .filter((a) => a.participants.includes(userId))
    .map(({ time, name, kind }) => ({ time, name, kind }));
  return items.length > 0 ? items : null;
}

// Precomputed userId -> schedule map for O(1) lookups in the Worker
export function buildScheduleIndex(dataset: Dataset): Map<string, ScheduleItem[]> {
  const index = new Map<string, ScheduleItem[]>();
  for (const { time, name, kind, participants } of sortedActivities(dataset)) {
    for (const id of new Set(participants)) {
      const list = index.get(id) ?? [];
      list.push({ time, name, kind });
      index.set(id, list);
    }
  }
  return index;
}

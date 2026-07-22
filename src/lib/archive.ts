import type { CollectionEntry } from "astro:content";

import { eventTimestamp, isDateOnly } from "./events.ts";

export const POSTS_PER_PAGE = 10;
export const ARCHIVE_PAGE_SIZE = 12;
export const RECENT_PAST_EVENTS_LIMIT = 6;
export const PROJECT_ARCHIVE_PREVIEW_LIMIT = 4;

export const projectPrimaryStatuses = ["active", "planned"] as const;
export const projectArchiveStatuses = ["completed"] as const;

export const projectStatusLabels = {
  active: "Active",
  planned: "Planned",
  completed: "Completed",
};

export function isPastEvent(
  event: CollectionEntry<"events">,
  now = new Date(),
) {
  const eventEnd = event.data.endDate ?? event.data.startDate;

  if (!eventEnd) return false;

  if (isDateOnly(eventEnd)) {
    const currentDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(now)
      .reduce<Record<string, string>>((parts, part) => {
        parts[part.type] = part.value;
        return parts;
      }, {});
    const today = `${currentDate.year}-${currentDate.month}-${currentDate.day}`;

    return eventEnd < today;
  }

  return eventTimestamp(eventEnd) < now.getTime();
}

export function isUpcomingEvent(
  event: CollectionEntry<"events">,
  now = new Date(),
) {
  return !isPastEvent(event, now);
}

export function sortEventsAscending(
  left: CollectionEntry<"events">,
  right: CollectionEntry<"events">,
) {
  const leftTime = left.data.startDate
    ? eventTimestamp(left.data.startDate)
    : undefined;
  const rightTime = right.data.startDate
    ? eventTimestamp(right.data.startDate)
    : undefined;

  if (leftTime === undefined && rightTime === undefined) {
    return left.data.title.localeCompare(right.data.title);
  }
  if (leftTime === undefined) return 1;
  if (rightTime === undefined) return -1;

  return (
    leftTime - rightTime || left.data.title.localeCompare(right.data.title)
  );
}

export function sortEventsDescending(
  left: CollectionEntry<"events">,
  right: CollectionEntry<"events">,
) {
  const leftTime = left.data.startDate
    ? eventTimestamp(left.data.startDate)
    : undefined;
  const rightTime = right.data.startDate
    ? eventTimestamp(right.data.startDate)
    : undefined;

  if (leftTime === undefined && rightTime === undefined) {
    return left.data.title.localeCompare(right.data.title);
  }
  if (leftTime === undefined) return 1;
  if (rightTime === undefined) return -1;

  return (
    rightTime - leftTime || left.data.title.localeCompare(right.data.title)
  );
}

export function sortProjectsByTitle(
  left: CollectionEntry<"projects">,
  right: CollectionEntry<"projects">,
) {
  return left.data.title.localeCompare(right.data.title);
}

export function sortCompletedProjects(
  left: CollectionEntry<"projects">,
  right: CollectionEntry<"projects">,
) {
  return sortProjectsByTitle(left, right);
}

export const eventTypes = [
  "meeting",
  "workshop",
  "research",
  "speaker",
  "panel",
  "recruiting",
  "networking",
  "competition",
  "conference",
  "social",
  "info-session",
  "office-hours",
  "field-trip",
  "service",
  "other",
] as const;

export type EventType = (typeof eventTypes)[number];

export function isDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function eventTimestamp(value: string) {
  return new Date(value).getTime();
}

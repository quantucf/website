import assert from "node:assert/strict";
import test from "node:test";

import {
  isPastEvent,
  isUpcomingEvent,
  sortCompletedProjects,
  sortEventsAscending,
  sortEventsDescending,
  sortProjectsByTitle,
} from "../src/lib/archive.ts";

function event(startDate, title = "Event", endDate) {
  return {
    data: {
      title,
      description: `${title} description`,
      eventType: "other",
      startDate,
      endDate,
    },
  };
}

function project(title) {
  return { data: { title } };
}

test("sorts events chronologically in both directions", () => {
  const events = [
    event("2026-03-01T12:00:00Z", "March"),
    event(undefined, "TBD event"),
    event("2026-01-01T12:00:00Z", "January"),
    event("2026-02-01T12:00:00Z", "February"),
  ];

  assert.deepEqual(
    events
      .toSorted(sortEventsAscending)
      .map((item) =>
        item.data.startDate
          ? new Date(item.data.startDate).getUTCMonth()
          : undefined,
      ),
    [0, 1, 2, undefined],
  );
  assert.deepEqual(
    events
      .toSorted(sortEventsDescending)
      .map((item) =>
        item.data.startDate
          ? new Date(item.data.startDate).getUTCMonth()
          : undefined,
      ),
    [2, 1, 0, undefined],
  );
});

test("derives event lifecycle from dates and keeps TBD events upcoming", () => {
  const now = new Date("2026-03-01T12:00:00Z");
  const finished = event("2026-02-01T12:00:00Z");
  const inProgress = event(
    "2026-02-28T12:00:00Z",
    "Multi-day event",
    "2026-03-02T12:00:00Z",
  );
  const future = event("2026-04-01T12:00:00Z");
  const dateTbd = event(undefined, "TBD event");

  assert.equal(isPastEvent(finished, now), true);
  assert.equal(isUpcomingEvent(inProgress, now), true);
  assert.equal(isUpcomingEvent(future, now), true);
  assert.equal(isUpcomingEvent(dateTbd, now), true);
});

test("keeps a date-only event current through its local calendar date", () => {
  const dateOnly = event("2026-03-01");

  assert.equal(
    isUpcomingEvent(dateOnly, new Date("2026-03-02T04:30:00Z")),
    true,
  );
  assert.equal(isPastEvent(dateOnly, new Date("2026-03-02T05:30:00Z")), true);
});

test("sorts project collections by title", () => {
  const projects = [project("Volatility"), project("Alpha"), project("Risk")];
  const expected = ["Alpha", "Risk", "Volatility"];

  assert.deepEqual(
    projects.toSorted(sortProjectsByTitle).map((item) => item.data.title),
    expected,
  );
  assert.deepEqual(
    projects.toSorted(sortCompletedProjects).map((item) => item.data.title),
    expected,
  );
});

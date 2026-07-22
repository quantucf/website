import { getCollection } from "astro:content";

import {
  ARCHIVE_PAGE_SIZE,
  isPastEvent,
  POSTS_PER_PAGE,
  PROJECT_ARCHIVE_PREVIEW_LIMIT,
  projectArchiveStatuses,
  RECENT_PAST_EVENTS_LIMIT,
} from "../lib/archive";
import { absoluteUrl } from "../lib/site";

function pageRoutes(baseRoute: string, itemCount: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(itemCount / pageSize));

  return Array.from({ length: pageCount }, (_, index) =>
    index === 0 ? baseRoute : `${baseRoute}${index + 1}/`,
  );
}

function archivePageRoutes(
  baseRoute: string,
  itemCount: number,
  previewLimit: number,
) {
  return itemCount > previewLimit
    ? pageRoutes(baseRoute, itemCount, ARCHIVE_PAGE_SIZE)
    : [];
}

function xmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET() {
  const now = new Date();
  const [events, posts, projects] = await Promise.all([
    getCollection("events"),
    getCollection("posts"),
    getCollection("projects"),
  ]);

  const publishedPosts = posts.filter((post) => !post.data.draft);
  const pastEvents = events.filter((event) => isPastEvent(event, now));
  const completedProjects = projects.filter((project) =>
    projectArchiveStatuses.includes(
      project.data.status as (typeof projectArchiveStatuses)[number],
    ),
  );

  const routes = [
    "/",
    "/about/",
    "/events/",
    "/projects/",
    "/officers/",
    "/sponsors/",
    "/join/",
    ...pageRoutes("/posts/", publishedPosts.length, POSTS_PER_PAGE),
    ...archivePageRoutes(
      "/events/archive/",
      pastEvents.length,
      RECENT_PAST_EVENTS_LIMIT,
    ),
    ...archivePageRoutes(
      "/projects/archive/",
      completedProjects.length,
      PROJECT_ARCHIVE_PREVIEW_LIMIT,
    ),
    ...events.map((event) => `/events/${event.id}/`),
    ...projects.map((project) => `/projects/${project.id}/`),
    ...publishedPosts.map((post) => `/posts/${post.id}/`),
  ];

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...routes.map(
      (route) => `  <url><loc>${xmlEscape(absoluteUrl(route))}</loc></url>`,
    ),
    "</urlset>",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}

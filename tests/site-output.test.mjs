import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { URL } from "node:url";

import {
  ARCHIVE_PAGE_SIZE,
  isUpcomingEvent,
  POSTS_PER_PAGE,
  PROJECT_ARCHIVE_PREVIEW_LIMIT,
  RECENT_PAST_EVENTS_LIMIT,
} from "../src/lib/archive.ts";
import {
  footerEmailLink,
  footerSocialLinks,
} from "../src/data/site-content.ts";
import {
  builtHtmlFiles,
  builtRoutes,
  collectionEntries,
  escapeRegExp,
  frontmatterValue,
  localOutputPath,
  pathExists,
  readRoute,
  requiredRoutes,
  routeFromOutputPath,
  siteOrigin,
  staticOutputPath,
  tagAttribute,
} from "./helpers/site-output.mjs";

const expectedKnightConnectHref =
  "https://knightconnect.campuslabs.com/engage/organization/quantativefinanceclub";
const expectedDuesOptions = [
  {
    id: "semester",
    label: "Fall 2026 Semester",
    priceLabel: "$20",
  },
  {
    id: "academic-year",
    label: "2026–27 Academic Year",
    priceLabel: "$35",
  },
];
const expectedJoinSocialLinks = [
  { label: "Discord", href: "https://discord.gg/5rAzsYDT9e" },
  {
    label: "Instagram",
    href: "https://www.instagram.com/quantucf/",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/quantucf/",
  },
];

function pageRoutes(baseRoute, itemCount, pageSize) {
  const pageCount = Math.max(1, Math.ceil(itemCount / pageSize));

  return Array.from({ length: pageCount }, (_, index) =>
    index === 0 ? baseRoute : `${baseRoute}${index + 1}/`,
  );
}

function archivePageRoutes(baseRoute, itemCount, previewLimit) {
  return itemCount > previewLimit
    ? pageRoutes(baseRoute, itemCount, ARCHIVE_PAGE_SIZE)
    : [];
}

function metadata(html) {
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const description = html.match(
    /<meta name="description" content="([^"]+)"/,
  )?.[1];
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];

  return {
    title,
    description,
    canonical,
    ogTitle: html.match(/<meta property="og:title" content="([^"]+)"/)?.[1],
    ogDescription: html.match(
      /<meta property="og:description" content="([^"]+)"/,
    )?.[1],
    ogUrl: html.match(/<meta property="og:url" content="([^"]+)"/)?.[1],
    ogImage: html.match(/<meta property="og:image" content="([^"]+)"/)?.[1],
    twitterTitle: html.match(
      /<meta name="twitter:title" content="([^"]+)"/,
    )?.[1],
    twitterDescription: html.match(
      /<meta name="twitter:description" content="([^"]+)"/,
    )?.[1],
    twitterImage: html.match(
      /<meta name="twitter:image" content="([^"]+)"/,
    )?.[1],
    ogType: html.match(/<meta property="og:type" content="([^"]+)"/)?.[1],
    ogImageAlt: html.match(
      /<meta property="og:image:alt" content="([^"]+)"/,
    )?.[1],
    twitterImageAlt: html.match(
      /<meta name="twitter:image:alt" content="([^"]+)"/,
    )?.[1],
    robots: html.match(/<meta name="robots" content="([^"]+)"/)?.[1],
    articlePublishedTime: html.match(
      /<meta property="article:published_time" content="([^"]+)"/,
    )?.[1],
  };
}

function plainText(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function emptyStatePattern(subject) {
  return new RegExp(
    `<p[^>]*data-empty-state[^>]*>\\s*No ${escapeRegExp(subject)} are listed yet\\.\\s*</p>`,
  );
}

async function assertLocalReference(sourceRoute, rawReference) {
  const url = new URL(rawReference, siteOrigin);
  if (url.origin !== siteOrigin) return;

  const targetPath = localOutputPath(url.pathname);
  assert.equal(
    await pathExists(targetPath),
    true,
    `${sourceRoute} references missing local target ${rawReference}`,
  );

  if (!url.hash || !targetPath.endsWith(".html")) return;

  const targetHtml = await readFile(targetPath, "utf8");
  const targetId = decodeURIComponent(url.hash.slice(1));
  assert.match(
    targetHtml,
    new RegExp(`\\bid="${escapeRegExp(targetId)}"`),
    `${sourceRoute} references missing fragment ${rawReference}`,
  );
}

test("builds required routes, published content, and pagination", async () => {
  const routes = new Set(await builtRoutes());

  for (const route of requiredRoutes) {
    assert.ok(routes.has(route), `Expected ${route} to be built`);
  }

  for (const collection of ["events", "projects"]) {
    for (const entry of await collectionEntries(collection)) {
      assert.ok(
        routes.has(`/${collection}/${entry.id}/`),
        `${collection}/${entry.fileName} should have a detail route`,
      );
    }
  }

  const posts = await collectionEntries("posts");
  const publishedPosts = posts.filter(
    (post) => frontmatterValue(post.source, "draft") !== "true",
  );
  for (const post of posts) {
    assert.equal(
      routes.has(`/posts/${post.id}/`),
      publishedPosts.includes(post),
      `${post.fileName} publication state should match its route`,
    );
  }

  const now = Date.now();
  const pastEvents = (await collectionEntries("events")).filter((event) => {
    const startDate = frontmatterValue(event.source, "startDate");
    const endDate = frontmatterValue(event.source, "endDate");
    const eventEnd = endDate ?? startDate;

    return eventEnd ? new Date(eventEnd).getTime() < now : false;
  });
  const completedProjects = (await collectionEntries("projects")).filter(
    (project) => frontmatterValue(project.source, "status") === "completed",
  );
  const expectedPaginatedRoutes = [
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
  ].sort();
  const actualPaginatedRoutes = [...routes]
    .filter(
      (route) =>
        /^\/posts\/(?:\d+\/)?$/.test(route) ||
        /^\/(?:events|projects)\/archive\/(?:\d+\/)?$/.test(route),
    )
    .sort();

  assert.deepEqual(actualPaginatedRoutes, expectedPaginatedRoutes);
});

test("inlines stylesheets to avoid a render-blocking request", async () => {
  for (const filePath of await builtHtmlFiles()) {
    const route = routeFromOutputPath(filePath);
    const html = await readFile(filePath, "utf8");

    assert.match(html, /<style(?:\s[^>]*)?>[\s\S]*?<\/style>/);
    assert.doesNotMatch(
      html,
      /<link\b[^>]*\brel="stylesheet"[^>]*>/,
      `${route} must not load a render-blocking stylesheet`,
    );
  }
});

test("uses consistent empty states across collection pages", async () => {
  const expectations = [
    ["/events/", "events"],
    ["/posts/", "posts"],
    ["/projects/", "projects"],
    ["/sponsors/", "sponsors"],
  ];

  for (const [route, subject] of expectations) {
    const html = await readRoute(route);
    const entries = await collectionEntries(subject);

    if (entries.length === 0) {
      assert.match(html, emptyStatePattern(subject));
    } else {
      assert.doesNotMatch(html, emptyStatePattern(subject));
    }
  }

  const home = await readRoute("/");
  const events = await collectionEntries("events");
  const hasUpcomingEvents = events.some((event) => {
    const startDate = frontmatterValue(event.source, "startDate")?.replaceAll(
      '"',
      "",
    );
    const endDate = frontmatterValue(event.source, "endDate")?.replaceAll(
      '"',
      "",
    );

    return isUpcomingEvent({ data: { startDate, endDate } });
  });

  if (!hasUpcomingEvents) {
    assert.match(
      home,
      emptyStatePattern(events.length === 0 ? "events" : "upcoming events"),
    );
  }

  for (const subject of ["posts", "projects"]) {
    if ((await collectionEntries(subject)).length === 0) {
      assert.match(home, emptyStatePattern(subject));
    }
  }
});

test("renders published meeting times and locations as TBD", async () => {
  for (const event of await collectionEntries("events")) {
    const html = await readRoute(`/events/${event.id}/`);

    assert.match(
      html,
      /data-metadata-icon="clock"[^>]*>[\s\S]*?TBD[\s\S]*?<\/span>/,
      `${event.fileName} should render its meeting time as TBD`,
    );
    assert.match(
      html,
      /data-metadata-icon="location"[^>]*>[\s\S]*?TBD[\s\S]*?<\/span>/,
      `${event.fileName} should render its location as TBD`,
    );
  }
});

test("uses the code XML icon for workshop events", async () => {
  const workshop = await readRoute(
    "/events/2026-09-16-python-for-quantitative-finance/",
  );

  assert.match(
    workshop,
    /data-event-type-icon="workshop"[^>]*class="[^"]*lucide-code-xml/,
  );
});

test("classifies technical interview preparation as a workshop", async () => {
  const interviewPreparation = await readRoute(
    "/events/2026-11-18-technical-interview-preparation/",
  );

  assert.match(
    interviewPreparation,
    /data-event-type-icon="workshop"[^>]*class="[^"]*lucide-code-xml/,
  );
  assert.doesNotMatch(
    interviewPreparation,
    /data-event-type-icon="recruiting"/,
  );
});

test("renders the approved page descriptions in heroes and metadata", async () => {
  const pages = [
    {
      route: "/",
      visible: "A student organization dedicated to quantitative finance.",
      metadata:
        "Quantitative Finance Club @ UCF is a student organization dedicated to quantitative finance.",
    },
    {
      route: "/about/",
      visible: "A student organization dedicated to quantitative finance.",
      metadata:
        "Learn about Quantitative Finance Club @ UCF, a student organization dedicated to quantitative finance.",
    },
    {
      route: "/events/",
      visible:
        "Workshops, guest speakers, recruiting events, and general meetings.",
      metadata:
        "Explore workshops, guest speaker events, recruiting events, and general meetings from Quantitative Finance Club @ UCF.",
    },
    {
      route: "/projects/",
      visible: "Student-led research and projects in quantitative finance.",
      metadata:
        "Explore student-led research and projects in quantitative finance from Quantitative Finance Club @ UCF.",
    },
    {
      route: "/officers/",
      visible:
        "Meet the students leading the club’s programs, projects, and operations.",
      metadata:
        "Meet the students leading Quantitative Finance Club @ UCF’s programs, projects, and operations.",
    },
    {
      route: "/sponsors/",
      visible:
        "Support the club’s operations and expand opportunities for our members.",
      metadata:
        "Support Quantitative Finance Club @ UCF’s operations and expand opportunities for student members.",
    },
    {
      route: "/posts/",
      visible: "Announcements, resources, and updates from the club.",
      metadata:
        "Read announcements, resources, and updates from Quantitative Finance Club @ UCF.",
    },
  ];

  for (const page of pages) {
    const html = await readRoute(page.route);
    assert.ok(
      html.includes(page.visible),
      `${page.route} needs the approved visible description`,
    );
    assert.equal(metadata(html).description, page.metadata);
  }

  const webmanifest = JSON.parse(
    await readFile(staticOutputPath("site.webmanifest"), "utf8"),
  );
  assert.equal(
    webmanifest.description,
    "Quantitative Finance Club @ UCF is a student organization dedicated to quantitative finance.",
  );

  const home = await readRoute("/");
  assert.match(
    home,
    /<h2[^>]*>\s*For students\s*<\/h2>[\s\S]*?Open to UCF students of all majors interested in quantitative finance\./,
  );
});

test("resolves every internal link, fragment, and generated asset", async () => {
  for (const filePath of await builtHtmlFiles()) {
    const route = routeFromOutputPath(filePath);
    const html = await readFile(filePath, "utf8");

    for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>/g)) {
      const reference = match[1];
      if (reference.startsWith("mailto:") || reference.startsWith("tel:")) {
        continue;
      }
      await assertLocalReference(route, reference);
    }

    for (const tag of html.matchAll(/<(?:img|script|link)\b[^>]*>/g)) {
      const element = tag[0];
      if (tagAttribute(element, "rel") === "canonical") continue;
      const reference =
        tagAttribute(element, "src") ?? tagAttribute(element, "href");
      if (reference) await assertLocalReference(route, reference);
    }
  }

  const manifest = JSON.parse(
    await readFile(staticOutputPath("site.webmanifest"), "utf8"),
  );
  assert.equal(manifest.lang, "en-US");
  for (const icon of manifest.icons) {
    await assertLocalReference("/site.webmanifest", icon.src);
  }
});

test("publishes unique and route-consistent metadata on every page", async () => {
  const seenTitles = new Map();
  const seenDescriptions = new Map();

  for (const filePath of await builtHtmlFiles()) {
    const route = routeFromOutputPath(filePath);
    const html = await readFile(filePath, "utf8");
    const pageMetadata = metadata(html);
    const expectedCanonical = new URL(route, siteOrigin).toString();

    assert.ok(pageMetadata.title, `${route} needs a title`);
    assert.ok(pageMetadata.description, `${route} needs a meta description`);
    assert.equal(pageMetadata.canonical, expectedCanonical);
    assert.equal(pageMetadata.ogTitle, pageMetadata.title);
    assert.equal(pageMetadata.ogDescription, pageMetadata.description);
    assert.equal(pageMetadata.ogUrl, expectedCanonical);
    assert.equal(pageMetadata.twitterTitle, pageMetadata.title);
    assert.equal(pageMetadata.twitterDescription, pageMetadata.description);
    assert.equal(pageMetadata.twitterImage, pageMetadata.ogImage);
    assert.equal(pageMetadata.twitterImageAlt, pageMetadata.ogImageAlt);
    assert.ok(pageMetadata.ogImageAlt);

    if (route === "/404/") {
      assert.match(pageMetadata.robots, /\bnoindex\b/);
    } else {
      assert.equal(pageMetadata.robots, undefined);
    }

    if (/^\/posts\/(?!\d+\/)[^/]+\/$/.test(route)) {
      assert.equal(pageMetadata.ogType, "article");
      assert.ok(pageMetadata.articlePublishedTime);
    } else {
      assert.equal(pageMetadata.ogType, "website");
      assert.equal(pageMetadata.articlePublishedTime, undefined);
    }

    const socialImage = new URL(pageMetadata.ogImage);
    assert.equal(socialImage.origin, siteOrigin);
    assert.equal(await pathExists(localOutputPath(socialImage.pathname)), true);

    assert.equal(
      seenTitles.has(pageMetadata.title),
      false,
      `${route} duplicates the title used by ${seenTitles.get(pageMetadata.title)}`,
    );
    assert.equal(
      seenDescriptions.has(pageMetadata.description),
      false,
      `${route} duplicates the description used by ${seenDescriptions.get(pageMetadata.description)}`,
    );
    seenTitles.set(pageMetadata.title, route);
    seenDescriptions.set(pageMetadata.description, route);
  }
});

test("publishes valid structured data for every generated page", async () => {
  const eventEntries = await collectionEntries("events");
  const postEntries = await collectionEntries("posts");

  for (const filePath of await builtHtmlFiles()) {
    const route = routeFromOutputPath(filePath);
    const html = await readFile(filePath, "utf8");
    const canonical = metadata(html).canonical;
    const script = html.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    )?.[1];

    assert.ok(script, `${route} needs a JSON-LD graph`);
    const data = JSON.parse(script);
    assert.equal(data["@context"], "https://schema.org");
    assert.ok(Array.isArray(data["@graph"]));

    const byType = new Map(data["@graph"].map((item) => [item["@type"], item]));
    const organization = byType.get("Organization");
    assert.ok(organization);
    assert.deepEqual(
      organization.sameAs,
      footerSocialLinks.map((link) => link.href),
    );
    assert.ok(byType.has("WebSite"));
    assert.equal(byType.get("WebPage")?.url, canonical);
    assert.equal(byType.get("WebPage")?.["@id"], `${canonical}#webpage`);

    if (/^\/posts\/(?!\d+\/)[^/]+\/$/.test(route)) {
      const posting = byType.get("BlogPosting");
      const postId = route.split("/")[2];
      const source = postEntries.find((entry) => entry.id === postId)?.source;
      const author = source && frontmatterValue(source, "author");

      assert.ok(posting, `${route} needs BlogPosting data`);
      assert.equal(posting.mainEntityOfPage?.["@id"], `${canonical}#webpage`);
      assert.ok(posting.headline);

      if (author) {
        assert.deepEqual(posting.author, { "@type": "Person", name: author });
      }
    }
    if (/^\/events\/(?!archive\/)[^/]+\/$/.test(route)) {
      const event = byType.get("Event");
      const eventId = route.split("/")[2];
      const source = eventEntries.find((entry) => entry.id === eventId)?.source;
      const hasStartDate = source && frontmatterValue(source, "startDate");

      if (hasStartDate) {
        assert.ok(event, `${route} needs Event data`);
        assert.equal(event.url, canonical);
        assert.ok(event.startDate);

        if (source && frontmatterValue(source, "location") === "TBD") {
          assert.equal(
            event.location,
            undefined,
            `${route} must not publish a placeholder location`,
          );
        }
      } else {
        assert.equal(
          event,
          undefined,
          `${route} must omit incomplete Event data while its date is TBD`,
        );
      }
    }
    if (/^\/projects\/(?!archive\/)[^/]+\/$/.test(route)) {
      const project = byType.get("CreativeWork");
      assert.ok(project, `${route} needs CreativeWork data`);
      assert.equal(project.url, canonical);
      assert.ok(project.name);
    }
  }
});

test("lists every public route exactly once in the sitemap", async () => {
  const expectedUrls = (await builtRoutes())
    .filter((route) => route !== "/404/")
    .map((route) => new URL(route, siteOrigin).toString())
    .sort();
  const sitemap = await readFile(staticOutputPath("sitemap.xml"), "utf8");
  const actualUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => match[1])
    .sort();

  assert.equal(new Set(actualUrls).size, actualUrls.length);
  assert.deepEqual(actualUrls, expectedUrls);

  const robots = await readFile(staticOutputPath("robots.txt"), "utf8");
  assert.match(robots, /Sitemap: https:\/\/quantucf\.com\/sitemap\.xml/);
});

test("keeps static accessibility references valid on every page", async () => {
  for (const filePath of await builtHtmlFiles()) {
    const route = routeFromOutputPath(filePath);
    const html = await readFile(filePath, "utf8");
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
    const idSet = new Set(ids);

    assert.match(html, /<html lang="en-US">/);
    assert.match(html, /<a[^>]*href="#main-content"/);
    assert.equal(
      [...html.matchAll(/<main\b[^>]*id="main-content"/g)].length,
      1,
      `${route} should have one main landmark`,
    );
    assert.equal(idSet.size, ids.length, `${route} contains duplicate IDs`);

    for (const label of html.matchAll(/<label\b[^>]*\bfor="([^"]+)"[^>]*>/g)) {
      assert.ok(
        idSet.has(label[1]),
        `${route} has a label for missing #${label[1]}`,
      );
    }
    for (const reference of html.matchAll(/\baria-labelledby="([^"]+)"/g)) {
      for (const id of reference[1].split(/\s+/)) {
        assert.ok(
          idSet.has(id),
          `${route} has aria-labelledby for missing #${id}`,
        );
      }
    }
    for (const image of html.matchAll(/<img\b[^>]*>/g)) {
      assert.match(
        image[0],
        /\balt="[^"]*"/,
        `${route} has an image without alt`,
      );
    }
    for (const anchor of html.matchAll(/<a\b[^>]*\btarget="_blank"[^>]*>/g)) {
      assert.match(
        tagAttribute(anchor[0], "rel") ?? "",
        /\bnoreferrer\b/,
        `${route} opens a new tab without rel=noreferrer`,
      );
    }

    assert.match(html, /<nav[^>]*aria-label="Primary navigation"/);
    assert.match(html, /<nav[^>]*aria-label="Mobile navigation"/);
  }

  const home = await readRoute("/");
  const themeControls = [
    ...home.matchAll(/<input\b[^>]*data-theme-control[^>]*>/g),
  ];
  assert.equal(themeControls.length, 2);
  for (const control of themeControls) {
    assert.equal(tagAttribute(control[0], "role"), "switch");
    assert.ok(tagAttribute(control[0], "aria-label"));
  }
});

test("marks the active top-level navigation destination", async () => {
  const routeGroups = [
    ["/", "/"],
    ["/about/", "/about/"],
    ["/events/", "/events/"],
    ["/projects/", "/projects/"],
    ["/posts/", "/posts/"],
    ["/officers/", "/officers/"],
    ["/sponsors/", "/sponsors/"],
    ["/join/", "/join/"],
  ];

  for (const route of (await builtRoutes()).filter(
    (candidate) => candidate !== "/404/",
  )) {
    const expectedHref = routeGroups.find(([prefix]) =>
      prefix === "/" ? route === "/" : route.startsWith(prefix),
    )?.[1];
    const html = await readRoute(route);
    const activeHrefs = [
      ...html.matchAll(/<a\b[^>]*aria-current="page"[^>]*>/g),
    ]
      .map((match) => tagAttribute(match[0], "href"))
      .filter(Boolean);

    assert.ok(expectedHref, `No navigation group defined for ${route}`);
    assert.ok(
      activeHrefs.includes(expectedHref),
      `${route} should mark ${expectedHref} as current`,
    );
    assert.equal(
      activeHrefs.every((href) => href === expectedHref),
      true,
      `${route} marks an unrelated navigation destination as current`,
    );
  }
});

test("publishes one canonical mission across the home and About pages", async () => {
  const home = await readRoute("/");
  const about = await readRoute("/about/");
  const homeMission = home.match(
    /<h2[^>]*>\s*Our mission\s*<\/h2>\s*<p[^>]*>([\s\S]*?)<\/p>/,
  )?.[1];
  const aboutMission = about.match(
    /<h2[^>]*>\s*Mission\s*<\/h2>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/,
  )?.[1];

  assert.ok(homeMission, "The home page should publish the club mission");
  assert.ok(aboutMission, "The About page should publish the club mission");
  assert.equal(plainText(aboutMission), plainText(homeMission));
});

test("links the home activity summary to the detailed About section", async () => {
  const home = await readRoute("/");
  const about = await readRoute("/about/");

  assert.match(
    home,
    /<h2[^>]*>\s*What we do\s*<\/h2>\s*<p[^>]*>\s*We host events and organize student-led research and projects in quantitative finance\.\s*<\/p>[\s\S]*?<a[^>]*href="\/about\/#what-we-do"[^>]*>\s*See what we do →\s*<\/a>/,
  );
  assert.match(
    about,
    /<section[^>]*id="what-we-do"[^>]*>[\s\S]*?<h2[^>]*>\s*What we do\s*<\/h2>/,
  );
  assert.doesNotMatch(about, /How the club works/);

  for (const [heading, description] of [
    [
      "Events",
      "Workshops, guest speakers, recruiting events, and general meetings for students interested in quantitative finance.",
    ],
    [
      "Research",
      "Readings, replications, and research initiatives that explore markets, models, and financial theory.",
    ],
    [
      "Projects",
      "Student-led projects that explore research questions and build tools for quantitative finance.",
    ],
  ]) {
    assert.match(
      about,
      new RegExp(
        `<h3[^>]*>\\s*${escapeRegExp(heading)}\\s*<\\/h3>\\s*<p[^>]*>\\s*${escapeRegExp(description)}\\s*<\\/p>`,
      ),
    );
  }
});

test("gives the home hero actions equal width only on small screens", async () => {
  const home = await readRoute("/");
  const actionGroup = home.match(
    /<div[^>]*data-homepage-primary-actions[^>]*>/,
  )?.[0];

  assert.ok(actionGroup, "The home hero should expose its primary actions");
  const className = tagAttribute(actionGroup, "class") ?? "";
  assert.match(className, /\bgrid\b/);
  assert.match(className, /\bgrid-cols-2\b/);
  assert.match(className, /\bsm:flex\b/);
});

test("renders the approved three-step joining flow", async () => {
  const join = await readRoute("/join/");
  const joinMetadata = metadata(join);

  assert.equal(
    joinMetadata.description,
    "Join Quantitative Finance Club @ UCF. Membership is open to UCF students of all majors interested in quantitative finance.",
  );
  assert.match(join, /<h1[^>]*>\s*Join us\s*<\/h1>/);
  assert.match(
    join,
    /<h1[^>]*>\s*Join us\s*<\/h1>[\s\S]*?<p[^>]*>\s*Open to UCF students of all majors interested in quantitative finance\.\s*<\/p>/,
  );
  assert.match(join, /<h2[^>]*>\s*How to join\s*<\/h2>/);
  assert.deepEqual(
    [...join.matchAll(/data-join-step="(\d{2})"/g)].map((match) => match[1]),
    ["01", "02", "03"],
  );
  for (const heading of [
    "Join on KnightConnect",
    "Pay dues",
    "Stay connected",
  ]) {
    assert.match(join, new RegExp(`>${escapeRegExp(heading)}<`));
  }
  assert.match(
    join,
    new RegExp(
      `data-join-link="KnightConnect"[^>]*href="${escapeRegExp(expectedKnightConnectHref)}"|href="${escapeRegExp(expectedKnightConnectHref)}"[^>]*data-join-link="KnightConnect"`,
    ),
  );

  assert.match(
    join,
    /Membership dues help fund club operations and give members access to additional resources and exclusive opportunities\./,
  );
  assert.doesNotMatch(join, /data-dues-divider/);

  for (const option of expectedDuesOptions) {
    assert.match(
      join,
      new RegExp(
        `<button[^>]*data-dues-link-placeholder="${escapeRegExp(option.id)}"[^>]*>[\\s\\S]*?${escapeRegExp(option.label)}\\s+—\\s+${escapeRegExp(option.priceLabel)}[\\s\\S]*?<\\/button>`,
      ),
    );
    assert.match(
      join,
      new RegExp(
        `<button[^>]*data-dues-link-placeholder="${escapeRegExp(option.id)}"[^>]*disabled`,
      ),
    );
    assert.equal(
      join.match(new RegExp(escapeRegExp(option.label), "g"))?.length,
      1,
      `${option.label} should appear only in its payment action`,
    );
    assert.equal(
      join.match(new RegExp(escapeRegExp(option.priceLabel), "g"))?.length,
      1,
      `${option.priceLabel} should appear only in its payment action`,
    );
  }

  assert.match(
    join,
    /<span class="sr-only">\s*Payment link not yet available\s*<\/span>/,
  );
  assert.doesNotMatch(join, /Coming soon/);

  for (const channel of expectedJoinSocialLinks) {
    assert.match(
      join,
      new RegExp(
        `data-join-link="${escapeRegExp(channel.label)}"[^>]*href="${escapeRegExp(channel.href)}"|href="${escapeRegExp(channel.href)}"[^>]*data-join-link="${escapeRegExp(channel.label)}"`,
      ),
    );
  }

  assert.doesNotMatch(join, /<h2[^>]*>\s*Contact\s*<\/h2>/);
  assert.doesNotMatch(join, /href="\/join\/#contact"/);
  assert.doesNotMatch(
    join,
    /covers?\s+two\s+semesters?|sav(?:e|es|ing|ings)\b/i,
  );
  assert.doesNotMatch(join, /data-join-link="(?:Email|GitHub)"/);
});

test("renders every configured footer channel", async () => {
  const home = await readRoute("/");

  for (const link of footerSocialLinks) {
    assert.match(home, new RegExp(`href="${escapeRegExp(link.href)}"`));
  }
  assert.match(
    home,
    new RegExp(`href="${escapeRegExp(footerEmailLink.href)}"`),
  );
});

test("links the sponsor contact action directly to email", async () => {
  const sponsors = await readRoute("/sponsors/");

  assert.match(
    sponsors,
    new RegExp(
      `<a[^>]*href="${escapeRegExp(footerEmailLink.href)}"[^>]*>\\s*Contact us\\s*<\\/a>`,
    ),
  );
  assert.doesNotMatch(sponsors, /href="\/join\/#contact"/);
});

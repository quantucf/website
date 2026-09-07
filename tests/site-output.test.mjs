import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { URL } from "node:url";

import { clubTimeZone } from "../src/lib/content.ts";

import {
  ARCHIVE_PAGE_SIZE,
  isPastEvent,
  POSTS_PER_PAGE,
  PROJECT_ARCHIVE_PREVIEW_LIMIT,
  RECENT_PAST_EVENTS_LIMIT,
} from "../src/lib/archive.ts";
import {
  duesOptions,
  joinSocialLinks,
  knightConnectLink,
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
  routeFromOutputPath,
  siteOrigin,
  staticOutputPath,
  tagAttribute,
} from "./helpers/site-output.mjs";

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

async function assertLocalReference(sourceRoute, rawReference) {
  const url = new URL(rawReference, new URL(sourceRoute, siteOrigin));
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

  assert.ok(routes.has("/"), "The home page must be built");
  assert.ok(routes.has("/404/"), "The error page must be built");

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

  const now = new Date();
  const pastEvents = (await collectionEntries("events")).filter((event) => {
    const startDate = frontmatterValue(event.source, "startDate");
    const endDate = frontmatterValue(event.source, "endDate");
    return isPastEvent({ data: { startDate, endDate } }, now);
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

test("renders event dates, times and locations from content", async () => {
  for (const event of await collectionEntries("events")) {
    const html = await readRoute(`/events/${event.id}/`);
    const startDate = frontmatterValue(event.source, "startDate");
    const endDate = frontmatterValue(event.source, "endDate");
    const location = frontmatterValue(event.source, "location");
    const clock = html.match(
      /<span[^>]*data-metadata-icon="clock"[^>]*>([\s\S]*?)<\/span>/,
    )?.[1];
    const place = html.match(
      /<span[^>]*data-metadata-icon="location"[^>]*>([\s\S]*?)<\/span>/,
    )?.[1];
    const times = [...html.matchAll(/<time\b[^>]*>[\s\S]*?<\/time>/g)].map(
      ([tag]) => tag,
    );

    if (startDate) {
      assert.ok(
        times.some((tag) => tagAttribute(tag, "datetime") === startDate),
        event.id,
      );
      if (/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        assert.equal(plainText(clock ?? ""), "TBD", event.id);
      } else {
        for (const date of [startDate, endDate].filter(Boolean)) {
          const time = times.find(
            (tag) =>
              tagAttribute(tag, "datetime") === date &&
              tagAttribute(tag, "data-localized-date") === "time",
          );
          assert.ok(time, `${event.id} must render time ${date}`);
          assert.equal(
            plainText(time),
            new Intl.DateTimeFormat("en-US", {
              hour: "numeric",
              minute: "2-digit",
              timeZone: clubTimeZone,
            }).format(new Date(date)),
          );
        }
      }
    } else {
      assert.equal(clock, undefined, event.id);
    }
    assert.equal(
      place === undefined ? undefined : plainText(place),
      location,
      event.id,
    );
  }
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
  for (const icon of manifest.icons) {
    await assertLocalReference("/site.webmanifest", icon.src);
  }
});

test("publishes unique and route-consistent metadata on every page", async () => {
  const seenTitles = new Map();

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
    seenTitles.set(pageMetadata.title, route);
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
  assert.ok(robots.includes(`Sitemap: ${new URL("/sitemap.xml", siteOrigin)}`));
});

test("keeps static accessibility references valid on every page", async () => {
  for (const filePath of await builtHtmlFiles()) {
    const route = routeFromOutputPath(filePath);
    const html = await readFile(filePath, "utf8");
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
    const idSet = new Set(ids);

    assert.match(html, /<html\b[^>]*\blang="[^"]+"/);
    const mains = [...html.matchAll(/<main\b[^>]*>/g)];
    assert.equal(mains.length, 1, `${route} should have one main landmark`);
    const mainId = tagAttribute(mains[0][0], "id");
    assert.ok(mainId, `${route} needs a skip-link target`);
    assert.match(html, new RegExp(`<a[^>]*href="#${escapeRegExp(mainId)}"`));
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

    for (const [nav] of html.matchAll(/<nav\b[^>]*>/g)) {
      assert.ok(
        tagAttribute(nav, "aria-label") || tagAttribute(nav, "aria-labelledby"),
        `${route} needs labelled navigation`,
      );
    }
  }

  const home = await readRoute("/");
  const themeControls = [
    ...home.matchAll(/<input\b[^>]*data-theme-control[^>]*>/g),
  ];
  assert.ok(themeControls.length > 0);
  for (const control of themeControls) {
    assert.equal(tagAttribute(control[0], "role"), "switch");
    assert.ok(tagAttribute(control[0], "aria-label"));
  }
});

test("marks the active top-level navigation destination", async () => {
  for (const route of (await builtRoutes()).filter(
    (candidate) => candidate !== "/404/",
  )) {
    const expectedHref = route === "/" ? "/" : `/${route.split("/")[1]}/`;
    const html = await readRoute(route);
    const activeHrefs = [
      ...html.matchAll(/<a\b[^>]*aria-current="page"[^>]*>/g),
    ]
      .map((match) => tagAttribute(match[0], "href"))
      .filter(Boolean);

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

test("renders configured joining and payment actions", async () => {
  const join = await readRoute("/join/");
  const anchors = [...join.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].map(
    ([tag]) => tag,
  );

  for (const link of [knightConnectLink, ...joinSocialLinks]) {
    assert.ok(
      anchors.some((tag) => tagAttribute(tag, "href") === link.href),
      `${link.label} must be linked`,
    );
  }
  for (const option of duesOptions) {
    if (option.href) {
      const anchor = anchors.find(
        (tag) => tagAttribute(tag, "data-dues-link") === option.id,
      );
      assert.ok(anchor, `${option.id} needs a payment link`);
      assert.equal(tagAttribute(anchor, "href"), option.href);
      assert.ok(plainText(anchor).includes(option.label));
      assert.ok(plainText(anchor).includes(option.priceLabel));
    } else {
      const button = [...join.matchAll(/<button\b[^>]*>/g)].find(
        ([tag]) =>
          tagAttribute(tag, "data-dues-link-placeholder") === option.id,
      )?.[0];
      assert.ok(button, `${option.id} needs an unavailable payment action`);
      assert.match(button, /\sdisabled(?:[\s=>])/);
      assert.ok(
        !anchors.some(
          (tag) => tagAttribute(tag, "data-dues-link") === option.id,
        ),
      );
    }
  }
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

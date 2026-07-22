import assert from "node:assert/strict";
import test from "node:test";
import { URL } from "node:url";

import {
  footerEmailLink,
  footerSocialLinks,
  joinChannels,
} from "../src/data/site-content.ts";
import {
  collectionEntries,
  frontmatterValue,
  readSource,
} from "./helpers/site-output.mjs";

const collections = ["events", "officers", "posts", "projects", "sponsors"];
const publicUrlFields = [
  "rsvpUrl",
  "slidesUrl",
  "recordingUrl",
  "linkedin",
  "github",
  "githubUrl",
  "demoUrl",
  "paperUrl",
];
const templateFields = {
  events: [
    "title",
    "description",
    "eventType",
    "startDate",
    "endDate",
    "location",
    "rsvpUrl",
    "slidesUrl",
    "recordingUrl",
  ],
  officers: [
    "name",
    "role",
    "order",
    "program",
    "year",
    "image",
    "linkedin",
    "github",
    "email",
  ],
  posts: ["title", "description", "date", "author", "topics", "draft"],
  projects: [
    "title",
    "description",
    "status",
    "topics",
    "githubUrl",
    "demoUrl",
    "paperUrl",
    "lead",
  ],
  sponsors: ["name", "tier", "description"],
};

function isPlaceholderUrl(value) {
  const url = new URL(value);
  const rootOnlyHosts = new Set([
    "arxiv.org",
    "discord.com",
    "github.com",
    "instagram.com",
    "linkedin.com",
    "www.instagram.com",
    "www.linkedin.com",
  ]);

  return (
    ["example.com", "example.org", "example.net"].includes(url.hostname) ||
    (rootOnlyHosts.has(url.hostname) && url.pathname === "/") ||
    (url.hostname === "knightconnect.campuslabs.com" &&
      url.pathname === "/engage/")
  );
}

test("provides a complete hidden template for every content collection", async () => {
  for (const [collection, fields] of Object.entries(templateFields)) {
    const source = await readSource(`src/content/${collection}/.template.md`);

    for (const field of fields) {
      assert.match(
        source,
        new RegExp(`^${field}:`, "m"),
        `${collection}/.template.md needs an example ${field} field`,
      );
    }
  }
});

test("uses stable lowercase slugs for authored content", async () => {
  for (const collection of collections) {
    for (const entry of await collectionEntries(collection)) {
      assert.match(
        entry.id,
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        `${collection}/${entry.fileName} should produce a stable URL slug`,
      );
    }
  }
});

test("assigns each published officer a unique display order", async () => {
  const officers = await collectionEntries("officers");
  const orders = officers.map((officer) => {
    const order = Number(frontmatterValue(officer.source, "order"));
    assert.ok(Number.isInteger(order), `${officer.fileName} needs an order`);
    return order;
  });

  assert.equal(
    new Set(orders).size,
    orders.length,
    "Officer display order values must be unique",
  );
});

test("does not publish placeholder external resources", async () => {
  const authoredUrls = [];

  for (const collection of collections) {
    for (const entry of await collectionEntries(collection)) {
      for (const field of publicUrlFields) {
        const value = frontmatterValue(entry.source, field);
        if (value)
          authoredUrls.push([
            `${collection}/${entry.fileName}:${field}`,
            value,
          ]);
      }
    }
  }

  const configuredUrls = [
    ...joinChannels.map((link) => [`joinChannels:${link.label}`, link.href]),
    ...footerSocialLinks.map((link) => [
      `footerSocialLinks:${link.label}`,
      link.href,
    ]),
    ["footerEmailLink", footerEmailLink.href],
  ];

  for (const [source, value] of [...authoredUrls, ...configuredUrls]) {
    if (value.startsWith("mailto:")) continue;
    assert.doesNotThrow(
      () => new URL(value),
      `${source} must contain a valid URL`,
    );
    assert.equal(
      isPlaceholderUrl(value),
      false,
      `${source} must link to a real public resource, not ${value}`,
    );
  }
});

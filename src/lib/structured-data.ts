import type { CollectionEntry } from "astro:content";

import { contactEmail, footerSocialLinks } from "../data/site-content";
import { absoluteUrl, defaultSocialImage, siteName, siteUrl } from "./site";

export type JsonLd = Record<string, unknown>;

const organizationId = `${siteUrl}/#organization`;
const websiteId = `${siteUrl}/#website`;

export function organizationJsonLd(): JsonLd {
  return {
    "@type": "Organization",
    "@id": organizationId,
    name: siteName,
    url: siteUrl,
    email: contactEmail,
    sameAs: footerSocialLinks.map((link) => link.href),
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/icon-512.png"),
    },
  };
}

export function websiteJsonLd(): JsonLd {
  return {
    "@type": "WebSite",
    "@id": websiteId,
    name: siteName,
    url: siteUrl,
    publisher: { "@id": organizationId },
  };
}

export function webpageJsonLd({
  canonicalUrl,
  title,
  description,
  image,
}: {
  canonicalUrl: string;
  title: string;
  description: string;
  image: string;
}): JsonLd {
  return {
    "@type": "WebPage",
    "@id": `${canonicalUrl}#webpage`,
    url: canonicalUrl,
    name: title,
    description,
    image,
    isPartOf: { "@id": websiteId },
    about: { "@id": organizationId },
  };
}

export function blogPostingJsonLd({
  post,
  canonicalUrl,
}: {
  post: CollectionEntry<"posts">;
  canonicalUrl: string;
}): JsonLd {
  const author = post.data.author
    ? { "@type": "Person", name: post.data.author }
    : { "@id": organizationId };

  return {
    "@type": "BlogPosting",
    "@id": `${canonicalUrl}#blog-posting`,
    mainEntityOfPage: { "@id": `${canonicalUrl}#webpage` },
    headline: post.data.title,
    description: post.data.description,
    datePublished: post.data.date.toISOString(),
    dateModified: post.data.date.toISOString(),
    author,
    publisher: { "@id": organizationId },
    image: absoluteUrl(defaultSocialImage),
    keywords: post.data.topics,
  };
}

export function eventJsonLd(
  event: CollectionEntry<"events">,
): JsonLd | undefined {
  const data = event.data;

  if (!data.startDate) return undefined;

  const canonicalUrl = absoluteUrl(`/events/${event.id}/`);
  const eventData: JsonLd = {
    "@type": "Event",
    "@id": `${canonicalUrl}#event`,
    name: data.title,
    description: data.description,
    startDate: data.startDate,
    url: canonicalUrl,
    organizer: { "@id": organizationId },
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  };

  if (data.endDate) {
    eventData.endDate = data.endDate;
  }

  if (data.location && data.location !== "TBD") {
    eventData.location = {
      "@type": "Place",
      name: data.location,
      address: data.location,
    };
  }

  return eventData;
}

export function jsonLdScript(graph: JsonLd[]) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": graph,
  }).replaceAll("<", "\\u003c");
}

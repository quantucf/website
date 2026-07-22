import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

import { contentTopics } from "./lib/content";
import { eventTypes } from "./lib/events";

const optionalUrl = z.url().optional();
const topics = z.array(z.enum(contentTopics)).min(1).max(3);
const eventDate = z.union([z.iso.date(), z.iso.datetime({ offset: true })]);

const events = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/events" }),
  schema: z
    .object({
      title: z.string().trim().min(1),
      description: z.string().trim().min(1),
      eventType: z.enum(eventTypes),
      startDate: eventDate.optional(),
      endDate: eventDate.optional(),
      location: z.string().trim().min(1).optional(),
      rsvpUrl: optionalUrl,
      slidesUrl: optionalUrl,
      recordingUrl: optionalUrl,
    })
    .strict()
    .superRefine(({ startDate, endDate }, context) => {
      if (endDate && !startDate) {
        context.addIssue({
          code: "custom",
          message: "endDate requires startDate",
          path: ["endDate"],
        });
      }

      if (
        startDate &&
        endDate &&
        new Date(endDate).getTime() < new Date(startDate).getTime()
      ) {
        context.addIssue({
          code: "custom",
          message: "endDate must not be earlier than startDate",
          path: ["endDate"],
        });
      }
    }),
});

const officers = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/officers" }),
  schema: z
    .object({
      name: z.string().trim().min(1),
      role: z.string().trim().min(1),
      order: z.number().int().nonnegative(),
      program: z.string().optional(),
      year: z.string().optional(),
      image: z.string().optional(),
      linkedin: optionalUrl,
      github: optionalUrl,
      email: z.email().optional(),
    })
    .strict(),
});

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: z
    .object({
      title: z.string().trim().min(1),
      description: z.string().trim().min(1),
      status: z.enum(["active", "completed", "planned"]),
      topics,
      githubUrl: optionalUrl,
      demoUrl: optionalUrl,
      paperUrl: optionalUrl,
      lead: z.string().trim().min(1).optional(),
    })
    .strict(),
});

const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
  schema: z
    .object({
      title: z.string().trim().min(1),
      description: z.string().trim().min(1),
      date: z.coerce.date(),
      author: z.string().trim().min(1).optional(),
      topics,
      draft: z.boolean().default(false),
    })
    .strict(),
});

const sponsors = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/sponsors" }),
  schema: z
    .object({
      name: z.string().trim().min(1),
      tier: z.enum(["Platinum", "Gold", "Silver", "Bronze"]),
      description: z.string().trim().min(1),
    })
    .strict(),
});

export const collections = { events, officers, projects, posts, sponsors };

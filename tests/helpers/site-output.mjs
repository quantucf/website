import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

export { siteUrl as siteOrigin } from "../../src/lib/site.ts";

export function outputPath(route) {
  if (route === "/") return path.resolve("dist/index.html");
  if (route === "/404/") return path.resolve("dist/404.html");

  return path.resolve("dist", route.slice(1), "index.html");
}

export function staticOutputPath(filePath) {
  return path.resolve("dist", filePath);
}

export function readRoute(route) {
  return readFile(outputPath(route), "utf8");
}

export async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function walkFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? walkFiles(entryPath) : [entryPath];
    }),
  );

  return files.flat().sort();
}

export async function builtHtmlFiles() {
  return (await walkFiles(path.resolve("dist"))).filter((filePath) =>
    filePath.endsWith(".html"),
  );
}

export function routeFromOutputPath(filePath) {
  const relativePath = path.relative(path.resolve("dist"), filePath);

  if (relativePath === "index.html") return "/";
  if (relativePath === "404.html") return "/404/";

  return `/${relativePath.replace(/index\.html$/, "")}`;
}

export async function builtRoutes() {
  return (await builtHtmlFiles()).map(routeFromOutputPath).sort();
}

export function localOutputPath(pathname) {
  const decodedPath = decodeURIComponent(pathname);

  if (decodedPath === "/") return staticOutputPath("index.html");
  if (decodedPath === "/404/") return staticOutputPath("404.html");
  if (decodedPath.endsWith("/")) {
    return staticOutputPath(path.join(decodedPath.slice(1), "index.html"));
  }

  return staticOutputPath(decodedPath.slice(1));
}

export async function collectionEntries(collection) {
  const directory = path.resolve("src/content", collection);
  const entries = await readdir(directory, { withFileTypes: true });

  return Promise.all(
    entries
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.endsWith(".md") &&
          !entry.name.startsWith("."),
      )
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(async (entry) => ({
        fileName: entry.name,
        id: entry.name.replace(/\.md$/, ""),
        source: await readFile(path.join(directory, entry.name), "utf8"),
      })),
  );
}

export function frontmatterValue(source, field) {
  return source
    .match(new RegExp(`^${field}:[ \t]*(.+?)[ \t]*$`, "m"))?.[1]
    ?.replace(/^(["'])(.*)\1$/, "$2");
}

export function tagAttribute(tag, attribute) {
  return tag.match(new RegExp(`\\b${attribute}="([^"]*)"`))?.[1];
}

export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

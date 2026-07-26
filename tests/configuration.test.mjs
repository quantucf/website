import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

import { readSource, staticOutputPath } from "./helpers/site-output.mjs";

test("uses the expected Vercel static deployment settings", async () => {
  const config = JSON.parse(await readFile("vercel.json", "utf8"));

  assert.deepEqual(config, {
    framework: "astro",
    installCommand: "pnpm install --frozen-lockfile",
    buildCommand: "pnpm build",
    outputDirectory: "dist",
  });
});

test("loads Vercel observability from the shared layout", async () => {
  const layout = await readSource("src/layouts/BaseLayout.astro");
  const packageManifest = JSON.parse(await readFile("package.json", "utf8"));

  assert.ok(packageManifest.dependencies["@vercel/analytics"]);
  assert.ok(packageManifest.dependencies["@vercel/speed-insights"]);
  assert.match(layout, /import Analytics from "@vercel\/analytics\/astro"/);
  assert.match(
    layout,
    /import SpeedInsights from "@vercel\/speed-insights\/astro"/,
  );
  assert.match(layout, /<Analytics \/>/);
  assert.match(layout, /<SpeedInsights \/>/);
});

test("keeps the final UCF accent token consistent across themes", async () => {
  const styles = await readSource("src/styles/global.css");
  const lightAccent = styles.match(
    /:root\s*{[\s\S]*?--theme-accent:\s*(#[0-9a-f]+);/i,
  )?.[1];
  const darkAccent = styles.match(
    /html\[data-theme="dark"\]\s*{[\s\S]*?--theme-accent:\s*(#[0-9a-f]+);/i,
  )?.[1];
  assert.equal(lightAccent, "#ffc904");
  assert.equal(darkAccent, lightAccent);
});

test("uses accessible foreground colours for accent typography", async () => {
  const sourcePaths = (await readdir("src", { recursive: true }))
    .filter((path) => /\.(astro|css|ts|tsx)$/.test(path))
    .map((path) => `src/${path}`);

  for (const sourcePath of sourcePaths) {
    const source = await readSource(sourcePath);

    assert.doesNotMatch(
      source,
      /\b(?:hover:|active:)?text-accent(?!-)/,
      `${sourcePath} must not use brand yellow as a foreground utility`,
    );
  }

  const styles = await readSource("src/styles/global.css");
  assert.match(
    styles,
    /\.accent-text\s*\{[^}]*color:\s*var\(--color-foreground\)/,
  );
  assert.match(
    styles,
    /html\[data-theme="dark"\]\s+\.accent-text\s*\{[^}]*color:\s*var\(--color-accent\)/,
  );
});

test("publishes an llms.txt file that follows the proposal and Lighthouse checks", async () => {
  const llmsText = await readFile(staticOutputPath("llms.txt"), "utf8");
  const [preamble, ...sectionParts] = llmsText.split(/^##\s+(.+)\s*$/m);

  assert.ok(llmsText.length >= 50);
  assert.equal((llmsText.match(/^#\s+.+/gm) ?? []).length, 1);
  assert.match(preamble, /^#\s+.+/);
  assert.match(preamble, /^>\s+.+/m);
  assert.equal(sectionParts.length % 2, 0);

  const sectionTitles = [];
  const linkedUrls = new Set();

  for (let index = 0; index < sectionParts.length; index += 2) {
    const title = sectionParts[index].trim();
    const lines = sectionParts[index + 1].trim().split(/\n+/);

    sectionTitles.push(title);
    assert.ok(lines.length > 0, `${title} must contain at least one link`);

    for (const line of lines) {
      const link = line.match(
        /^-\s+\[([^\]]+)\]\((https:\/\/[^)]+)\)(?::\s+(.+))?$/,
      );

      assert.ok(link, `${title} contains an invalid file-list item: ${line}`);
      assert.equal(
        linkedUrls.has(link[2]),
        false,
        `${link[2]} must be listed only once`,
      );
      linkedUrls.add(link[2]);
    }
  }

  const optionalIndex = sectionTitles.indexOf("Optional");
  if (optionalIndex >= 0) {
    assert.equal(optionalIndex, sectionTitles.length - 1);
  }
});

test("keeps primary button hover colours paired", async () => {
  const linkButton = await readSource("src/components/ui/LinkButton.astro");
  const primaryVariant = linkButton.match(/primary:\s*"([^"]+)"/)?.[1];

  assert.ok(primaryVariant, "Primary button variant should be defined");
  assert.match(primaryVariant, /hover:bg-foreground/);
  assert.match(primaryVariant, /hover:text-background/);
});

test("pairs every hover utility with equivalent pressed feedback", async () => {
  const sourcePaths = (await readdir("src", { recursive: true }))
    .filter((path) => /\.(astro|css|ts|tsx)$/.test(path))
    .map((path) => `src/${path}`);

  for (const sourcePath of sourcePaths) {
    const source = await readSource(sourcePath);
    const hoverUtilities = source.matchAll(/\bhover:([^\s"'`,}]+)/g);

    for (const [, utility] of hoverUtilities) {
      assert.ok(
        source.includes(`active:${utility}`),
        `${sourcePath} must pair hover:${utility} with active:${utility}`,
      );
    }
  }
});

test("uses custom touch feedback without colour interpolation", async () => {
  const styles = await readSource("src/styles/global.css");
  const layout = await readSource("src/layouts/BaseLayout.astro");
  const navigation = await readSource("src/components/layout/Navbar.astro");

  assert.match(styles, /-webkit-tap-highlight-color:\s*transparent/);
  assert.match(styles, /@media \(hover: none\) and \(pointer: coarse\)/);
  assert.match(
    styles,
    /:where\(a, button, summary\)\s*\{[^}]*transition:\s*none/,
  );
  assert.match(
    layout,
    /addEventListener\("touchstart", \(\) => \{\}, \{ passive: true \}\)/,
  );
  assert.match(navigation, /data-mobile-navigation/);
  assert.match(navigation, /draggable="false"/);
  assert.match(navigation, /touch-manipulation/);
  assert.match(
    styles,
    /\[data-mobile-navigation\] a[\s\S]*-webkit-user-drag:\s*none/,
  );
});

test("localizes rendered dates with the end user's browser locale", async () => {
  const localizedDate = await readSource(
    "src/components/ui/LocalizedDate.astro",
  );

  assert.match(localizedDate, /new Intl\.DateTimeFormat\(undefined, options\)/);
});

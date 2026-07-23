import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

import { readSource } from "./helpers/site-output.mjs";

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

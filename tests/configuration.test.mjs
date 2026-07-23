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

test("keeps touch feedback neutral in iOS Safari", async () => {
  const styles = await readSource("src/styles/global.css");
  const layout = await readSource("src/layouts/BaseLayout.astro");

  assert.doesNotMatch(styles, /-webkit-tap-highlight-color/);
  assert.match(
    layout,
    /addEventListener\("touchstart", \(\) => \{\}, \{ passive: true \}\)/,
  );
});

test("localizes rendered dates with the end user's browser locale", async () => {
  const localizedDate = await readSource(
    "src/components/ui/LocalizedDate.astro",
  );

  assert.match(localizedDate, /new Intl\.DateTimeFormat\(undefined, options\)/);
});

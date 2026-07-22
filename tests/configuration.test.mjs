import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

test("localizes rendered dates with the end user's browser locale", async () => {
  const localizedDate = await readSource(
    "src/components/ui/LocalizedDate.astro",
  );

  assert.match(localizedDate, /new Intl\.DateTimeFormat\(undefined, options\)/);
});

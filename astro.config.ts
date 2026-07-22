import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://quantucf.com",
  vite: {
    plugins: [tailwindcss()],
  },
});

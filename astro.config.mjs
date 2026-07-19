import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://qihanqiu980-gif.github.io",
  output: "static",
  trailingSlash: "always",
  build: {
    format: "directory"
  }
});
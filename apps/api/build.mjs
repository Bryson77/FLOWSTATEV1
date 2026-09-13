import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import { rm } from "node:fs/promises";

const apiDir = path.dirname(fileURLToPath(import.meta.url));

async function buildAll() {
  const distDir = path.resolve(apiDir, "dist");
  await rm(distDir, { recursive: true, force: true });

  await esbuild({
    entryPoints: [path.resolve(apiDir, "src/index.ts")],
    platform: "browser",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".js" },
    logLevel: "info",
    sourcemap: "linked",
    external: ["cloudflare:*", "cloudflare:sockets", "node:*", "node:async_hooks", "node:crypto"],
    conditions: ["workerd", "worker", "browser"],
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});

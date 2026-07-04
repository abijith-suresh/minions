import { build } from "esbuild";

await build({
  bundle: true,
  entryPoints: ["src/server.ts", "src/tui.ts"],
  format: "esm",
  outdir: "dist",
  platform: "node",
  sourcemap: true,
  target: "node22",
});

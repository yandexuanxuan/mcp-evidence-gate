import { build } from "esbuild";

await build({
  entryPoints: ["src/action.ts"],
  bundle: true,
  platform: "node",
  target: "node24",
  format: "cjs",
  outfile: "dist/action/index.cjs",
  sourcemap: false
});

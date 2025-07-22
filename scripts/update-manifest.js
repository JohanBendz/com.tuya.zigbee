import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

async function main() {
  const cp = join(process.cwd(), ".homeycompose", "app.json");
  let content;
  try { content = JSON.parse(readFileSync(cp, "utf-8")); }
  catch (e) { console.error("Cannot read manifest:", e.message); process.exit(1); }
  const minimal = {
    id:            content.id,
    version:       content.version,
    compatibility: content.compatibility,
    platforms:     content.platforms,
    sdk:           content.sdk,
    name:          content.name,
    description:   content.description,
    tags:          content.tags
  };
  writeFileSync("app.json", JSON.stringify(minimal, null, 2) + "\n", "utf-8");
}

main();

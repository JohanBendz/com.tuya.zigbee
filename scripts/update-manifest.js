import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

async function main() {
  const composePath = join(process.cwd(), ".homeycompose", "app.json");
  const outputPath  = join(process.cwd(), "app.json");
  const content = JSON.parse(readFileSync(composePath, "utf-8"));
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
  writeFileSync(outputPath, JSON.stringify(minimal, null, 2) + "\n", "utf-8");
  console.log(`✅ app.json mis à jour (version ${minimal.version})`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const themeYaml = resolve(dirname(fileURLToPath(import.meta.url)), "..", "theme.yaml");
const source = readFileSync(themeYaml, "utf8");
const match = source.match(/^(\s*version:\s*")(\d+)\.(\d+)\.(\d+)(")/m);
if (!match) {
  console.error('[ERROR] theme.yaml 未找到 version: "x.y.z"');
  process.exit(1);
}

const nextPatch = Number(match[4]) + 1;
const previous = `${match[2]}.${match[3]}.${match[4]}`;
const next = `${match[2]}.${match[3]}.${nextPatch}`;
writeFileSync(themeYaml, source.replace(match[0], `${match[1]}${next}${match[5]}`));
console.log(`[INFO] 版本 ${previous} -> ${next}`);

// CI lint pass: every rules/<id>/rule.yaml must validate against
// schema/rule.schema.json, and the directory name must match the rule id.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import YAML from "yaml";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const rulesDir = join(repoRoot, "rules");
const schemaPath = join(repoRoot, "schema", "rule.schema.json");

const ajv = new Ajv({ allErrors: true, strict: false });
const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
const validate = ajv.compile(schema);

const seenIds = new Set<string>();
let failed = 0;

for (const entry of readdirSync(rulesDir)) {
  const rulePath = join(rulesDir, entry);
  if (!statSync(rulePath).isDirectory()) continue;

  const yamlPath = join(rulePath, "rule.yaml");
  let rule: { id?: string };
  try {
    rule = YAML.parse(readFileSync(yamlPath, "utf8"));
  } catch (err) {
    process.stderr.write(`✘ ${yamlPath}: YAML parse failed: ${(err as Error).message}\n`);
    failed++;
    continue;
  }

  if (!validate(rule)) {
    process.stderr.write(`✘ ${yamlPath}: schema violations:\n`);
    for (const e of validate.errors ?? []) {
      process.stderr.write(`    ${e.instancePath || "<root>"} ${e.message}\n`);
    }
    failed++;
    continue;
  }

  // The rule id must round-trip with the directory name so that the
  // install URL produced by the site is deterministic.
  const expectedDir = (rule.id ?? "").split(".").pop();
  if (expectedDir !== entry) {
    process.stderr.write(
      `✘ ${yamlPath}: directory name "${entry}" does not match the id suffix "${expectedDir}"\n`,
    );
    failed++;
    continue;
  }

  if (seenIds.has(rule.id!)) {
    process.stderr.write(`✘ ${yamlPath}: duplicate rule id "${rule.id}"\n`);
    failed++;
    continue;
  }
  seenIds.add(rule.id!);

  process.stdout.write(`✓ ${rule.id}\n`);
}

if (failed > 0) {
  process.stderr.write(`\n${failed} validation error(s)\n`);
  process.exit(1);
}
process.stdout.write(`\nall ${seenIds.size} rule(s) valid\n`);

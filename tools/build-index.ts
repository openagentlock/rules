// Walk rules/, parse rule.yaml + adjacent README.md, emit site/data/index.json.
//
// The site fetches this file at runtime to drive search + the install
// command panel. We commit the generated index for now so GitHub Pages
// can serve it without a build step; CI will re-run this on every PR
// merge so it stays in sync with the rule corpus.

import { readdirSync, readFileSync, writeFileSync, statSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

interface RuleIndexEntry {
  id: string;
  name: string;
  description: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  tags: string[];
  authors: { name?: string; github: string }[];
  license: string;
  compatible_agentlock?: string;
  action: string;
  path: string;
  readme_excerpt: string;
}

interface RuleFile {
  schema_version: number;
  id: string;
  name: string;
  description: string;
  severity: RuleIndexEntry["severity"];
  tags?: string[];
  authors?: { name?: string; github: string }[];
  license?: string;
  compatible_agentlock?: string;
  gate: {
    match?: Record<string, unknown>;
    evaluate: Array<{ kind: string; action: string }>;
    mode?: string;
    disabled?: boolean;
  };
}

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const rulesDir = join(repoRoot, "rules");
const outDir = join(repoRoot, "site", "data");
const outFile = join(outDir, "index.json");

function readmeExcerpt(readme: string): string {
  const stripped = readme
    .replace(/^#.*$/gm, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length > 240 ? stripped.slice(0, 237) + "..." : stripped;
}

function buildIndex(): RuleIndexEntry[] {
  const out: RuleIndexEntry[] = [];
  for (const entry of readdirSync(rulesDir)) {
    const rulePath = join(rulesDir, entry);
    if (!statSync(rulePath).isDirectory()) continue;

    const yamlPath = join(rulePath, "rule.yaml");
    const rule = YAML.parse(readFileSync(yamlPath, "utf8")) as RuleFile;

    let readme = "";
    try {
      readme = readFileSync(join(rulePath, "README.md"), "utf8");
    } catch {
      // README is optional but recommended.
    }

    out.push({
      id: rule.id,
      name: rule.name,
      description: rule.description.trim(),
      severity: rule.severity,
      tags: rule.tags ?? [],
      authors: rule.authors ?? [],
      license: rule.license ?? "Apache-2.0",
      compatible_agentlock: rule.compatible_agentlock,
      action: rule.gate.evaluate?.[0]?.action ?? "deny",
      path: `rules/${entry}/rule.yaml`,
      readme_excerpt: readmeExcerpt(readme),
    });
  }
  out.sort((a, b) => a.id.localeCompare(b.id));
  return out;
}

const index = buildIndex();
mkdirSync(outDir, { recursive: true });
writeFileSync(
  outFile,
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      registry: "openagentlock/rules",
      count: index.length,
      rules: index,
    },
    null,
    2,
  ) + "\n",
);
process.stdout.write(`wrote ${index.length} rules to ${outFile}\n`);

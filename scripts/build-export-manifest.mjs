import { execFileSync } from "node:child_process";
import {
  createHash,
} from "node:crypto";
import {
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { relative, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const manifestPath = resolve(root, "PUBLIC_EXPORT_MANIFEST.json");
const sumsPath = resolve(root, "PUBLIC_EXPORT_SHA256SUMS.txt");
const excludedDirectories = new Set([
  ".git",
  ".next",
  ".superpowers",
  ".vercel",
  "node_modules",
  "playwright-report",
  "test-results",
]);
const excludedFiles = new Set([
  "PUBLIC_EXPORT_MANIFEST.json",
  "PUBLIC_EXPORT_SHA256SUMS.txt",
  "next-env.d.ts",
]);

function toPortablePath(path) {
  return relative(root, path).split(sep).join("/");
}

function walk(directory, files = []) {
  for (const entry of readdirSync(directory)) {
    if (excludedDirectories.has(entry)) continue;
    const absolute = resolve(directory, entry);
    const portable = toPortablePath(absolute);
    const stat = statSync(absolute);
    if (stat.isDirectory()) {
      walk(absolute, files);
    } else if (
      !excludedFiles.has(portable) &&
      !portable.endsWith(".tsbuildinfo") &&
      !portable.endsWith(".log")
    ) {
      files.push(absolute);
    }
  }
  return files;
}

function classify(path) {
  if (path.startsWith("assets/") || path.startsWith("licenses/")) {
    return "third-party-licensed";
  }
  if (
    path === "src/lib/public-index.generated.json" ||
    path === "public/apple-icon.png" ||
    path === "public/icon-192.png" ||
    path === "public/icon-512.png"
  ) {
    return "generated-public";
  }
  if (
    path === "AGENTS.md" ||
    path === "CHALLENGE_BASELINE.md" ||
    path === "README.md" ||
    path === "THIRD_PARTY_NOTICES.md" ||
    path.startsWith("docs/") ||
    path.startsWith("scripts/")
  ) {
    return "challenge-repository-metadata";
  }
  return "sanitized-foundation";
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

const checking = process.argv.includes("--check");
let generatedAt = new Date().toISOString();
if (checking) {
  const current = JSON.parse(readFileSync(manifestPath, "utf8"));
  generatedAt = current.generatedAt;
}

// Only files git would export may appear in the public manifest. Tracked and
// untracked-but-not-ignored files qualify; anything matched by .gitignore is
// excluded so a local-only file can never leak its name or hash into the
// committed manifest and checksum list.
function gitExportablePaths() {
  const output = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: root, encoding: "utf8" },
  );
  return new Set(output.split("\0").filter(Boolean));
}

const exportable = gitExportablePaths();

const files = walk(root)
  .filter((absolute) => exportable.has(toPortablePath(absolute)))
  .map((absolute) => {
    const path = toPortablePath(absolute);
    return {
      path,
      classification: classify(path),
      sha256: sha256(absolute),
    };
  })
  .sort((a, b) => a.path.localeCompare(b.path));

const manifest = {
  schemaVersion: 1,
  generatedAt,
  sourceSnapshot: {
    commit: "6e135e4f125f14ab2a877ad5ee70dcf7315913bf",
    date: "2026-08-06",
  },
  metadataFilesExcludedFromChecksumSet: [
    "PUBLIC_EXPORT_MANIFEST.json",
    "PUBLIC_EXPORT_SHA256SUMS.txt",
  ],
  excludedCategories: [
    "original Git history and repository metadata",
    "production and provider configuration",
    "private model, retrieval, persistence, analytics, and query-log implementation",
    "internal plans and unrelated experiments",
    "generated embeddings and evaluation reports",
    "unpublished audio and unapproved personal media",
  ],
  files,
};

const manifestOutput = `${JSON.stringify(manifest, null, 2)}\n`;
const sumsOutput = `${files.map((file) => `${file.sha256}  ${file.path}`).join("\n")}\n`;

if (checking) {
  if (readFileSync(manifestPath, "utf8") !== manifestOutput) {
    throw new Error("PUBLIC_EXPORT_MANIFEST.json is stale");
  }
  if (readFileSync(sumsPath, "utf8") !== sumsOutput) {
    throw new Error("PUBLIC_EXPORT_SHA256SUMS.txt is stale");
  }
  console.log(`Export manifest is current for ${files.length} files.`);
} else {
  writeFileSync(manifestPath, manifestOutput, "utf8");
  writeFileSync(sumsPath, sumsOutput, "utf8");
  console.log(`Generated export manifest for ${files.length} files.`);
}

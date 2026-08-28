import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ELIJAH } from "../src/lib/elijah";

type ClusterInput = {
  id: string;
  items: string[];
};

const clusters: ClusterInput[] = [
  {
    id: "about",
    items: [
      ...ELIJAH.longBio.map((_, index) => `bio-${index + 1}`),
      ...ELIJAH.pillars.map((pillar) => `pillar-${pillar.k}`),
      ...ELIJAH.publicAnswers.map((answer) => `answer-${answer.id}`),
    ],
  },
  {
    id: "projects",
    items: ELIJAH.projects.map((project) => `project-${project.id}`),
  },
  {
    id: "resume",
    items: [
      ...ELIJAH.experience.map((entry, index) => `experience-${index}-${entry.role}`),
      ...ELIJAH.education.map((entry, index) => `education-${index}-${entry.school}`),
    ],
  },
  {
    id: "contact",
    items: Object.keys(ELIJAH.contact).map((key) => `contact-${key}`),
  },
  {
    id: "core",
    items: [
      "identity-name",
      "identity-role",
      "identity-location",
      ...ELIJAH.comparison.map((_, index) => `comparison-${index + 1}`),
    ],
  },
];

function hash(value: string): number {
  let result = 0x811c9dc5;
  for (const char of value) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 0x01000193);
  }
  return result >>> 0;
}

function coordinate(id: string, axis: "x" | "y" | "z"): number {
  return Number((((hash(`${axis}:${id}`) % 2001) - 1000) / 1000).toFixed(3));
}

function buildIndex() {
  const max = Math.max(...clusters.map((cluster) => cluster.items.length));
  const points = clusters.flatMap((cluster, clusterIndex) =>
    cluster.items.map((id) => ({
      id,
      c: clusterIndex,
      x: coordinate(id, "x"),
      y: coordinate(id, "y"),
      z: coordinate(id, "z"),
    })),
  );

  return {
    total: points.length,
    clusters: clusters.map((cluster) => ({
      id: cluster.id,
      chunks: cluster.items.length,
      weight: cluster.items.length / max,
    })),
    points,
  };
}

const outputPath = resolve("src/lib/public-index.generated.json");
const output = `${JSON.stringify(buildIndex(), null, 2)}\n`;

if (process.argv.includes("--check")) {
  const current = readFileSync(outputPath, "utf8");
  if (current !== output) {
    throw new Error("public-index.generated.json is stale; run npm run build:public-index");
  }
} else {
  writeFileSync(outputPath, output, "utf8");
  console.log("Generated src/lib/public-index.generated.json from public typed content.");
}

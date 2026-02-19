import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const electronRoot = path.join(root, "out");
const tauriRoot = path.join(root, "src-tauri", "target", "release", "bundle");
const metricsRoot = path.join(root, "migration-metrics");
const artifactNamePattern = /mantle/i;

const artifactExtensions = new Set([".app", ".dmg", ".zip"]);

const bytesToMb = (bytes) => Number((bytes / 1024 / 1024).toFixed(2));

const formatBytes = (bytes) => `${bytesToMb(bytes)} MB`;

const walkArtifacts = async (dirPath, collector) => {
  let entries;

  try {
    entries = await readdir(dirPath, { withFileTypes: true });
  } catch {
    return;
  }

  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        if (entry.name.endsWith(".app")) {
          if (!artifactNamePattern.test(entry.name)) {
            return;
          }

          const sizeBytes = await getDirectorySize(entryPath);
          collector.push({
            path: path.relative(root, entryPath),
            sizeBytes,
          });
          return;
        }

        await walkArtifacts(entryPath, collector);
        return;
      }

      const ext = path.extname(entry.name);
      if (artifactExtensions.has(ext)) {
        if (!artifactNamePattern.test(entry.name)) {
          return;
        }

        const fileStat = await stat(entryPath);
        collector.push({
          path: path.relative(root, entryPath),
          sizeBytes: fileStat.size,
        });
      }
    }),
  );
};

const getDirectorySize = async (dirPath) => {
  let total = 0;
  const entries = await readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      total += await getDirectorySize(entryPath);
      continue;
    }

    const fileStat = await stat(entryPath);
    total += fileStat.size;
  }

  return total;
};

const summarize = (artifacts) => {
  const totalBytes = artifacts.reduce((sum, artifact) => sum + artifact.sizeBytes, 0);

  return {
    count: artifacts.length,
    totalBytes,
    totalMb: bytesToMb(totalBytes),
    largestArtifact: artifacts
      .slice()
      .sort((a, b) => b.sizeBytes - a.sizeBytes)
      .at(0) ?? null,
  };
};

const printGroup = (label, artifacts, summary) => {
  console.log(`\n${label} artifacts (${summary.count})`);
  if (artifacts.length === 0) {
    console.log("- none found (build first)");
    return;
  }

  artifacts
    .slice()
    .sort((a, b) => b.sizeBytes - a.sizeBytes)
    .forEach((artifact) => {
      console.log(`- ${artifact.path}: ${formatBytes(artifact.sizeBytes)}`);
    });
  console.log(`Total: ${formatBytes(summary.totalBytes)}`);
};

const main = async () => {
  const electronArtifacts = [];
  const tauriArtifacts = [];

  await walkArtifacts(electronRoot, electronArtifacts);
  await walkArtifacts(tauriRoot, tauriArtifacts);

  const electronSummary = summarize(electronArtifacts);
  const tauriSummary = summarize(tauriArtifacts);

  printGroup("Electron", electronArtifacts, electronSummary);
  printGroup("Tauri", tauriArtifacts, tauriSummary);

  const percentDelta =
    electronSummary.totalBytes > 0
      ? Number(
          (((tauriSummary.totalBytes - electronSummary.totalBytes) / electronSummary.totalBytes) * 100).toFixed(2),
        )
      : null;

  const snapshot = {
    generatedAt: new Date().toISOString(),
    electron: {
      ...electronSummary,
      artifacts: electronArtifacts,
    },
    tauri: {
      ...tauriSummary,
      artifacts: tauriArtifacts,
    },
    delta: {
      tauriMinusElectronBytes: tauriSummary.totalBytes - electronSummary.totalBytes,
      tauriMinusElectronPercent: percentDelta,
    },
    runtimeMetrics: {
      startupMs: {
        electron: null,
        tauri: null,
      },
      memoryMb: {
        electron: null,
        tauri: null,
      },
      notes: "Populate startup/memory values after manual scenario runs.",
    },
  };

  await mkdir(metricsRoot, { recursive: true });
  const fileName = `build-metrics-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const outputPath = path.join(metricsRoot, fileName);
  await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

  console.log(`\nWrote snapshot: ${path.relative(root, outputPath)}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

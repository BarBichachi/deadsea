// Builds the encrypted per-person files for the static mirror from a dataset JSON.
// Usage: node scripts/build-static-data.mjs <dataset.json> <salt.txt> <outDir>
// Runs in the public mirror's GitHub Action (Node 24 strips the TypeScript types of the shared modules).
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseDataset } from '../shared/dataset.ts';
import { buildScheduleIndex } from '../shared/schedule.ts';
import { deriveAccess, SEAL_ITERATIONS, sealSchedule } from '../shared/sealed.ts';

const [datasetPath, saltPath, outDir] = process.argv.slice(2);
if (!datasetPath || !saltPath || !outDir) {
  console.error('Usage: node scripts/build-static-data.mjs <dataset.json> <salt.txt> <outDir>');
  process.exit(2);
}

let dataset;
let salt;
try {
  dataset = parseDataset(readFileSync(datasetPath, 'utf8'));
  salt = readFileSync(saltPath, 'utf8').trim();
} catch (err) {
  console.error(`ERROR: cannot read inputs: ${err.message}`);
  process.exit(1);
}
if (salt.length < 16) {
  console.error('ERROR: salt must be at least 16 characters');
  process.exit(1);
}

// Start clean so people removed from the schedule disappear from the site
mkdirSync(outDir, { recursive: true });
for (const file of readdirSync(outDir)) if (file.endsWith('.json')) rmSync(join(outDir, file));

const index = buildScheduleIndex(dataset);
const started = Date.now();
await Promise.all(
  [...index].map(async ([id, items]) => {
    const access = await deriveAccess(id, salt, SEAL_ITERATIONS);
    writeFileSync(join(outDir, `${access.name}.json`), JSON.stringify(await sealSchedule({ id, items }, access)));
  }),
);

const meta = { version: dataset.version, updatedAt: dataset.updatedAt, salt, iterations: SEAL_ITERATIONS };
writeFileSync(join(outDir, 'meta.json'), JSON.stringify(meta));
console.log(`Sealed ${index.size} schedules (version ${dataset.version}) in ${Date.now() - started} ms -> ${outDir}`);

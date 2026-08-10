// One-time import: public/data/weight-history.json -> Firestore `weightEntries`.
// The JSON only carries "M/D" per row with no year, but it's a continuous
// daily log, so real dates are inferred by counting back from the file's
// last row. Anchored to the file's mtime rather than "now" at script-run
// time — the file can go stale between being saved and being imported (as
// happened here: last row was "8/06" but the script ran on the 10th), and
// mtime still matches the content even when wall-clock time has drifted.
//
// Usage: node scripts/import-weight-history.js

const { readFile, stat } = require("fs/promises");
const path = require("path");
const { Firestore } = require("@google-cloud/firestore");

function formatLocalDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function main() {
  const filePath = path.join(__dirname, "..", "public", "data", "weight-history.json");
  const raw = await readFile(filePath, "utf-8");
  const parsed = JSON.parse(raw);
  const rows = parsed.outcome.results;

  const fileStat = await stat(filePath);
  const lastDate = new Date(fileStat.mtime);
  lastDate.setHours(0, 0, 0, 0);

  const expectedLastLabel = `${lastDate.getMonth() + 1}/${String(lastDate.getDate()).padStart(2, "0")}`;
  if (rows[rows.length - 1].date !== expectedLastLabel) {
    throw new Error(
      `File mtime (${formatLocalDateValue(lastDate)}, label "${expectedLastLabel}") doesn't match the last row's label ("${rows[rows.length - 1].date}") — refusing to guess; check the file.`,
    );
  }

  const entries = rows.map((row, index) => {
    const date = new Date(lastDate);
    date.setDate(lastDate.getDate() - (rows.length - 1 - index));
    return { date: formatLocalDateValue(date), total: row.total };
  });

  const firestore = new Firestore();
  const collection = firestore.collection("weightEntries");

  const BATCH_SIZE = 400;
  let written = 0;
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = firestore.batch();
    for (const entry of entries.slice(i, i + BATCH_SIZE)) {
      batch.set(collection.doc(entry.date), {
        date: entry.date,
        total: entry.total,
        updatedAt: new Date(),
      });
    }
    await batch.commit();
    written += Math.min(BATCH_SIZE, entries.length - i);
    console.log(`Wrote ${written}/${entries.length}`);
  }

  console.log(`Done. First: ${entries[0].date}, last: ${entries[entries.length - 1].date}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import fs from "node:fs/promises";
import path from "node:path";
import Papa from "papaparse";
import type { InstagramPost, SourceInstagramRow } from "@/lib/types";
import { normalizeRows } from "@/lib/parsers";

const CSV_PATH = path.join(process.cwd(), "data", "instagram-posts.csv");

export async function loadInstagramPosts(): Promise<InstagramPost[]> {
  const csv = await fs.readFile(CSV_PATH, "utf8");
  const parsed = Papa.parse<SourceInstagramRow>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.replace(/^\uFEFF/, "").trim()
  });

  if (parsed.errors.length) {
    console.warn("CSV parse warnings", parsed.errors.slice(0, 5));
  }

  const deduped = new Map<string, SourceInstagramRow>();
  for (const row of parsed.data) {
    const id = row["Identificação do post"];
    if (id) deduped.set(String(id), row);
  }

  return normalizeRows(Array.from(deduped.values()));
}

import fs from "node:fs/promises";
import path from "node:path";
import Papa from "papaparse";
import type { InstagramStory, SourceInstagramStoryRow } from "@/lib/types";
import { parseMetaDate, parseNumber } from "@/lib/parsers";
import { safeRatio } from "@/lib/metrics";

const CSV_PATH = path.join(process.cwd(), "data", "instagram-stories.csv");

function value(row: SourceInstagramStoryRow, label: string) {
  const key = Object.keys(row).find((item) => item.trim() === label);
  return key ? row[key] : "";
}

export async function loadInstagramStories(): Promise<InstagramStory[]> {
  const csv = await fs.readFile(CSV_PATH, "utf8");
  const parsed = Papa.parse<SourceInstagramStoryRow>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.replace(/^\uFEFF/, "").trim()
  });

  const stories = new Map<string, InstagramStory>();
  for (const row of parsed.data) {
    const id = value(row, "Identificação do post");
    const publishedAt = parseMetaDate(value(row, "Horário de publicação"));
    if (!id || !publishedAt) continue;

    const views = parseNumber(value(row, "Visualizações"));
    const reach = parseNumber(value(row, "Alcance"));
    const likes = parseNumber(value(row, "Curtidas"));
    const shares = parseNumber(value(row, "Compartilhamentos"));
    const profileVisits = parseNumber(value(row, "Visitas ao perfil")) || parseNumber(value(row, "Profile visits"));
    const replies = parseNumber(value(row, "Respostas"));
    const linkClicks = parseNumber(value(row, "Cliques no link"));
    const navigation = parseNumber(value(row, "Navegação"));
    const follows = parseNumber(value(row, "Seguimentos"));
    const stickerTaps = parseNumber(value(row, "Toques em figurinhas"));
    const actions = likes + shares + profileVisits + replies + linkClicks + follows + stickerTaps;

    stories.set(id, {
      id,
      description: value(row, "Descrição"),
      publishedAt: publishedAt.toISOString(),
      permanentLink: value(row, "Link permanente"),
      views,
      reach,
      likes,
      shares,
      profileVisits,
      replies,
      linkClicks,
      navigation,
      follows,
      stickerTaps,
      actions,
      reachRate: safeRatio(reach, views),
      actionRate: safeRatio(actions, reach),
      navigationRate: safeRatio(navigation, views)
    });
  }

  return Array.from(stories.values());
}

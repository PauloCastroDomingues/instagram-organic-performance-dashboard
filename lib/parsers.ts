import type { InstagramPost, SourceInstagramRow } from "@/lib/types";
import { median, safeRatio } from "@/lib/metrics";

export function parseNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const raw = String(value).trim();
  if (!raw) return 0;
  const normalized = raw
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseMetaDate(value: unknown): Date | null {
  const raw = String(value ?? "").trim();
  if (!raw || raw.toLowerCase() === "total") return null;
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!match) return null;
  const [, month, day, year, hour = "0", minute = "0"] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function normalizePostType(value: string): string {
  return value.replace(" do Instagram", "").trim() || "Não informado";
}

export function normalizeRows(rows: SourceInstagramRow[]): InstagramPost[] {
  const basePosts: InstagramPost[] = rows
    .map((row): InstagramPost | null => {
      const publishedAtDate = parseMetaDate(row["Horário de publicação"]);
      const reach = parseNumber(row["Alcance"]);
      const views = parseNumber(row["Visualizações"]);
      const likes = parseNumber(row["Curtidas"]);
      const shares = parseNumber(row["Compartilhamentos"]);
      const follows = parseNumber(row["Seguimentos"]);
      const comments = parseNumber(row["Comentários"]);
      const saves = parseNumber(row["Salvamentos"]);
      const interactions = likes + shares + comments + saves;

      if (!row["Identificação do post"] || !publishedAtDate) return null;

      return {
        id: String(row["Identificação do post"]),
        accountId: String(row["Identificação da conta"] ?? ""),
        username: String(row["Nome de usuário da conta"] ?? ""),
        accountName: String(row["Nome da conta"] ?? ""),
        description: String(row["Descrição"] ?? ""),
        durationSeconds: parseNumber(row["Duração (s)"]),
        publishedAt: publishedAtDate.toISOString(),
        permanentLink: String(row["Link permanente"] ?? ""),
        postType: normalizePostType(String(row["Tipo de post"] ?? "")),
        dataComment: String(row["Comentário de dados"] ?? ""),
        sourceDateLabel: String(row["Data"] ?? ""),
        views,
        reach,
        likes,
        shares,
        follows,
        comments,
        saves,
        interactions,
        engagementRate: safeRatio(interactions, reach),
        shareRate: safeRatio(shares, reach),
        saveRate: safeRatio(saves, reach),
        followRate: safeRatio(follows, reach),
        viewsPerReach: safeRatio(views, reach),
        reachIndex: null,
        engagementIndex: null,
        shareIndex: null,
        saveIndex: null,
        followIndex: null
      };
    })
    .filter((post): post is InstagramPost => Boolean(post));

  const mediansByType = new Map<string, Record<string, number>>();
  for (const type of Array.from(new Set(basePosts.map((post) => post.postType)))) {
    const posts = basePosts.filter((post) => post.postType === type);
    mediansByType.set(type, {
      reach: median(posts.map((post) => post.reach)),
      engagement: median(posts.map((post) => post.engagementRate)),
      share: median(posts.map((post) => post.shareRate)),
      save: median(posts.map((post) => post.saveRate)),
      follow: median(posts.map((post) => post.followRate))
    });
  }

  return basePosts.map((post) => {
    const benchmark = mediansByType.get(post.postType);
    return {
      ...post,
      reachIndex: benchmark?.reach ? safeRatio(post.reach, benchmark.reach) : null,
      engagementIndex: benchmark?.engagement ? safeRatio(post.engagementRate, benchmark.engagement) : null,
      shareIndex: benchmark?.share ? safeRatio(post.shareRate, benchmark.share) : null,
      saveIndex: benchmark?.save ? safeRatio(post.saveRate, benchmark.save) : null,
      followIndex: benchmark?.follow ? safeRatio(post.followRate, benchmark.follow) : null
    };
  });
}

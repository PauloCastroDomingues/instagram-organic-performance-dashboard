import { NextRequest, NextResponse } from "next/server";
import { loadInstagramPosts } from "@/data/load-posts";
import { loadInstagramStories } from "@/data/load-stories";
import { loadSocialData } from "@/lib/social-data";

export const dynamic = "force-dynamic";

function inRange(date: string, start: string, end: string) {
  return date >= start && date <= end;
}

export async function GET(request: NextRequest) {
  const [posts, stories, social] = await Promise.all([loadInstagramPosts(), loadInstagramStories(), loadSocialData()]);
  if (social.status !== "ready") return NextResponse.json({ ok: false, error: social.message }, { status: 503 });

  const params = request.nextUrl.searchParams;
  const start = params.get("start") ?? social.data.coverage.sessions.start;
  const end = params.get("end") ?? social.data.coverage.sessions.end;
  const compare = params.get("compare") ?? "previousMonth";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end) {
    return NextResponse.json({ ok: false, error: "invalid_date_range" }, { status: 400 });
  }

  const sessions = social.data.sessionsDaily.filter((day) => inRange(day.date, start, end));
  const paid = social.data.paidDaily.filter((day) => inRange(day.date, start, end));
  const filteredPosts = posts.filter((item) => inRange(item.publishedAt.slice(0, 10), start, end));
  const filteredStories = stories.filter((item) => inRange(item.publishedAt.slice(0, 10), start, end));
  const sessionTotals = sessions.reduce((sum, day) => ({ organic: sum.organic + day.organic, paid: sum.paid + day.paid, unknown: sum.unknown + day.unknown, total: sum.total + day.total, visitors: sum.visitors + day.visitors }), { organic: 0, paid: 0, unknown: 0, total: 0, visitors: 0 });
  const paidTotals = paid.reduce((sum, day) => ({ spend: sum.spend + day.spend, clicks: sum.clicks + day.clicks, impressions: sum.impressions + day.impressions }), { spend: 0, clicks: 0, impressions: 0 });

  return NextResponse.json({
    ok: true,
    title: "Reise Instagram Performance Dashboard",
    generatedAt: new Date().toISOString(),
    sourceUpdatedAt: social.data.sourceUpdatedAt,
    filters: { start, end, comparison: compare },
    definitions: {
      sessions: "Visitas ao site atribuídas ao Instagram pela SSOT da Shopify.",
      organic: "Sessões do Instagram classificadas como orgânicas.",
      paid: "Sessões do Instagram classificadas como pagas.",
      unknown: "Sessões atribuídas ao Instagram sem classificação conclusiva entre orgânico e pago.",
      contentReach: "Soma do alcance reportado de Posts e Stories; não representa pessoas únicas."
    },
    summary: {
      sessions: sessionTotals,
      paidMedia: { ...paidTotals, cpc: paidTotals.clicks > 0 ? paidTotals.spend / paidTotals.clicks : null },
      content: {
        posts: filteredPosts.length,
        stories: filteredStories.length,
        postReach: filteredPosts.reduce((sum, item) => sum + item.reach, 0),
        storyReach: filteredStories.reduce((sum, item) => sum + item.reach, 0)
      }
    },
    daily: { sessions, paid },
    limitations: social.data.limitations
  });
}

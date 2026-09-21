import type { InstagramPost, MetricKey } from "@/lib/types";
import { median, safeRatio, sumPosts } from "@/lib/metrics";

export function filterPosts(posts: InstagramPost[], start: string, end: string, type: string): InstagramPost[] {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T23:59:59`);
  return posts
    .filter((post) => {
      const date = new Date(post.publishedAt);
      return date >= startDate && date <= endDate && (type === "Todos" || post.postType === type);
    })
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export function getMetric(post: InstagramPost, metric: MetricKey): number {
  return post[metric];
}

export function getBucketKey(date: Date, mode: "day" | "week" | "month") {
  if (mode === "month") return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  if (mode === "week") {
    const monday = new Date(date);
    const day = (monday.getDay() + 6) % 7;
    monday.setDate(monday.getDate() - day);
    return monday.toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

export function chooseAggregationMode(start: string, end: string): "day" | "week" | "month" {
  const days = Math.max(1, (new Date(end).getTime() - new Date(start).getTime()) / 86_400_000);
  if (days > 180) return "month";
  if (days > 45) return "week";
  return "day";
}

export function aggregateTimeline(posts: InstagramPost[], metric: MetricKey, mode: "day" | "week" | "month") {
  const groups = new Map<string, InstagramPost[]>();
  for (const post of posts) {
    const key = getBucketKey(new Date(post.publishedAt), mode);
    groups.set(key, [...(groups.get(key) ?? []), post]);
  }
  return Array.from(groups.entries())
    .map(([period, items]) => ({
      period,
      value: items.reduce((acc, post) => acc + getMetric(post, metric), 0),
      posts: items.length,
      avgReach: safeRatio(items.reduce((acc, post) => acc + post.reach, 0), items.length)
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

export function aggregateByType(posts: InstagramPost[]) {
  const groups = new Map<string, InstagramPost[]>();
  for (const post of posts) groups.set(post.postType, [...(groups.get(post.postType) ?? []), post]);
  return Array.from(groups.entries())
    .map(([type, items]) => {
      const totals = sumPosts(items);
      return {
        type,
        posts: items.length,
        avgReach: totals.avgReach,
        medianReach: median(items.map((post) => post.reach)),
        avgViews: totals.avgViews,
        engagementRate: totals.engagementRate,
        medianEngagementRate: median(items.map((post) => post.engagementRate)),
        shareRate: totals.shareRate,
        saveRate: totals.saveRate,
        avgFollows: safeRatio(totals.follows, items.length)
      };
    })
    .sort((a, b) => b.avgReach - a.avgReach);
}

export function aggregateReachConcentration(posts: InstagramPost[]) {
  const sorted = [...posts].sort((a, b) => b.reach - a.reach);
  const totalReach = sorted.reduce((sum, post) => sum + post.reach, 0);
  const groups = [
    { label: "Top 5", items: sorted.slice(0, 5) },
    { label: "Top 6-10", items: sorted.slice(5, 10) },
    { label: "Demais posts", items: sorted.slice(10) }
  ];

  return groups.map((group) => {
    const reach = group.items.reduce((sum, post) => sum + post.reach, 0);
    return { label: group.label, posts: group.items.length, reach, share: safeRatio(reach, totalReach) };
  });
}

export function aggregatePerformanceMatrix(posts: InstagramPost[]) {
  const reachMedian = median(posts.map((post) => post.reach));
  const engagementMedian = median(posts.map((post) => post.engagementRate));
  const points = posts.map((post) => ({
    id: post.id,
    reach: post.reach,
    engagement: post.engagementRate,
    views: post.views,
    type: post.postType,
    description: post.description,
    link: post.permanentLink,
    quadrant:
      post.reach >= reachMedian
        ? post.engagementRate >= engagementMedian ? "Destaques" : "Alcance"
        : post.engagementRate >= engagementMedian ? "Profundidade" : "A desenvolver"
  }));

  return { points, reachMedian, engagementMedian };
}

export function aggregateByWeekday(posts: InstagramPost[]) {
  const labels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
  return labels.map((label, index) => {
    const items = posts.filter((post) => new Date(post.publishedAt).getDay() === index);
    const totals = sumPosts(items);
    return {
      label,
      posts: items.length,
      avgReach: totals.avgReach,
      avgEngagement: totals.engagementRate,
      avgShares: safeRatio(totals.shares, items.length),
      avgSaves: safeRatio(totals.saves, items.length)
    };
  });
}

export function aggregateByHourBand(posts: InstagramPost[]) {
  const bands = [
    { label: "00h-05h", start: 0, end: 5 },
    { label: "06h-08h", start: 6, end: 8 },
    { label: "09h-11h", start: 9, end: 11 },
    { label: "12h-14h", start: 12, end: 14 },
    { label: "15h-17h", start: 15, end: 17 },
    { label: "18h-20h", start: 18, end: 20 },
    { label: "21h-23h", start: 21, end: 23 }
  ];
  return bands.map((band) => {
    const items = posts.filter((post) => {
      const hour = new Date(post.publishedAt).getHours();
      return hour >= band.start && hour <= band.end;
    });
    const totals = sumPosts(items);
    return {
      label: band.label,
      posts: items.length,
      avgReach: totals.avgReach,
      engagementRate: totals.engagementRate,
      avgShares: safeRatio(totals.shares, items.length),
      avgSaves: safeRatio(totals.saves, items.length)
    };
  });
}

export function aggregatePerformanceDistribution(posts: InstagramPost[]) {
  const byType = new Map<string, InstagramPost[]>();
  for (const post of posts) byType.set(post.postType, [...(byType.get(post.postType) ?? []), post]);
  const buckets = [
    { label: "Muito abaixo", min: 0, max: 0.7 },
    { label: "Abaixo", min: 0.7, max: 0.95 },
    { label: "Próximo", min: 0.95, max: 1.05 },
    { label: "Acima", min: 1.05, max: 1.4 },
    { label: "Muito acima", min: 1.4, max: Infinity }
  ];
  const counts = buckets.map((bucket) => ({ label: bucket.label, posts: 0 }));

  for (const items of byType.values()) {
    const reference = median(items.map((post) => post.reach));
    if (!reference) continue;
    for (const post of items) {
      const index = post.reach / reference;
      const bucketIndex = buckets.findIndex((bucket) => index >= bucket.min && index < bucket.max);
      if (bucketIndex >= 0) counts[bucketIndex].posts += 1;
    }
  }

  return counts;
}

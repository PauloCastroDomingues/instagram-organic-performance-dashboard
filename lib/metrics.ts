import type { InstagramPost } from "@/lib/types";

export function safeRatio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

export function median(values: number[]): number {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function sumPosts(posts: InstagramPost[]) {
  const totals = posts.reduce(
    (acc, post) => {
      acc.publications += 1;
      acc.views += post.views;
      acc.reach += post.reach;
      acc.interactions += post.interactions;
      acc.saves += post.saves;
      acc.shares += post.shares;
      acc.follows += post.follows;
      return acc;
    },
    {
      publications: 0,
      views: 0,
      reach: 0,
      interactions: 0,
      saves: 0,
      shares: 0,
      follows: 0
    }
  );

  return {
    ...totals,
    engagementRate: safeRatio(totals.interactions, totals.reach),
    shareRate: safeRatio(totals.shares, totals.reach),
    saveRate: safeRatio(totals.saves, totals.reach),
    followRate: safeRatio(totals.follows, totals.reach),
    avgReach: safeRatio(totals.reach, totals.publications),
    avgViews: safeRatio(totals.views, totals.publications)
  };
}

export function getPreviousPeriodPosts(posts: InstagramPost[], start: Date, end: Date): InstagramPost[] {
  const { start: previousStart, end: previousEnd } = getPreviousPeriodRange(start, end);
  return posts.filter((post) => {
    const date = new Date(post.publishedAt);
    return date >= previousStart && date <= previousEnd;
  });
}

export function getPreviousPeriodRange(start: Date, end: Date) {
  const span = end.getTime() - start.getTime();
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - span);
  return { start: previousStart, end: previousEnd };
}

function shiftOneYearBack(date: Date) {
  const targetYear = date.getFullYear() - 1;
  const targetMonth = date.getMonth();
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  const shifted = new Date(date);
  shifted.setFullYear(targetYear, targetMonth, Math.min(date.getDate(), lastDay));
  return shifted;
}

export function getYearAgoPeriodRange(start: Date, end: Date) {
  return { start: shiftOneYearBack(start), end: shiftOneYearBack(end) };
}

export function getPostsInRange(posts: InstagramPost[], start: Date, end: Date): InstagramPost[] {
  return posts.filter((post) => {
    const date = new Date(post.publishedAt);
    return date >= start && date <= end;
  });
}

export function variation(current: number, previous: number): number | null {
  if (!previous) return null;
  return (current - previous) / previous;
}

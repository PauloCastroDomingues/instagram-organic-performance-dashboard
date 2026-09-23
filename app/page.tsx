import { Dashboard } from "@/components/Dashboard";
import { loadInstagramPosts } from "@/data/load-posts";
import { loadInstagramStories } from "@/data/load-stories";
import { loadSocialData } from "@/lib/social-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [posts, stories, socialData] = await Promise.all([
    loadInstagramPosts(),
    loadInstagramStories(),
    loadSocialData()
  ]);
  return <Dashboard posts={posts} stories={stories} socialData={socialData} />;
}

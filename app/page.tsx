import { Dashboard } from "@/components/Dashboard";
import { loadInstagramPosts } from "@/data/load-posts";
import { loadInstagramStories } from "@/data/load-stories";

export default async function Home() {
  const posts = await loadInstagramPosts();
  const stories = await loadInstagramStories();
  return <Dashboard posts={posts} stories={stories} />;
}

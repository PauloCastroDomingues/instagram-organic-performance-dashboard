import { Dashboard } from "@/components/Dashboard";
import { loadInstagramPosts } from "@/data/load-posts";

export default async function Home() {
  const posts = await loadInstagramPosts();
  return <Dashboard posts={posts} />;
}

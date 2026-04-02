import type { PostMeta } from "@/lib/posts";
import { PostCard } from "./post-card";

interface PostListProps {
  posts: PostMeta[];
  updatedLabel?: string;
}

export function PostList({ posts, updatedLabel }: PostListProps) {
  if (posts.length === 0) return null;

  return (
    <div className="grid gap-4">
      {posts.map((post) => (
        <PostCard key={post.slug} post={post} updatedLabel={updatedLabel} />
      ))}
    </div>
  );
}

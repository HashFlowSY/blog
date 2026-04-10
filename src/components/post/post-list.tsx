import { PostCard } from "./post-card";

import type { PostMeta } from "@/lib/posts";

interface PostListProps {
  posts: PostMeta[];
  updatedLabel?: string;
  minutesLabel?: string;
}

export function PostList({ posts, updatedLabel, minutesLabel }: PostListProps) {
  if (posts.length === 0) return null;

  return (
    <div className="grid gap-4">
      {posts.map((post) => (
        <PostCard
          key={post.slug}
          post={post}
          {...(updatedLabel !== null && { updatedLabel })}
          {...(minutesLabel !== null && { minutesLabel })}
        />
      ))}
    </div>
  );
}

import { posts } from "@/lib/posts";

/**
 * Revision marker for a post that changed after publication.
 *
 * Renders nothing unless the post carries both an `updated` date and a note
 * saying what changed: a bare "updated" badge tells a returning reader that
 * something moved without telling them whether it matters.
 */
export function UpdatedNote({ slug }: { slug: string }) {
  const post = posts.find((p) => p.slug === slug);
  if (!post?.updated || !post.updateNote) return null;

  const when = new Date(`${post.updated}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="updated-note">
      <span className="updated-badge">updated</span>
      <span className="updated-body">
        <time dateTime={post.updated}>{when}</time>. {post.updateNote}
      </span>
    </div>
  );
}

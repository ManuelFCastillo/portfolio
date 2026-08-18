import type { Metadata } from "next";
import Link from "next/link";
import { sortedPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Field Notes",
  description:
    "Engineering write-ups from real open-source work: bugs found, fixes shipped, and the mechanisms underneath them.",
};

export default function BlogIndex() {
  return (
    <main className="blog-index">
      <h1>Field Notes</h1>
      <p className="sub">
        Write-ups from real engineering work — bugs found in the wild, fixes
        shipped upstream, and the mechanisms underneath them.
      </p>

      {sortedPosts.map((post) => (
        <Link key={post.slug} href={`/blog/${post.slug}`} className="post-card">
          <div className="meta">
            <span className="k">PASS</span> · {post.date} · {post.kind} · ~
            {post.minutes} min
          </div>
          <h2>{post.title}</h2>
          <p>{post.dek}</p>
        </Link>
      ))}
    </main>
  );
}

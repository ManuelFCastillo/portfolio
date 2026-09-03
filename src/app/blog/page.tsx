import type { Metadata } from "next";
import Link from "next/link";
import { sortedPosts } from "@/lib/posts";
import { PostArt } from "@/components/blog/PostArt";
import { FieldNotesBg } from "@/components/blog/FieldNotesBg";
import { NoteStats } from "@/components/blog/NoteStats";

export const metadata: Metadata = {
  title: "Field Notes",
  description:
    "Engineering write-ups from real open-source work: bugs found, fixes shipped, and the mechanisms underneath them.",
};

export default function BlogIndex() {
  return (
    <main className="blog-index">
      <FieldNotesBg />
      <h1>Field Notes</h1>
      <p className="sub">
        Write-ups from real engineering work — bugs found in the wild, fixes
        shipped upstream, and the mechanisms underneath them.
      </p>

      {sortedPosts.map((post) => (
        <Link key={post.slug} href={`/blog/${post.slug}`} className="post-card">
          <div className="post-card-body">
            <div className="meta">
              <span className="k">PASS</span> · {post.date} · {post.kind} · ~
              {post.minutes} min · <span className="repo">{post.repo}</span>
              {post.updated && (
                <>
                  {" · "}
                  <span className="meta-updated">updated {post.updated}</span>
                </>
              )}
            </div>
            <h2>{post.title}</h2>
            <p>{post.dek}</p>
            <NoteStats slug={post.slug} variant="card" />
          </div>
          <PostArt slug={post.slug} />
        </Link>
      ))}
    </main>
  );
}

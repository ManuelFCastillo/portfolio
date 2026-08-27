import Link from "next/link";
import "./blog.css";

/**
 * Blog chrome. The portfolio root locks body scroll for the desktop
 * metaphor; blog.css restores it via body:has(.blog-root) so long-form
 * pages scroll normally without touching the root layout.
 */
export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="blog-root">
      <nav className="blog-topbar" aria-label="Blog">
        <Link href="/">&larr; mannycastillo.dev</Link>
        <Link className="blog-topbar-label" href="/blog">field notes</Link>
      </nav>
      {children}
    </div>
  );
}

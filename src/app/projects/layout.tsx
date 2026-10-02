import { Space_Grotesk } from "next/font/google";
import Link from "next/link";
import "../blog/blog.css";
import "./projects.css";

/** The display face for project titles; body text stays Geist. */
const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

/**
 * Projects chrome. Borrows the blog's root and top bar, which already undo the
 * desktop's body scroll lock, so this is a plain scrolling page with its own
 * URL: the link to hand a recruiter who won't explore a fake desktop.
 */
export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`blog-root ${display.variable}`}>
      <nav className="blog-topbar" aria-label="Projects">
        <Link href="/">&larr; mannycastillo.dev</Link>
        <Link className="blog-topbar-label" href="/projects">projects</Link>
      </nav>
      {children}
    </div>
  );
}

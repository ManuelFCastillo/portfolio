import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { contact, credentials, profile, allSpecs, skillGroups } from "@/lib/resume";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Canonical origin for metadata and JSON-LD.
 *
 * Vercel sets VERCEL_PROJECT_PRODUCTION_URL to the project's production domain
 * at build time — and updates it to a custom domain once one is attached — so
 * pointing a real domain at this project needs no code change. The literal is
 * only a fallback for local builds.
 */
const SITE =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://www.mannycastillo.dev");

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: `${profile.name} — ${profile.title}`,
    template: `%s — ${profile.name}`,
  },
  description: profile.summary,
  keywords: [
    "SDET",
    "Lead SDET",
    "Software Engineer in Test",
    "Backend Test Automation",
    "API Test Automation",
    "Python",
    "pytest",
    "Airflow",
    "Data Pipeline Testing",
    "Distributed Systems",
    "Kubernetes",
    "ML Validation",
    "LLM Output Validation",
    "MLOps",
    "Playwright",
    "Maestro",
    "TypeScript",
    "Test Automation",
    "QA Engineer",
    "CI/CD",
    "GitLab CI",
    "Manny Castillo",
    "Manuel Castillo",
  ],
  authors: [{ name: profile.name, url: contact.linkedinUrl }],
  creator: profile.name,
  openGraph: {
    type: "profile",
    title: `${profile.name} — ${profile.title}`,
    description: profile.headline,
    siteName: `${profile.name} · Test Report`,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${profile.name} — ${profile.title}`,
    description: profile.headline,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#08090c",
  colorScheme: "dark",
};

/** Structured data so search engines read this as a person, not a toy. */
function JsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Person",
    // Preferred name leads; the legal name stays as an alias so he is
    // findable under either.
    name: profile.name,
    alternateName: profile.fullName,
    jobTitle: profile.title,
    description: profile.summary,
    // No email here: structured data is the easiest thing in the world to
    // scrape. `sameAs` carries the contact signal for search engines instead.
    url: SITE,
    sameAs: [contact.linkedinUrl],
    knowsAbout: skillGroups.flatMap((g) => g.items),
    alumniOf: credentials.map((c) => ({
      "@type": "EducationalOrganization",
      name: c.institution,
    })),
    worksFor: {
      "@type": "Organization",
      name: allSpecs[0].org,
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <JsonLd />
        {children}
      </body>
    </html>
  );
}

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

const SITE = "https://mannycastillo.dev";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: `${profile.name} — ${profile.title}`,
    template: `%s — ${profile.name}`,
  },
  description: profile.summary,
  keywords: [
    "SDET",
    "Software Engineer in Test",
    "Playwright",
    "TypeScript",
    "Test Automation",
    "QA Engineer",
    "CI/CD",
    "Manny Castillo",
    "Manuel Castillo",
  ],
  authors: [{ name: profile.fullName, url: contact.linkedinUrl }],
  creator: profile.fullName,
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
    name: profile.fullName,
    alternateName: profile.name,
    jobTitle: profile.title,
    description: profile.summary,
    email: `mailto:${contact.email}`,
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

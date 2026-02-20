import type { Metadata } from "next";
import Script from "next/script";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Setlist to Playlist",
  description: "Import a setlist from setlist.fm and create an Apple Music playlist.",
  manifest: "/manifest.webmanifest",
};

/**
 * The global Next.js Root Layout wrapper.
 * Injects global CSS, metadata, and the mandatory Apple MusicKit external JS script bundle.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#1a1a1a" />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        {/* DCI-020: crossOrigin for future SRI; SRI not added—Apple does not publish a stable integrity hash. */}
        <Script
          src="https://js-cdn.music.apple.com/musickit/v3/musickit.js"
          strategy="beforeInteractive"
          crossOrigin="anonymous"
        />
        {children}
      </body>
    </html>
  );
}

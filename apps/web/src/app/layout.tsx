import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Script from 'next/script';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'Setlist to Playlist',
  description:
    'Turn any concert setlist into an Apple Music playlist. Paste a setlist.fm link, preview the songs, and save the playlist to your library.',
  manifest: '/manifest.webmanifest',
  referrer: 'no-referrer-when-downgrade',
  openGraph: {
    title: 'Setlist to Playlist',
    description:
      'Turn any concert setlist into an Apple Music playlist. Paste a setlist.fm link, preview the songs, and save the playlist to your library.',
    type: 'website',
    siteName: 'Setlist to Playlist',
  },
  twitter: {
    card: 'summary',
    title: 'Setlist to Playlist',
    description:
      'Turn any concert setlist into an Apple Music playlist. Paste a setlist.fm link, preview the songs, and save the playlist to your library.',
  },
  appleWebApp: {
    capable: true,
    title: 'Setlist to Playlist',
    statusBarStyle: 'black-translucent',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#0f172a" />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        {/* crossOrigin for future SRI; SRI not added because Apple does not publish a stable integrity hash. */}
        <Script
          src="https://js-cdn.music.apple.com/musickit/v3/musickit.js"
          strategy="afterInteractive"
          crossOrigin="anonymous"
          nonce={nonce}
        />
        {children}
      </body>
    </html>
  );
}

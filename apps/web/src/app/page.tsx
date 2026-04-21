import { SetlistImportView } from '@/features/setlist-import/SetlistImportView';
import { mainContainerStyle } from '@/lib/styles';

export default function HomePage() {
  return (
    <main id="main" style={mainContainerStyle}>
      <h1>Setlist to Playlist</h1>
      <p className="hero-subtitle">
        Turn any concert setlist into an Apple Music playlist. Paste a setlist.fm link, preview the
        songs, and save the playlist to your library.
      </p>
      <ol className="how-it-works">
        <li>
          <strong>Paste</strong> — a setlist.fm URL or setlist ID
        </li>
        <li>
          <strong>Preview</strong> — see the artist, venue, and full track list
        </li>
        <li>
          <strong>Match</strong> — confirm or swap Apple Music tracks
        </li>
        <li>
          <strong>Save</strong> — create the playlist in your Apple Music library
        </li>
      </ol>
      <SetlistImportView />
    </main>
  );
}

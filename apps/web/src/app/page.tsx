import { SetlistImportView } from "@/features/setlist-import";

export default function HomePage() {
  return (
    <main style={{ padding: "2rem", maxWidth: "40rem", margin: "0 auto", minWidth: 0 }}>
      <h1>Setlist to Playlist</h1>
      <p>
        Import a setlist from setlist.fm (URL or setlist ID), preview the tracks,
        fix matches if needed, then create an Apple Music playlist in your
        account.
      </p>
      <ol style={{ marginTop: "1.5rem", paddingLeft: "1.5rem" }}>
        <li>
          <strong>Import</strong> – Enter setlist.fm URL or ID
        </li>
        <li>
          <strong>Preview</strong> – See artist, venue, date, and track list
        </li>
        <li>
          <strong>Matching</strong> – Confirm or correct Apple Music track
          matches
        </li>
        <li>
          <strong>Export</strong> – Create the playlist in Apple Music
        </li>
      </ol>
      <SetlistImportView />
    </main>
  );
}

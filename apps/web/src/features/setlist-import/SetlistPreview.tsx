import type { Setlist } from "@repo/core";

interface SetlistPreviewProps {
  setlist: Setlist;
}

/** Flatten sets into one ordered list for display. DCI-025: guard setlist.sets. DCI-034: guard each set as array. */
function getAllTracks(setlist: Setlist): { name: string; info?: string }[] {
  const tracks: { name: string; info?: string }[] = [];
  for (const set of setlist.sets ?? []) {
    if (!Array.isArray(set)) continue;
    for (const entry of set) {
      tracks.push({ name: entry?.name ?? "", info: entry?.info });
    }
  }
  return tracks;
}

export function SetlistPreview({ setlist }: SetlistPreviewProps) {
  const tracks = getAllTracks(setlist);

  return (
    <section aria-label="Setlist preview" style={{ marginTop: "1.5rem" }}>
      <h2 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>
        {setlist.artist}
      </h2>
      <dl style={{ margin: 0, display: "grid", gap: "0.25rem 1rem" }}>
        {setlist.venue && (
          <>
            <dt style={{ fontWeight: 600 }}>Venue</dt>
            <dd style={{ margin: 0 }}>{setlist.venue}</dd>
          </>
        )}
        {setlist.eventDate && (
          <>
            <dt style={{ fontWeight: 600 }}>Date</dt>
            <dd style={{ margin: 0 }}>{setlist.eventDate}</dd>
          </>
        )}
      </dl>
      <h3 style={{ fontSize: "1rem", marginTop: "1rem", marginBottom: "0.5rem" }}>
        Tracks ({tracks.length})
      </h3>
      <ol
        style={{
          margin: 0,
          paddingLeft: "1.5rem",
          listStyle: "decimal",
        }}
      >
        {tracks.map((t, i) => (
          <li key={i} style={{ marginBottom: "0.25rem" }}>
            {t.name}
            {t.info ? (
              <span style={{ color: "#666", fontSize: "0.9em" }}> — {t.info}</span>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

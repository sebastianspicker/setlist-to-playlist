import { flattenSetlistToEntries, type Setlist } from "@repo/core";
import { SectionTitle } from "@/components/SectionTitle";

interface SetlistPreviewProps {
  setlist: Setlist;
}

/**
 * Renders a read-only preview of a parsed setlist before the user proceeds to track matching.
 * Displays the event metadata and a flattened, ordered list of tracks.
 */
export function SetlistPreview({ setlist }: SetlistPreviewProps) {
  const tracks = flattenSetlistToEntries(setlist).map((e) => ({ name: e.name, info: e.info }));

  return (
    <section aria-label="Setlist preview" style={{ marginTop: "1.5rem" }}>
      <SectionTitle>{setlist.artist}</SectionTitle>
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

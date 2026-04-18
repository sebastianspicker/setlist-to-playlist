import { memo } from 'react';
import { flattenSetlistToEntries, type Setlist } from '@repo/core';
import { SectionTitle } from '@/components/SectionTitle';

interface SetlistPreviewProps {
  setlist: Setlist;
}

export const SetlistPreview = memo(function SetlistPreview({ setlist }: SetlistPreviewProps) {
  const tracks = flattenSetlistToEntries(setlist).map((e) => ({ name: e.name, info: e.info }));

  return (
    <section aria-label="Setlist preview" className="setlist-preview">
      <SectionTitle>{setlist.artist}</SectionTitle>
      <div className="preview-meta">
        {setlist.venue && (
          <span className="preview-meta-item">
            <span className="preview-meta-label">Venue</span> {setlist.venue}
          </span>
        )}
        {setlist.eventDate && (
          <span className="preview-meta-item">
            <span className="preview-meta-label">Date</span> {setlist.eventDate}
          </span>
        )}
        <span className="preview-meta-item">
          <span className="preview-meta-label">Songs</span> {tracks.length}
        </span>
      </div>
      {tracks.length === 0 ? (
        <p className="muted-block" style={{ marginTop: '1rem' }}>
          This setlist has no songs listed. Try a different setlist.
        </p>
      ) : (
        <ol className="preview-track-list">
          {tracks.map((t, i) => (
            <li key={`${t.name}-${t.info ?? ''}-${i}`} className="preview-track-item">
              {t.name}
              {t.info ? <span className="muted-inline"> — {t.info}</span> : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
});

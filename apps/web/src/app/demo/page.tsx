const demoTracks = [
  "Can't Buy Me Love",
  "A Hard Day's Night",
  "Things We Said Today",
  "You Can't Do That",
  "If I Fell",
  "Long Tall Sally",
];

const matchRows = [
  { setlist: "Can't Buy Me Love", apple: "Can't Buy Me Love · The Beatles", status: "Matched" },
  { setlist: "A Hard Day's Night", apple: "A Hard Day's Night · The Beatles", status: "Matched" },
  { setlist: "Things We Said Today", apple: "No match yet", status: "Unmatched" },
];

export default function DemoPage() {
  return (
    <main id="main" className="demo-main">
      <h1>Setlist to Playlist Demo</h1>
      <p className="muted-block">
        This static demo page is intended for screenshots and GitHub previews.
      </p>

      <section className="glass-panel demo-section">
        <h2>1. Import</h2>
        <p className="muted-caption">Paste setlist URL or ID and load the setlist.</p>
        <div className="demo-input-row">
          <input
            readOnly
            className="premium-input"
            value="https://www.setlist.fm/setlist/the-beatles/1964/hollywood-bowl-hollywood-ca-63de4613.html"
            aria-label="Demo setlist URL"
          />
          <button type="button" className="premium-button">
            Load setlist
          </button>
        </div>
      </section>

      <section className="glass-panel demo-section">
        <h2>2. Preview</h2>
        <p className="muted-caption">Artist, venue, date, and ordered tracks.</p>
        <div className="demo-meta-grid">
          <p>
            <strong>Artist:</strong> The Beatles
          </p>
          <p>
            <strong>Venue:</strong> Hollywood Bowl
          </p>
          <p>
            <strong>Date:</strong> 23-08-1964
          </p>
        </div>
        <ol className="demo-track-list">
          {demoTracks.map((track) => (
            <li key={track}>{track}</li>
          ))}
        </ol>
      </section>

      <section className="glass-panel demo-section">
        <h2>3. Matching</h2>
        <p className="muted-caption">Auto-suggestions with manual correction options.</p>
        <div className="matching-actions">
          <button type="button" className="premium-button secondary">
            Refresh suggestions
          </button>
          <button type="button" className="premium-button secondary">
            Skip unmatched
          </button>
          <button type="button" className="premium-button secondary">
            Reset all
          </button>
        </div>
        <ul className="matching-list">
          {matchRows.map((row) => (
            <li key={row.setlist} className="matching-row">
              <div className="matching-row-main">
                <div className="matching-track-meta">
                  <strong>{row.setlist}</strong>
                </div>
                <div className="matching-track-result">{row.apple}</div>
                <div className="matching-row-actions">
                  <span className={`demo-pill ${row.status === "Matched" ? "ok" : "warn"}`}>
                    {row.status}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="glass-panel success-panel demo-section">
        <h2>4. Export</h2>
        <p className="success-title">Playlist created.</p>
        <p className="muted-block">
          Name: <strong>Setlist – The Beatles – 23-08-1964</strong>
        </p>
        <a href="#" className="accent-inline">
          Open in Apple Music →
        </a>
      </section>
    </main>
  );
}

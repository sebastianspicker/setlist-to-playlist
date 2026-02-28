import Link from "next/link";
import { mainContainerStyle } from "@/lib/styles";

export default function NotFound() {
  return (
    <main id="main" style={mainContainerStyle}>
      <h1>Page not found</h1>
      <p style={{ color: "var(--text-muted)", marginTop: "0.5rem" }}>
        The page you’re looking for doesn’t exist or has been moved.
      </p>
      <Link
        href="/"
        style={{
          display: "inline-block",
          marginTop: "1rem",
          padding: "0.5rem 1rem",
          fontSize: "1rem",
          color: "inherit",
          textDecoration: "underline",
        }}
      >
        Back to Setlist to Playlist
      </Link>
    </main>
  );
}

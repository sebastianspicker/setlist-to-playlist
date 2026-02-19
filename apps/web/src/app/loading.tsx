import { mainContainerStyle } from "@/lib/styles";

export default function Loading() {
  return (
    <main style={mainContainerStyle}>
      <p role="status" aria-live="polite" style={{ color: "#666" }}>
        Loading…
      </p>
    </main>
  );
}

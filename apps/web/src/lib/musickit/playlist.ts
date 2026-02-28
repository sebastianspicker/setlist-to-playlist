import { initMusicKit } from "./client";
import type { CreatePlaylistResult } from "./types";

export async function createLibraryPlaylist(name: string): Promise<CreatePlaylistResult> {
  const music = await initMusicKit();
  if (!music.isAuthorized) {
    throw new Error("Not authorized. Please connect Apple Music first.");
  }
  const path = "/v1/me/library/playlists";
  const body = {
    data: [{ type: "playlists" as const, attributes: { name } }],
  };
  const res = (await music.music.api(path, {
    method: "POST",
    data: body,
  })) as {
    data?: Array<{ id: string; attributes?: { url?: string } }>;
    errors?: Array<{ detail?: string; status?: string }>;
  };
  if (res?.errors && Array.isArray(res.errors) && res.errors.length > 0) {
    const detail = res.errors.map((e) => e.detail ?? e.status ?? "Unknown").join("; ");
    throw new Error(`Failed to create playlist: ${detail}`);
  }
  const playlist = Array.isArray(res?.data) ? res.data[0] : res?.data;
  if (!playlist?.id) throw new Error("Failed to create playlist");
  return { id: playlist.id, url: playlist.attributes?.url };
}

/**
 * Add song IDs to a library playlist in order. Requires authorization.
 */
export async function addTracksToLibraryPlaylist(
  playlistId: string,
  songIds: string[]
): Promise<void> {
  if (songIds.length === 0) return;
  if (!playlistId?.trim()) {
    throw new Error("Invalid playlist ID");
  }
  const validIds = songIds.filter((id) => typeof id === "string" && id.trim().length > 0);
  if (validIds.length === 0) {
    throw new Error("No valid song IDs to add");
  }
  const music = await initMusicKit();
  if (!music.isAuthorized) {
    throw new Error("Not authorized. Please connect Apple Music first.");
  }
  const path = `/v1/me/library/playlists/${playlistId}/tracks`;
  const data = {
    data: validIds.map((id) => ({ id: id.trim(), type: "songs" as const })),
  };
  const res = (await music.music.api(path, { method: "POST", data })) as
    | { data?: unknown[]; errors?: Array<{ detail?: string; status?: string }> }
    | undefined;
  if (res?.errors && Array.isArray(res.errors) && res.errors.length > 0) {
    const detail = res.errors.map((e) => e.detail ?? e.status ?? "Unknown").join("; ");
    throw new Error(`Adding tracks to playlist failed: ${detail}`);
  }
  if (validIds.length < songIds.length) {
    const dropped = songIds.length - validIds.length;
    throw new Error(
      `${dropped} of ${songIds.length} IDs were invalid and skipped; ${validIds.length} tracks added.`
    );
  }
}

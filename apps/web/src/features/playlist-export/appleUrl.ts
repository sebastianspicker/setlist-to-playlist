function parseUrl(value: string | undefined): URL | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isAppleMusicHost(hostname: string): boolean {
  return hostname === 'music.apple.com' || hostname.endsWith('.music.apple.com');
}

export function getSafeAppleUrl(value: string | undefined): string | null {
  if (!value) return null;
  const url = parseUrl(value);
  return url?.protocol === 'https:' && isAppleMusicHost(url.hostname) ? value : null;
}

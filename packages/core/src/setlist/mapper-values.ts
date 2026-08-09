const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export const getOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

export const toSafeRecord = (value: unknown): Record<string, unknown> | null => {
  if (value == null || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (Object.hasOwn(record, '__proto__')) return null;
  return Object.hasOwn(record, 'constructor') ? null : record;
};

export const getArtistName = (value: unknown): string => {
  const response = toSafeRecord(value);
  if (!response) throw new Error('Invalid setlist response');

  const artist = toSafeRecord(response.artist);
  if (!artist || !isNonEmptyString(artist.name)) {
    throw new Error('Invalid setlist response: missing artist');
  }
  return artist.name;
};

export const getVenueName = (value: unknown): string | undefined =>
  getOptionalString(toSafeRecord(value)?.name);

export const hasNonEmptyName = isNonEmptyString;

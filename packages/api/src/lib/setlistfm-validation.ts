const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasValidArtist = (value: unknown): boolean =>
  isRecord(value) && typeof value.name === 'string' && value.name.trim().length > 0;

const hasExpectedSetlistId = (body: Record<string, unknown>, expectedId: string): boolean =>
  typeof body.id === 'string' && body.id.toLowerCase() === expectedId.toLowerCase();

const hasValidEventDate = (body: Record<string, unknown>): boolean =>
  typeof body.eventDate === 'string' && body.eventDate.trim().length > 0;

const hasValidSetSections = (body: Record<string, unknown>): boolean =>
  body.set === undefined || Array.isArray(body.set);

export const isValidSetlistResponse = (body: unknown, expectedId: string): boolean => {
  if (!isRecord(body)) return false;
  return (
    hasExpectedSetlistId(body, expectedId) &&
    hasValidEventDate(body) &&
    hasValidArtist(body.artist) &&
    hasValidSetSections(body)
  );
};

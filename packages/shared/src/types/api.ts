/** Common API error codes */
export const API_ERROR = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  RATE_LIMIT: 'RATE_LIMIT',
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
} as const;

export type ApiErrorCode = (typeof API_ERROR)[keyof typeof API_ERROR];

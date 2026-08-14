import { parseSetlistIdFromInput } from '@repo/core';
import { MAX_SETLIST_INPUT_LENGTH, SETLIST_MESSAGES } from '@repo/shared';

export interface ImportError {
  message: string;
  code: 'invalid-input' | 'not-found' | 'rate-limit' | 'service' | 'network' | 'unknown';
  retryable: boolean;
  retryAfterSeconds?: number;
}

function includesAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term));
}

function rateLimitError(message: string): ImportError {
  const retryAfter = message.match(/(\d+)\s*(?:seconds?|s)\b/)?.[1];
  return {
    message,
    code: 'rate-limit',
    retryable: true,
    retryAfterSeconds: retryAfter ? Number(retryAfter) : undefined,
  };
}

export function classifyImportError(message: string): ImportError {
  const lower = message.toLowerCase();
  if (includesAny(lower, ['not found', '404'])) {
    return { message, code: 'not-found', retryable: false };
  }
  if (includesAny(lower, ['rate', '429', 'too many requests'])) return rateLimitError(message);
  if (includesAny(lower, ['unavailable', '503', '502'])) {
    return { message, code: 'service', retryable: true };
  }
  if (includesAny(lower, ['network', 'failed to fetch', 'load failed'])) {
    return { message, code: 'network', retryable: true };
  }
  return { message, code: 'unknown', retryable: false };
}

export function getInvalidInputError(value: string): ImportError | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      message: 'Enter a setlist.fm URL or setlist ID.',
      code: 'invalid-input',
      retryable: false,
    };
  }
  if (trimmed.length > MAX_SETLIST_INPUT_LENGTH) {
    return { message: SETLIST_MESSAGES.INPUT_TOO_LONG, code: 'invalid-input', retryable: false };
  }
  if (!parseSetlistIdFromInput(trimmed)) {
    return {
      message: 'Enter a valid setlist.fm URL or a 4–12 character hexadecimal setlist ID.',
      code: 'invalid-input',
      retryable: false,
    };
  }
  return null;
}

export function isAbortError(value: unknown): boolean {
  return value instanceof DOMException && value.name === 'AbortError';
}

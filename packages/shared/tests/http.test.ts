import { describe, expect, it } from 'vitest';
import { readTextWithinLimit } from '../src/utils/http.js';

function makeStreamingResponse(text: string): Response {
  const encoded = new TextEncoder().encode(text);
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoded);
      controller.close();
    },
  });
  return new Response(stream);
}

function makeNonStreamingResponse(text: string): Response {
  return new Response(text, { body: text });
}

describe('readTextWithinLimit', () => {
  it('returns text when streaming response is within the limit', async () => {
    const res = makeStreamingResponse('hello world');
    const result = await readTextWithinLimit(res, 100);
    expect(result).toBe('hello world');
  });

  it('returns null when streaming response exceeds the limit', async () => {
    const res = makeStreamingResponse('hello world');
    const result = await readTextWithinLimit(res, 5);
    expect(result).toBeNull();
  });

  it('returns null when non-streaming text exceeds the limit', async () => {
    const longText = 'a'.repeat(200);
    const res = new Response(null);
    Object.defineProperty(res, 'body', { value: null });
    Object.defineProperty(res, 'text', { value: async () => longText });
    const result = await readTextWithinLimit(res, 50);
    expect(result).toBeNull();
  });

  it('returns text for non-streaming response within limit', async () => {
    const shortText = 'short';
    const res = new Response(null);
    Object.defineProperty(res, 'body', { value: null });
    Object.defineProperty(res, 'text', { value: async () => shortText });
    const result = await readTextWithinLimit(res, 100);
    expect(result).toBe('short');
  });
});

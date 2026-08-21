import { describe, expect, it } from 'vitest';
import { readTextWithinLimit } from '../src/utils/http';

describe('response size boundary', () => {
  it('fails closed when a streamed upstream response exceeds its limit', async () => {
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('too large'));
          controller.close();
        },
      })
    );
    await expect(readTextWithinLimit(response, 3)).resolves.toBeNull();
  });
});

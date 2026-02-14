import { describe, it, expect } from 'vitest';
import { handleHealth } from '../src/routes/health';

describe('api', () => {
  it('health returns ok', () => {
    const res = handleHealth();
    expect(res.status).toBe('ok');
    expect(res.timestamp).toBeDefined();
  });
});

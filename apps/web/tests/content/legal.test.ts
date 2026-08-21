import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderPrivacyMarkdown, renderTermsMarkdown } from '../../src/content/legal';

describe('published legal documents', () => {
  it('remain identical to the rendered public routes', () => {
    const root = resolve(__dirname, '../../../..');
    expect(readFileSync(resolve(root, 'PRIVACY.md'), 'utf8')).toBe(renderPrivacyMarkdown());
    expect(readFileSync(resolve(root, 'TERMS.md'), 'utf8')).toBe(renderTermsMarkdown());
  });
});

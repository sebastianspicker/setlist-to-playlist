// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

describe('RTL smoke test', () => {
  it('renders and queries elements', () => {
    render(<div>Hello RTL</div>);
    expect(screen.getByText('Hello RTL')).toBeInTheDocument();
  });
});

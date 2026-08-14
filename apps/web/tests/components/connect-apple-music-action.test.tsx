// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockAuthorizeMusicKit = vi.fn();
const mockIsMusicKitAuthorized = vi.fn();

vi.mock('../../src/lib/musickit', () => ({
  authorizeMusicKit: (...args: unknown[]) => mockAuthorizeMusicKit(...args),
  isMusicKitAuthorized: (...args: unknown[]) => mockIsMusicKitAuthorized(...args),
}));

import { AppleMusicAuthorization } from '../../src/features/matching/AppleMusicAuthorization';

describe('AppleMusicAuthorization action and success', () => {
  beforeEach(() => {
    mockAuthorizeMusicKit.mockReset();
    mockIsMusicKitAuthorized.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows the export authorization action', () => {
    render(<AppleMusicAuthorization />);
    expect(screen.getByRole('button', { name: 'Connect Apple Music' })).toBeInTheDocument();
  });

  it('calls onAuthorized only after authorization is checked', async () => {
    const onAuthorized = vi.fn();
    mockIsMusicKitAuthorized.mockResolvedValueOnce(true);
    mockAuthorizeMusicKit.mockResolvedValue('user-token');

    render(<AppleMusicAuthorization onAuthorized={onAuthorized} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Connect Apple Music' }));

    await waitFor(() => expect(onAuthorized).toHaveBeenCalledOnce());
  });
});

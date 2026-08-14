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

describe('AppleMusicAuthorization failure messaging', () => {
  beforeEach(() => {
    mockAuthorizeMusicKit.mockReset();
    mockIsMusicKitAuthorized.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('does not call onAuthorized when authorization is not confirmed', async () => {
    const onAuthorized = vi.fn();
    mockIsMusicKitAuthorized.mockResolvedValue(false);
    mockAuthorizeMusicKit.mockResolvedValue('user-token');

    render(<AppleMusicAuthorization onAuthorized={onAuthorized} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Connect Apple Music' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('authorization was not confirmed');
    });
    expect(onAuthorized).not.toHaveBeenCalled();
    expect(screen.queryByText('Connected to Apple Music')).not.toBeInTheDocument();
  });

  it('shows a retryable message when authorization is cancelled or denied', async () => {
    mockIsMusicKitAuthorized.mockResolvedValue(false);
    mockAuthorizeMusicKit.mockRejectedValue(new Error('denied by user'));

    render(<AppleMusicAuthorization />);

    fireEvent.click(await screen.findByRole('button', { name: 'Connect Apple Music' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'You cancelled or denied access. Click below to try again.'
      );
    });
    expect(screen.getByRole('button', { name: 'Try connecting again' })).toBeInTheDocument();
  });

  it('shows a revoked-access message for unauthorized MusicKit errors', async () => {
    mockIsMusicKitAuthorized.mockResolvedValue(false);
    mockAuthorizeMusicKit.mockRejectedValue(new Error('unauthorized token revoked'));

    render(<AppleMusicAuthorization />);

    fireEvent.click(await screen.findByRole('button', { name: 'Connect Apple Music' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Apple Music access was revoked. Click below to connect again.'
      );
    });
  });
});

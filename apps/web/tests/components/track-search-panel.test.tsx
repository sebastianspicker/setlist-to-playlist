// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CatalogTrackSearch } from '../../src/features/matching/CatalogTrackSearch';

function renderPanel(overrides: Partial<React.ComponentProps<typeof CatalogTrackSearch>> = {}) {
  const onSearch = vi.fn();
  const onCancel = vi.fn();
  const onChoose = vi.fn();
  const onSearchQueryChange = vi.fn();
  render(
    <CatalogTrackSearch
      index={1}
      searchQuery="Song A"
      searching={false}
      searchError={false}
      searchResults={[]}
      hasSearched={false}
      onSearchQueryChange={onSearchQueryChange}
      onSearch={onSearch}
      onChoose={onChoose}
      onCancel={onCancel}
      {...overrides}
    />
  );
  return { onSearch, onCancel, onChoose, onSearchQueryChange };
}

afterEach(cleanup);

describe('CatalogTrackSearch', () => {
  it('forwards query changes, Enter searches, and Escape cancels', () => {
    const { onSearch, onCancel, onSearchQueryChange } = renderPanel();
    const input = screen.getByRole('searchbox', { name: 'Search Apple Music' });

    fireEvent.change(input, { target: { value: 'Different song' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.keyDown(screen.getByRole('search'), { key: 'Escape' });

    expect(onSearchQueryChange).toHaveBeenCalledWith('Different song');
    expect(onSearch).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('renders selectable search results with their artists', () => {
    const { onChoose } = renderPanel({
      hasSearched: true,
      searchResults: [{ id: 'track-a', name: 'Song A (Live)', artistName: 'Artist A' }],
    });

    const result = screen.getByRole('button', { name: 'Select Song A (Live) by Artist A' });
    fireEvent.click(result);
    expect(result).toHaveTextContent('Song A (Live) · Artist A');
    expect(onChoose).toHaveBeenCalledWith({
      id: 'track-a',
      name: 'Song A (Live)',
      artistName: 'Artist A',
    });
  });

  it('distinguishes empty, loading, and failed searches', () => {
    const { rerender } = render(
      <CatalogTrackSearch
        index={1}
        searchQuery="Song A"
        searching={false}
        searchError={false}
        searchResults={[]}
        hasSearched
        onSearchQueryChange={vi.fn()}
        onSearch={vi.fn()}
        onChoose={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(
      screen.getByText('No songs found. Try different keywords or check the spelling.')
    ).toBeInTheDocument();

    rerender(
      <CatalogTrackSearch
        index={1}
        searchQuery="Song A"
        searching
        searchError={false}
        searchResults={[]}
        hasSearched
        onSearchQueryChange={vi.fn()}
        onSearch={vi.fn()}
        onChoose={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getAllByText('Searching…')).toHaveLength(2);

    rerender(
      <CatalogTrackSearch
        index={1}
        searchQuery="Song A"
        searching={false}
        searchError
        searchResults={[]}
        hasSearched
        onSearchQueryChange={vi.fn()}
        onSearch={vi.fn()}
        onChoose={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Search failed. Check your connection and try again.'
    );
  });
});

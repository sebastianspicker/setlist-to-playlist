import { expect, test } from '@playwright/test';
import {
  assertNoHorizontalOverflow,
  assertNoSeriousAxeViolations,
  captureState,
  installExternalMocks,
  LONG_SETLIST,
} from './fixtures';

async function loadFixtureSetlist(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForTimeout(500);
  const input = page.getByLabel('Setlist URL or ID');
  await input.fill('63de4613');
  await expect(input).toHaveValue('63de4613');
  await page.getByRole('button', { name: 'Load setlist' }).click();
  await expect(page.getByRole('region', { name: 'Setlist preview' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'setlist.fm', exact: true })).toHaveAttribute(
    'href',
    'https://www.setlist.fm/setlist/the-beatles/1964/hollywood-bowl-hollywood-ca-63de4613.html'
  );
}

test('hydrates persisted import history without a runtime error', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'setlist_import_history_v3',
      JSON.stringify([{ input: '63de4613', setlistId: '63de4613' }])
    );
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Recent imports' })).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('imports, matches, manually changes, and exports a playlist @screenshots', async ({
  page,
}, testInfo) => {
  await installExternalMocks(page, { catalogDelayMs: 200 });
  await page.goto('/');
  await page.waitForTimeout(500);
  await expect(page.getByRole('link', { name: 'Showtape home' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'setlist.fm source service' })).toHaveAttribute(
    'href',
    'https://www.setlist.fm/'
  );
  await assertNoSeriousAxeViolations(page);
  await captureState(page, testInfo, 'import');

  const input = page.getByLabel('Setlist URL or ID');
  await input.fill('63de4613');
  await expect(input).toHaveValue('63de4613');
  await page.getByRole('button', { name: 'Load setlist' }).click();
  await expect(page.getByRole('region', { name: 'Setlist preview' })).toContainText(
    'Hollywood Bowl'
  );
  await assertNoSeriousAxeViolations(page);
  await captureState(page, testInfo, 'preview');

  await page.getByRole('button', { name: 'Match songs on Apple Music' }).click();
  await expect(page.getByRole('region', { name: 'Match tracks' })).toBeVisible();
  await captureState(page, testInfo, 'matching-pending');
  await expect(page.getByText('3 of 3 songs matched')).toBeVisible();
  await assertNoSeriousAxeViolations(page);
  await captureState(page, testInfo, 'matching-complete');

  await page.getByRole('button', { name: "Change match for Can't Buy Me Love" }).click();
  await page.getByRole('searchbox', { name: 'Search Apple Music' }).fill("Can't Buy Me Love");
  await page.getByRole('button', { name: 'Search Apple Music' }).click();
  await expect(
    page.getByRole('button', { name: "Select Can't Buy Me Love by The Beatles" })
  ).toBeVisible();
  await captureState(page, testInfo, 'manual-search');
  await page.getByRole('button', { name: "Select Can't Buy Me Love by The Beatles" }).click();

  await page.getByRole('button', { name: 'Review playlist' }).click();
  await expect(page.getByRole('region', { name: 'Export playlist' })).toBeVisible();
  await assertNoSeriousAxeViolations(page);
  await captureState(page, testInfo, 'export');
  await page.getByRole('button', { name: 'Create playlist' }).click();
  await expect(page.getByText('Playlist ready')).toBeVisible();
  await assertNoSeriousAxeViolations(page);
  await captureState(page, testInfo, 'success');
});

test('shows a resumable partial import when Apple Music adding tracks fails @screenshots', async ({
  page,
}, testInfo) => {
  await installExternalMocks(page, { scenario: 'partial' });
  await loadFixtureSetlist(page);
  await page.getByRole('button', { name: 'Match songs on Apple Music' }).click();
  await expect(page.getByText('3 of 3 songs matched')).toBeVisible();
  await page.getByRole('button', { name: 'Review playlist' }).click();
  await page.getByRole('button', { name: 'Create playlist' }).click();
  await expect(page.getByText('Playlist created; import incomplete')).toBeVisible();
  await assertNoSeriousAxeViolations(page);
  await captureState(page, testInfo, 'partial');
});

test('reflows without horizontal overflow at phone, 200%, 400%, and desktop widths @screenshots', async ({
  page,
}, testInfo) => {
  await installExternalMocks(page);
  for (const viewport of [
    { width: 320, height: 800 },
    { width: 375, height: 812 },
    { width: 640, height: 900 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await loadFixtureSetlist(page);
    await assertNoHorizontalOverflow(page);
    await captureState(page, testInfo, `responsive-${viewport.width}`);
  }
});

test('supports keyboard completion, focus transitions, cancellation, and preserved edits', async ({
  page,
}) => {
  await installExternalMocks(page);
  await page.goto('/');
  await page.waitForTimeout(500);

  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();

  const importInput = page.getByLabel('Setlist URL or ID');
  await importInput.focus();
  await importInput.fill('63de4613');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Review setlist' })).toBeFocused();

  const matchButton = page.getByRole('button', { name: 'Match songs on Apple Music' });
  await matchButton.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Confirm each song' })).toBeFocused();
  await expect(page.getByText('3 of 3 songs matched')).toBeVisible();

  const changeButton = page.getByRole('button', { name: "Change match for Can't Buy Me Love" });
  await changeButton.focus();
  await page.keyboard.press('Enter');
  const searchInput = page.getByRole('searchbox', { name: 'Search Apple Music' });
  await expect(searchInput).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(changeButton).toBeFocused();

  await page.keyboard.press('Enter');
  await searchInput.fill("Can't Buy Me Love");
  await page.keyboard.press('Enter');
  const result = page.getByRole('button', { name: "Select Can't Buy Me Love by The Beatles" });
  await result.focus();
  await page.keyboard.press('Enter');
  await expect(changeButton).toBeFocused();

  const reviewButton = page.getByRole('button', { name: 'Review playlist' });
  await reviewButton.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Save to Apple Music' })).toBeFocused();

  const backButton = page.getByRole('button', { name: 'Back to matching' });
  await backButton.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Confirm each song' })).toBeFocused();
  await expect(page.getByText("Can't Buy Me Love", { exact: true }).last()).toBeVisible();
});

test('keeps long setlist metadata and songs operable at 320px @screenshots', async ({
  page,
}, testInfo) => {
  await installExternalMocks(page, { setlist: LONG_SETLIST });
  await page.setViewportSize({ width: 320, height: 800 });
  await loadFixtureSetlist(page);
  await assertNoHorizontalOverflow(page);
  await assertNoSeriousAxeViolations(page);
  await captureState(page, testInfo, 'responsive-long-content-320');
});

test('exposes privacy and terms without authorization', async ({ page }) => {
  for (const route of ['/privacy', '/terms']) {
    await page.goto(route);
    await expect(page.getByRole('main')).toBeVisible();
    await assertNoSeriousAxeViolations(page);
  }
});

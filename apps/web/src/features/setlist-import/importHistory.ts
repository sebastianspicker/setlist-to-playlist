import { parseSetlistIdFromInput } from '@repo/core';

const HISTORY_V1_STORAGE_ENTRY = 'setlist_import_history_v1';
const HISTORY_V2_STORAGE_ENTRY = 'setlist_import_history_v2';
const HISTORY_V3_STORAGE_ENTRY = 'setlist_import_history_v3';
const MAX_HISTORY_ITEMS = 8;

export interface ImportHistoryItem {
  input: string;
  setlistId: string;
}

function isHistoryItem(value: unknown): value is ImportHistoryItem {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.input === 'string' && typeof record.setlistId === 'string';
}

function clearLegacyHistory(): void {
  try {
    window.localStorage.removeItem(HISTORY_V1_STORAGE_ENTRY);
    window.localStorage.removeItem(HISTORY_V2_STORAGE_ENTRY);
  } catch {
    // Migrating legacy history is best effort when storage access is blocked.
  }
}

export function clearImportHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(HISTORY_V1_STORAGE_ENTRY);
    window.localStorage.removeItem(HISTORY_V2_STORAGE_ENTRY);
    window.localStorage.removeItem(HISTORY_V3_STORAGE_ENTRY);
  } catch {
    // Clearing optional browser history is best effort.
  }
}

export function writeImportHistory(next: ImportHistoryItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      HISTORY_V3_STORAGE_ENTRY,
      JSON.stringify(next.slice(0, MAX_HISTORY_ITEMS))
    );
  } catch {
    // History is optional; storage can be unavailable or full.
  }
}

function parseHistoryArray(raw: string): unknown[] | null {
  const parsed = JSON.parse(raw) as unknown;
  return Array.isArray(parsed) ? parsed : null;
}

function migrateV2History(raw: string): ImportHistoryItem[] | null {
  const parsed = parseHistoryArray(raw);
  if (!parsed) return null;
  return parsed
    .filter(isHistoryItem)
    .map(({ input, setlistId }) => ({ input, setlistId }))
    .slice(0, MAX_HISTORY_ITEMS);
}

function migrateV1History(raw: string): ImportHistoryItem[] | null {
  const parsed = parseHistoryArray(raw);
  if (!parsed) return null;
  return parsed
    .filter((value): value is string => typeof value === 'string')
    .map((input) => ({
      input,
      setlistId: parseSetlistIdFromInput(input) ?? input,
    }))
    .slice(0, MAX_HISTORY_ITEMS);
}

function readV3History(raw: string): ImportHistoryItem[] {
  const parsed = parseHistoryArray(raw);
  if (!parsed) {
    clearImportHistory();
    return [];
  }
  clearLegacyHistory();
  return parsed.filter(isHistoryItem).slice(0, MAX_HISTORY_ITEMS);
}

function readMigratedHistory(raw: string, migrate: (value: string) => ImportHistoryItem[] | null) {
  const migrated = migrate(raw);
  if (!migrated) {
    clearLegacyHistory();
    return [];
  }
  writeImportHistory(migrated);
  clearLegacyHistory();
  return migrated;
}

export function readImportHistory(): ImportHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const v3Raw = window.localStorage.getItem(HISTORY_V3_STORAGE_ENTRY);
    if (v3Raw) {
      return readV3History(v3Raw);
    }

    const v2Raw = window.localStorage.getItem(HISTORY_V2_STORAGE_ENTRY);
    if (v2Raw) {
      return readMigratedHistory(v2Raw, migrateV2History);
    }

    const v1Raw = window.localStorage.getItem(HISTORY_V1_STORAGE_ENTRY);
    if (!v1Raw) return [];
    return readMigratedHistory(v1Raw, migrateV1History);
  } catch {
    clearImportHistory();
    return [];
  }
}

export function pushImportHistoryItem(
  prev: ImportHistoryItem[],
  item: ImportHistoryItem
): ImportHistoryItem[] {
  const deduped = [
    item,
    ...prev.filter((entry) => entry.setlistId !== item.setlistId && entry.input !== item.input),
  ];
  return deduped.slice(0, MAX_HISTORY_ITEMS);
}

export type FetchSetlistResult =
  | { ok: true; body: unknown }
  | { ok: false; status: number; message: string };

export type FetchSetlistFailure = Extract<FetchSetlistResult, { ok: false }>;

export type FetchAttemptResult =
  | { kind: 'success'; body: unknown }
  | { kind: 'failure'; error: FetchSetlistFailure }
  | { kind: 'rate-limit'; response: Response; message: string };

/**
 * Single document autosave protocol. This owns no editor state.
 * Every server update is a compare-and-swap on content_version.
 * A failed write MUST NOT advance version or show 'saved'.
 */
export type AutosaveStatus = 'saved' | 'dirty' | 'saving' | 'error' | 'conflict';
export type SaveOutcome =
  | { ok: true; version: number }
  | { ok: false; kind: 'error' | 'conflict'; message?: string };

export type AutosaveOptions<T> = {
  initialContent: T;
  initialVersion: number;
  send: (content: T, baseVersion: number) => Promise<SaveOutcome>;
  onStatus: (status: AutosaveStatus, message?: string) => void;
  debounceMs?: number;
};

export class NoteV2Autosave<T> {
  private confirmed: string;
  private pending: string;
  private version: number;
  private readonly send: AutosaveOptions<T>['send'];
  private readonly onStatus: AutosaveOptions<T>['onStatus'];
  private readonly debounceMs: number;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private flight: Promise<void> | null = null;
  private stopped: 'error' | 'conflict' | null = null;
  private disposed = false;

  constructor(options: AutosaveOptions<T>) {
    this.confirmed = JSON.stringify(options.initialContent);
    this.pending = this.confirmed;
    this.version = options.initialVersion;
    this.send = options.send;
    this.onStatus = options.onStatus;
    this.debounceMs = options.debounceMs ?? 800;
  }

  get hasPending(): boolean {
    return this.pending !== this.confirmed || this.flight !== null;
  }
  get baseVersion(): number { return this.version; }
  get pendingJSON(): string { return this.pending; }

  edit(content: T): void {
    if (this.disposed) return;
    const serialized = JSON.stringify(content);
    if (serialized === this.pending) return;
    this.pending = serialized;
    if (this.stopped) { this.onStatus(this.stopped); return; }
    if (this.pending === this.confirmed && !this.flight) {
      this.clearTimer();
      this.onStatus('saved');
      return;
    }
    this.onStatus('dirty');
    this.schedule();
  }

  private clearTimer(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  private schedule(): void {
    this.clearTimer();
    if (this.disposed || this.stopped || this.pending === this.confirmed) return;
    this.timer = setTimeout(() => { void this.flush(); }, this.debounceMs);
  }

  async flush(): Promise<void> {
    if (this.disposed || this.stopped) return;
    this.clearTimer();
    if (this.flight) { await this.flight; return; }
    if (this.pending === this.confirmed) return;
    this.flight = this.drain();
    try { await this.flight; }
    finally { this.flight = null; }
  }

  private async drain(): Promise<void> {
    while (!this.disposed && !this.stopped && this.pending !== this.confirmed) {
      const snapshot = this.pending;
      const expectedVersion = this.version;
      this.onStatus('saving');
      let result: SaveOutcome;
      try {
        result = await this.send(JSON.parse(snapshot) as T, expectedVersion);
      } catch {
        result = { ok: false, kind: 'error', message: '네트워크 오류. 다시 저장을 눌러주세요.' };
      }
      if (this.disposed) return;
      if (!result.ok) {
        this.stopped = result.kind;
        this.onStatus(result.kind, result.message);
        return;
      }
      if (result.version !== expectedVersion + 1) {
        this.stopped = 'error';
        this.onStatus('error', '서버 버전 응답이 올바르지 않습니다.');
        return;
      }
      this.version = result.version;
      this.confirmed = snapshot;
      // In-flight local edits are not acknowledged by the previous request.
      if (this.pending !== this.confirmed) this.onStatus('dirty');
    }
    if (!this.stopped && !this.disposed) this.onStatus('saved');
  }

  async retry(): Promise<void> {
    if (this.disposed || this.stopped === 'conflict') return;
    this.stopped = null;
    await this.flush();
  }

  /** React StrictMode may replay effect mount/cleanup during local development. */
  resume(): void {
    this.disposed = false;
    if (!this.stopped && this.pending !== this.confirmed) this.schedule();
  }

  dispose(): void {
    this.disposed = true;
    this.clearTimer();
  }
}

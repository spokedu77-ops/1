import { FlowAudio } from '../flow-lab/engine/FlowAudio';

/** Unity uses the same gesture-primed Web Audio path as Flow, not late HTMLAudio. */
export class DiveBgmController {
  private audio: FlowAudio;
  private initialized: Promise<void>;
  private path = '';
  private loaded = false;
  private requested = false;
  private playing = false;
  private disposed = false;
  private generation = 0;

  constructor(private onIssue: (issue: boolean) => void = () => {}, audio = new FlowAudio()) {
    this.audio = audio;
    this.initialized = audio.init({ bgmEnabled: true, sfxEnabled: false });
    void this.initialized.catch(() => { if (!this.disposed) this.onIssue(true); });
  }

  async prepare(path: string, force = false): Promise<void> {
    if (this.disposed || !path || (path === this.path && !force)) return;
    this.path = path;
    this.loaded = false;
    const generation = ++this.generation;
    try {
      await this.initialized;
      if (this.disposed || generation !== this.generation) return;
      const loaded = await this.audio.loadBgm(path);
      if (this.disposed || generation !== this.generation) return;
      this.loaded = loaded;
      this.playing = false;
      this.onIssue(!loaded);
      if (loaded) await this.playIfReady();
    } catch {
      if (!this.disposed && generation === this.generation) this.onIssue(true);
    }
  }

  start(): void {
    this.requested = true;
    void this.playIfReady();
  }

  private async playIfReady(): Promise<void> {
    if (this.disposed || !this.requested || !this.loaded || this.playing) return;
    try {
      if (this.audio.isPlaybackBlocked()) this.onIssue(true);
      await this.audio.resume();
      if (this.disposed || !this.requested || !this.loaded || this.playing) return;
      if (this.audio.isPlaybackBlocked()) { this.onIssue(true); return; }
      this.playing = true;
      this.audio.startMusic();
      this.onIssue(false);
    } catch { if (!this.disposed) this.onIssue(true); }
  }

  /** Called by a user gesture; resume happens before awaiting network work. */
  async retry(): Promise<void> {
    if (this.disposed) return;
    try {
      await this.audio.resume();
      if (!this.loaded) await this.prepare(this.path, true);
      else await this.playIfReady();
    } catch { if (!this.disposed) this.onIssue(true); }
  }

  stop(): void { this.requested = false; this.playing = false; this.audio.stopMusic(); }
  dispose(): void { this.disposed = true; this.generation++; this.stop(); this.audio.dispose(); }
}

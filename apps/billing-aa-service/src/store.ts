
type Metrics = { queued: number; inProgress: number; done: number; failed: number; watching: number };

export type Job = {
  subId: number;
  cycleIndex: number | "auto";
  retries?: number;
  nextRunAt?: number;
  id?: string;
};

export class JobsMemStore {
  private watched = new Set<number>();
  private q: Job[] = [];
  private progress = new Set<string>();
  private done = 0;
  private failed = 0;

  async watch(subId: number) {
    this.watched.add(subId);
  }

  async listWatched(): Promise<number[]> {
    return [...this.watched];
  }

  async enqueue(job: Job) {
    // idempotencia básica: evita duplicar mismo subId+cycleIndex si no es "auto"
    if (job.cycleIndex !== "auto") {
      const id = `${job.subId}:${job.cycleIndex}`;
      if (this.q.find((j) => `${j.subId}:${j.cycleIndex}` === id)) return;
    }
    job.id = `${job.subId}:${Date.now()}:${Math.random()}`;
    this.q.push(job);
  }

  async nextReady(): Promise<Job | undefined> {
    const now = Date.now();
    const i = this.q.findIndex((j) => (j.nextRunAt ?? 0) <= now);
    if (i === -1) return undefined;
    const job = this.q.splice(i, 1)[0];
    if (job.id) this.progress.add(job.id);
    return job;
  }

  async complete(job: Job) {
    if (job.id) this.progress.delete(job.id);
    this.done++;
  }

  async retryLater(job: Job, backoffMs: number, _reason: string) {
    job.retries = (job.retries ?? 0) + 1;
    job.nextRunAt = Date.now() + backoffMs;
    if (!job.id) job.id = `${job.subId}:${Date.now()}:${Math.random()}`;
    this.q.push(job);
  }

  async giveUp(job: Job, _reason: string) {
    if (job.id) this.progress.delete(job.id);
    this.failed++;
  }

  metrics(): Metrics {
    return {
      queued: this.q.length,
      inProgress: this.progress.size,
      done: this.done,
      failed: this.failed,
      watching: this.watched.size
    };
  }
}



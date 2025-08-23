
import type { Logger } from "pino";
import { JobsMemStore, Job } from "./store";

type Options = {
  minBackoffMs: number;
  maxBackoffMs: number;
  maxRetries: number;
  concurrency: number;
  hardDailyChargeLimit: number;
};

export class Scheduler {
  private running = false;
  private interval?: NodeJS.Timeout;
  private active = 0;
  private chargedToday = 0;
  private lastResetDay = new Date().getUTCDate();

  constructor(private store: JobsMemStore, private logger: Logger, private opt: Options) {}

  start(executor: (job: Job) => Promise<void>) {
    if (this.running) return;
    this.running = true;
    this.interval = setInterval(async () => {
      try {
        // reset diario
        const d = new Date().getUTCDate();
        if (d !== this.lastResetDay) {
          this.lastResetDay = d;
          this.chargedToday = 0;
        }
        if (this.chargedToday >= this.opt.hardDailyChargeLimit) return;

        while (this.active < this.opt.concurrency) {
          const job = await this.store.nextReady();
          if (!job) break;
          this.active++;
          (async () => {
            try {
              await executor(job);
              this.chargedToday++;
            } catch (e) {
              // executor ya llama fail()
            } finally {
              this.active--;
            }
          })();
        }
      } catch (e: any) {
        this.logger.error({ err: e }, "scheduler_tick_error");
      }
    }, 2_000);
  }

  async enqueue(subId: number, cyclesDue: number) {
    for (let i = 0; i < cyclesDue; i++) {
      await this.store.enqueue({ subId, cycleIndex: "auto" });
    }
  }

  async complete(job: Job) {
    await this.store.complete(job);
  }

  async fail(job: Job, reason: string) {
    const n = job.retries ?? 0;
    if (n + 1 >= this.opt.maxRetries) {
      await this.store.giveUp(job, reason);
      this.logger.warn({ subId: job.subId, reason }, "job_gave_up");
      return;
    }
    const backoff = Math.min(this.opt.maxBackoffMs, this.opt.minBackoffMs * 2 ** n);
    await this.store.retryLater(job, backoff, reason);
  }

  metrics() {
    return this.store.metrics();
  }
}



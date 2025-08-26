export class Scheduler {
    store;
    logger;
    opt;
    running = false;
    interval;
    active = 0;
    chargedToday = 0;
    lastResetDay = new Date().getUTCDate();
    constructor(store, logger, opt) {
        this.store = store;
        this.logger = logger;
        this.opt = opt;
    }
    start(executor) {
        if (this.running)
            return;
        this.running = true;
        const tick = async () => {
            try {
                // reset diario
                const d = new Date().getUTCDate();
                if (d !== this.lastResetDay) {
                    this.lastResetDay = d;
                    this.chargedToday = 0;
                }
                if (this.chargedToday >= this.opt.hardDailyChargeLimit)
                    return;
                while (this.active < this.opt.concurrency) {
                    const job = await this.store.nextReady();
                    if (!job)
                        break;
                    this.active++;
                    (async () => {
                        try {
                            await executor(job);
                            this.chargedToday++;
                        }
                        catch (e) {
                            // executor ya llama fail()
                        }
                        finally {
                            this.active--;
                        }
                    })();
                }
            }
            catch (e) {
                this.logger.error({ err: e }, "scheduler_tick_error");
            }
        };
        this.interval = setInterval(tick, this.opt.tickMs ?? 2_000);
        tick();
    }
    async enqueue(subId, cyclesDue) {
        for (let i = 0; i < cyclesDue; i++) {
            await this.store.enqueue({ subId, cycleIndex: "auto" });
        }
    }
    async complete(job) {
        await this.store.complete(job);
    }
    async fail(job, reason) {
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

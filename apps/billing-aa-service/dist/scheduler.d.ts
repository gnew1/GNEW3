import type { Logger } from "pino";
import { JobsMemStore, Job } from "./store";
type Options = {
    minBackoffMs: number;
    maxBackoffMs: number;
    maxRetries: number;
    concurrency: number;
    hardDailyChargeLimit: number;
    tickMs?: number;
};
export declare class Scheduler {
    private store;
    private logger;
    private opt;
    private running;
    private interval?;
    private active;
    private chargedToday;
    private lastResetDay;
    constructor(store: JobsMemStore, logger: Logger, opt: Options);
    start(executor: (job: Job) => Promise<void>): void;
    enqueue(subId: number, cyclesDue: number): Promise<void>;
    complete(job: Job): Promise<void>;
    fail(job: Job, reason: string): Promise<void>;
    metrics(): {
        queued: number;
        inProgress: number;
        done: number;
        failed: number;
        watching: number;
    };
}
export {};

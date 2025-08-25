type Metrics = {
    queued: number;
    inProgress: number;
    done: number;
    failed: number;
    watching: number;
};
export type Job = {
    subId: number;
    cycleIndex: number | "auto";
    retries?: number;
    nextRunAt?: number;
    id?: string;
};
export declare class JobsMemStore {
    private watched;
    private q;
    private progress;
    private done;
    private failed;
    watch(subId: number): Promise<void>;
    listWatched(): Promise<number[]>;
    enqueue(job: Job): Promise<void>;
    nextReady(): Promise<Job | undefined>;
    complete(job: Job): Promise<void>;
    retryLater(job: Job, backoffMs: number, _reason: string): Promise<void>;
    giveUp(job: Job, _reason: string): Promise<void>;
    metrics(): Metrics;
}
export {};

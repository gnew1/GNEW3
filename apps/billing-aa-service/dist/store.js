export class JobsMemStore {
    watched = new Set();
    q = [];
    progress = new Set();
    done = 0;
    failed = 0;
    async watch(subId) {
        this.watched.add(subId);
    }
    async listWatched() {
        return [...this.watched];
    }
    async enqueue(job) {
        // idempotencia básica: evita duplicar mismo subId+cycleIndex si no es "auto"
        if (job.cycleIndex !== "auto") {
            const id = `${job.subId}:${job.cycleIndex}`;
            if (this.q.find((j) => `${j.subId}:${j.cycleIndex}` === id))
                return;
        }
        job.id = `${job.subId}:${Date.now()}:${Math.random()}`;
        this.q.push(job);
    }
    async nextReady() {
        const now = Date.now();
        const i = this.q.findIndex((j) => (j.nextRunAt ?? 0) <= now);
        if (i === -1)
            return undefined;
        const job = this.q.splice(i, 1)[0];
        if (job.id)
            this.progress.add(job.id);
        return job;
    }
    async complete(job) {
        if (job.id)
            this.progress.delete(job.id);
        this.done++;
    }
    async retryLater(job, backoffMs, _reason) {
        job.retries = (job.retries ?? 0) + 1;
        job.nextRunAt = Date.now() + backoffMs;
        if (!job.id)
            job.id = `${job.subId}:${Date.now()}:${Math.random()}`;
        this.q.push(job);
    }
    async giveUp(job, _reason) {
        if (job.id)
            this.progress.delete(job.id);
        this.failed++;
    }
    metrics() {
        return {
            queued: this.q.length,
            inProgress: this.progress.size,
            done: this.done,
            failed: this.failed,
            watching: this.watched.size
        };
    }
}

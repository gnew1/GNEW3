
import { Scheduler } from "../src/scheduler";
import { JobsMemStore } from "../src/store";

const logger = { info(){}, warn(){}, error(){} } as any;

describe("Scheduler idempotencia y backoff", () => {
  it("reintenta con backoff y se detiene tras maxRetries", async () => {
    const store = new JobsMemStore();
    const sch = new Scheduler(store, logger, { minBackoffMs: 10, maxBackoffMs: 80, maxRetries: 3, concurrency: 1, hardDailyChargeLimit: 100 });
    await store.enqueue({ subId: 1, cycleIndex: 1 });

    let calls = 0;
    sch.start(async (job) => {
      calls++;
      throw new Error("fail");
    });

    await new Promise((r) => setTimeout(r, 400));
    const m = sch.metrics();
    expect(m.failed).toBe(1);
    expect(calls).toBeGreaterThanOrEqual(3);
  });
});



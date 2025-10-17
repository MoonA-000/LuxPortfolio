import { createWorker } from "@/lib/queue";

const worker = createWorker();

worker.on("completed", (job) => console.log(`[worker] completed ${job.name} ${job.id}`));
worker.on("failed", (job, err) => console.error(`[worker] failed ${job?.name} ${job?.id}`, err));

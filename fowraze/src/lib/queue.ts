import { Queue, Worker, QueueScheduler, JobsOptions } from "bullmq";
import Redis from "ioredis";

const connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

export type JobType =
  | { name: "quote-follow-up"; data: { quoteId: string } }
  | { name: "invoice-reminder"; data: { invoiceId: string } };

export const appQueue = new Queue("fowraze-main", { connection });
export const appScheduler = new QueueScheduler("fowraze-main", { connection });

export function enqueue(job: JobType, opts?: JobsOptions) {
  return appQueue.add(job.name, job.data as any, opts);
}

export function createWorker() {
  return new Worker(
    "fowraze-main",
    async (job) => {
      switch (job.name) {
        case "quote-follow-up":
          console.log("[worker] quote-follow-up", job.data);
          break;
        case "invoice-reminder":
          console.log("[worker] invoice-reminder", job.data);
          break;
      }
    },
    { connection }
  );
}

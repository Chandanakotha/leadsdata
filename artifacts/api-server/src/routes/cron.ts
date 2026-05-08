import { Router, type IRouter } from "express";
import { getSchedulerStatus, runEmailJob } from "../lib/scheduler";

const router: IRouter = Router();

router.get("/cron/status", (_req, res): void => {
  res.json(getSchedulerStatus());
});

router.post("/cron/trigger", async (_req, res): Promise<void> => {
  const result = await runEmailJob();
  res.json(result);
});

export default router;

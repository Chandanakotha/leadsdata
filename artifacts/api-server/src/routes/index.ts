import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import leadsRouter from "./leads";
import templatesRouter from "./templates";
import emailsRouter from "./emails";
import dashboardRouter from "./dashboard";
import cronRouter from "./cron";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(leadsRouter);
router.use(templatesRouter);
router.use(emailsRouter);
router.use(dashboardRouter);
router.use(cronRouter);

export default router;

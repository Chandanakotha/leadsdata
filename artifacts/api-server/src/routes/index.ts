import { Router, type IRouter } from "express";
import healthRouter from "./health";
import leadsRouter from "./leads";
import templatesRouter from "./templates";
import emailsRouter from "./emails";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(leadsRouter);
router.use(templatesRouter);
router.use(emailsRouter);
router.use(dashboardRouter);

export default router;

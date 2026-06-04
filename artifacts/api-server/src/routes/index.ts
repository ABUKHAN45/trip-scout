import { Router, type IRouter } from "express";
import healthRouter from "./health";
import airportsRouter from "./airports";
import flightsRouter from "./flights";
import tripsRouter from "./trips";

const router: IRouter = Router();

router.use(healthRouter);
router.use(airportsRouter);
router.use(flightsRouter);
router.use(tripsRouter);

export default router;

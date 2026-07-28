import { Router } from "express";
import { getForecast, getWeeklyOutlook } from "../controllers/forecast.controller";

const router = Router();

router.get("/:cityId", getForecast);
router.get("/:cityId/weekly", getWeeklyOutlook);

export default router;

import { Router } from "express";
import { body, param, query } from "express-validator";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  getOverview,
  listCommunications,
  getCommunicationDetail,
  replyToCommunication,
  resolveCommunication,
  reopenCommunication,
  sendEmergencyBroadcast,
  getEmergencyHistory,
} from "../controllers/communication-hub.controller";

const router = Router();

// The entire Communication Hub is administrator-only. Enforced here
// server-side — the frontend nav/route guard is not sufficient on its own.
router.use(authenticate, authorize("administrator"));

const typeParamValidator = [
  param("type").isIn(["tickets", "bugs", "features", "feedback"]).withMessage("Unknown communication type"),
];
const idParamValidator = [
  param("id").isMongoId().withMessage("Invalid ID"),
];

router.get("/overview", getOverview);

router.get(
  "/emergency/history",
  getEmergencyHistory,
);
router.post(
  "/emergency/send",
  [
    body("title").trim().isLength({ min: 3, max: 200 }).withMessage("Title must be 3–200 characters"),
    body("message").trim().isLength({ min: 5, max: 1000 }).withMessage("Message must be 5–1000 characters"),
    body("severity").isIn(["low", "medium", "high", "critical"]).withMessage("Invalid severity"),
    body("audience").isIn(["all", "citizen", "authority", "administrator"]).withMessage("Invalid audience"),
  ],
  validate,
  sendEmergencyBroadcast,
);

router.get(
  "/:type",
  [
    ...typeParamValidator,
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("unread").optional().isIn(["true", "false"]),
    query("sort").optional().isIn(["newest", "oldest"]),
    query("search").optional().trim().isLength({ max: 200 }),
  ],
  validate,
  listCommunications,
);

router.get("/:type/:id", [...typeParamValidator, ...idParamValidator], validate, getCommunicationDetail);

router.post(
  "/:type/:id/reply",
  [...typeParamValidator, ...idParamValidator, body("body").trim().isLength({ min: 1, max: 2000 })],
  validate,
  replyToCommunication,
);
router.post("/:type/:id/resolve", [...typeParamValidator, ...idParamValidator], validate, resolveCommunication);
router.post("/:type/:id/reopen",  [...typeParamValidator, ...idParamValidator], validate, reopenCommunication);

export default router;

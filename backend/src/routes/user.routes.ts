import { Router } from "express";
import { getUser, getUserStats } from "../controllers/user.controller";
import { authenticate, authorize, AUTHORITY_ROLES } from "../middleware/auth";

const router = Router();

router.get("/stats", authenticate, getUserStats);
// Looking up another user's profile by id is an authority-tier capability,
// not a self-scoped one — matches Phase 1.5's Citizen APIs scope ("Update
// Own Profile" etc.), which doesn't extend to viewing other accounts.
router.get("/:id", authenticate, authorize(...AUTHORITY_ROLES), getUser);

export default router;

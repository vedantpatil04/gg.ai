import { Router } from "express";
import {
  getAppearanceSettings, updateAppearanceSettings,
  getNotificationSettings, updateNotificationSettings,
  getLanguageRegionSettings, updateLanguageRegionSettings,
  getDashboardSettings, updateDashboardSettings, restoreDashboardDefaults,
  getMapSettings, updateMapSettings,
  getAccessibilitySettings, updateAccessibilitySettings,
  getPrivacySettings, updatePrivacySettings,
} from "../controllers/settings.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  updateAppearanceValidator, updateNotificationsValidator, updateLanguageRegionValidator,
  updateDashboardValidator, updateMapsValidator, updateAccessibilityValidator, updatePrivacyValidator,
} from "../validators/settings.validator";

const router = Router();

// Every Enterprise Settings endpoint is self-scoped to the authenticated
// user — same convention as /api/security (see security.routes.ts).
router.use(authenticate);

router.get("/appearance", getAppearanceSettings);
router.patch("/appearance", updateAppearanceValidator, validate, updateAppearanceSettings);

router.get("/notifications", getNotificationSettings);
router.patch("/notifications", updateNotificationsValidator, validate, updateNotificationSettings);

router.get("/language-region", getLanguageRegionSettings);
router.patch("/language-region", updateLanguageRegionValidator, validate, updateLanguageRegionSettings);

router.get("/dashboard", getDashboardSettings);
router.patch("/dashboard", updateDashboardValidator, validate, updateDashboardSettings);
router.post("/dashboard/restore", restoreDashboardDefaults);

router.get("/maps", getMapSettings);
router.patch("/maps", updateMapsValidator, validate, updateMapSettings);

router.get("/accessibility", getAccessibilitySettings);
router.patch("/accessibility", updateAccessibilityValidator, validate, updateAccessibilitySettings);

router.get("/privacy", getPrivacySettings);
router.patch("/privacy", updatePrivacyValidator, validate, updatePrivacySettings);

export default router;

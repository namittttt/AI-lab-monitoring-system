
import express from "express"
const router = express.Router();
import settingsCtrl from "../controllers/settings.controller.js"

router.get('/frequency', settingsCtrl.getDefaultDetections);
router.post('/frequency', settingsCtrl.setDefaultDetections);

export default router;

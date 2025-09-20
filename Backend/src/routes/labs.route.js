import express from "express"
const router = express.Router();
import labCtrl from "../controllers/lab.controller.js"

router.post("/labs", labCtrl.createLab);
router.get('/', labCtrl.listLabs);
router.get('/:id', labCtrl.getLab);

export default router;

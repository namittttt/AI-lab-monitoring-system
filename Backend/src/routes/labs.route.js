import express from "express";
const router = express.Router();
import labCtrl from "../controllers/lab.controller.js";

// ✅ Define the full path for each route
router.post("/", labCtrl.createLab);   // POST /api/labs
router.get("/", labCtrl.listLabs);     // GET /api/labs
router.get("/:id", labCtrl.getLab);    // GET /api/labs/:id
router.get("/:labId/detections", labCtrl.getLabDetections);
router.delete("/:id", labCtrl.deleteLab);
// router.get("/", labCtrl.listallLabs);

export default router;



// import express from "express"
// const router = express.Router();
// import labCtrl from "../controllers/lab.controller.js"

// router.post("/labs", labCtrl.createLab);
// router.get('/', labCtrl.listLabs);
// router.get('/:id', labCtrl.getLab);

// export default router;

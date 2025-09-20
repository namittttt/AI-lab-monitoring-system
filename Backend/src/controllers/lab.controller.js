import Lab from "../models/Lab.model.js"
import Detection from "../models/detection.model.js"
import { asyncHandler } from "../utils/asyncHandler.js";
import LabSession from "../models/LabSession.model.js";

const createLab = asyncHandler(async (req, res) => {
  const { name, capacity, cameraStatus, cameraIP } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Lab name is required" });
  }

  const lab = await Lab.create({
    name,
    capacity,
    cameraStatus: cameraStatus || "online",
    cameraIP: '0',
    ipRange: ipRange || '',
    currentUtilization: 0,
  });
  
        

  res.status(201).json(lab);
});

const listLabs = asyncHandler(async (req, res) => {
  const labs = await Lab.find().lean();
  res.json(labs);
});

const getLab = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const lab = await Lab.findById(id);
  if (!lab) return res.status(404).json({ message: "Lab not found" });

  // Fetch recent 5 sessions for this lab, sorted by start time desc
  const recentSessions = await LabSession.find({ lab: id })
    .sort({ startTime: -1 })
    .limit(5)
    .lean();

  res.json({ lab, recentSessions });
});

export default {
  createLab,
  listLabs,
  getLab,
};









// const createLab = asyncHandler(async (req, res) => {
//   const { name, capacity, cameraStatus } = req.body;

//   if (!name) {
//     return res.status(400).json({ message: "Lab name is required" });
//   }

//   const lab = await Lab.create({
//     name,
//     capacity: capacity || 10, // default capacity
//     currentUtilization: 0,    // start at zero
//     cameraStatus: cameraStatus || "online"
//   });

//   res.status(201).json(lab);
// });

// async function listLabs(req, res) {
//   const labs = await Lab.find().lean();
//   res.json(labs);
// }

// async function getLab(req, res) {
//   const { id } = req.params;
//   const lab = await Lab.findById(id);
//   if (!lab) return res.status(404).json({ message: 'Lab not found' });

//   // get recent detection violations (example: capacity_violation alerts)
//   const detections = await Detection.find({ lab: id }).sort({ timestamp: -1 }).limit(20);
//   res.json({ lab, recentDetections: detections });
//   }

// export default {
//   createLab,
//   listLabs: asyncHandler(listLabs),
//   getLab: asyncHandler(getLab)
// };

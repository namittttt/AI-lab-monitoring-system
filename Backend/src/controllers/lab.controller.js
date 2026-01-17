import Lab from "../models/Lab.model.js";
import Detection from "../models/detection.model.js";
import LabSession from "../models/LabSession.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createLab = asyncHandler(async (req, res) => {
  const { name, capacity, cameraStatus, cameraIP, ipRange } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Lab name is required" });
  }

  const lab = await Lab.create({
    name,
    capacity,
    cameraStatus: cameraStatus || "online",
    cameraIP: cameraIP || "",
    ipRange: ipRange || "",
    currentUtilization: 0,
  });

  res.status(201).json(lab);
});

const listLabs = asyncHandler(async (req, res) => {
  const labs = await Lab.find().lean();
  res.json(labs);
});


// ✅ Delete a lab
export const deleteLab = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const lab = await Lab.findById(id);
  if (!lab) return res.status(404).json({ message: "Lab not found" });

  // Optional cleanup of related data
  await LabSession.deleteMany({ lab: id });
  await Detection.deleteMany({ lab: id });

  await lab.deleteOne();
  res.json({ message: "Lab deleted successfully" });
});


const getLab = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const lab = await Lab.findById(id).lean();
  if (!lab) return res.status(404).json({ message: "Lab not found" });

  const recentSessions = await LabSession.find({ lab: id })
    .sort({ startTime: -1 })
    // .limit(5)
    .populate({
      path: "detections",
      model: "Detection",
      select: "detections labSession",
    })
    .lean();

  // ✅ Flatten detection array for each session
  const sessionsWithImages = recentSessions.map((session) => ({
    ...session,
    detections:
      session.detections
        ?.flatMap((d) =>
          d.detections.map((x) => ({
            timestamp: x.timestamp,
            imagePath: x.imagePath,
            detectedObjects: x.detectedObjects,
          }))
        )
        ?.slice(-10) || [], // keep last 10 detections
  }));

  res.json({
    ...lab,
    sessions: sessionsWithImages,
  });
});

const getLabDetections = asyncHandler(async (req, res) => {
  const { labId } = req.params;

  const detections = await Detection.find({ lab: labId })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  if (!detections || detections.length === 0)
    return res.json([]);

  // Flatten detection entries for easier frontend use
  const formatted = detections.flatMap(det =>
    det.detections.map(d => ({
      timestamp: d.timestamp,
      imagePath: d.imagePath,
      detectedObjects: d.detectedObjects,
      labSession: det.labSession,
    }))
  ).slice(-10); // keep last 10 total

  res.json(formatted);
});


export default {
  createLab,
  listLabs,
  deleteLab,
  getLab,
  getLabDetections,
};



// import Lab from "../models/Lab.model.js";
// import Detection from "../models/detection.model.js";
// import LabSession from "../models/LabSession.model.js";
// import { asyncHandler } from "../utils/asyncHandler.js";

// const createLab = asyncHandler(async (req, res) => {
//   const { name, capacity, cameraStatus, cameraIP, ipRange } = req.body;

//   if (!name) {
//     return res.status(400).json({ message: "Lab name is required" });
//   }

//   const lab = await Lab.create({
//     name,
//     capacity,
//     cameraStatus: cameraStatus || "online",
//     cameraIP: cameraIP || "",
//     ipRange: ipRange || "",
//     currentUtilization: 0,
//   });

//   res.status(201).json(lab);
// });

// const listLabs = asyncHandler(async (req, res) => {
//   const labs = await Lab.find().lean();
//   res.json(labs);
// });

// const getLab = asyncHandler(async (req, res) => {
//   const { id } = req.params;

//   const lab = await Lab.findById(id).lean();
//   if (!lab) return res.status(404).json({ message: "Lab not found" });

//   const recentSessions = await LabSession.find({ lab: id })
//     .sort({ startTime: -1 })
//     .limit(5)
//     .populate({
//       path: "detections",
//       model: Detection,
//       select: "imagePath timestamp peopleCount occupancyPercent",
//       options: { sort: { timestamp: -1 }, limit: 10 },
//     })
//     .lean();

//   res.json({
//     ...lab,
//     sessions: recentSessions,
//   });
// });

// export default {
//   createLab,
//   listLabs,
//   getLab,
// };




// import Lab from "../models/Lab.model.js"
// import Detection from "../models/detection.model.js"
// import { asyncHandler } from "../utils/asyncHandler.js";
// import LabSession from "../models/LabSession.model.js";

// const createLab = asyncHandler(async (req, res) => {
//   const { name, capacity, cameraStatus, cameraIP , ipRange} = req.body;

//   if (!name) {
//     return res.status(400).json({ message: "Lab name is required" });
//   }

//   const lab = await Lab.create({
//     name,
//     capacity,
//     cameraStatus: cameraStatus || "online",
//     cameraIP: cameraIP || 0,
//     ipRange: ipRange || '',
//     currentUtilization: 0,
//   });
  
        

//   res.status(201).json(lab);
// });

// const listLabs = asyncHandler(async (req, res) => {
//   const labs = await Lab.find().lean();
//   res.json(labs);
// });

// const getLab = asyncHandler(async (req, res) => {
//   const { id } = req.params;
//   const lab = await Lab.findById(id);
//   if (!lab) return res.status(404).json({ message: "Lab not found" });

//   // Fetch recent 5 sessions for this lab, sorted by start time desc
//   const recentSessions = await LabSession.find({ lab: id })
//     .sort({ startTime: -1 })
//     .limit(5)
//     .lean();

//   res.json({ lab, recentSessions });
// });

// export default {
//   createLab,
//   listLabs,
//   getLab,
// };


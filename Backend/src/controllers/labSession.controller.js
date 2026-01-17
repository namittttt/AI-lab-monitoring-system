import LabSession from '../models/LabSession.model.js';
import Lab from '../models/Lab.model.js';
import Detection from '../models/detection.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { startSessionDetections } from '../utils/scheduler.js';

/* ============================================================
   ✅ CREATE LAB SESSION
============================================================ */
export const createLabSession = asyncHandler(async (req, res) => {
  const {
    labId,
    startTime,
    endTime,
    detectionFrequency,
    numberOfDetections,
    enablePhoneDetection,
  } = req.body;

  if (!labId || !startTime || !endTime)
    return res
      .status(400)
      .json({ message: 'labId, startTime and endTime are required.' });

  if (new Date(startTime) >= new Date(endTime))
    return res
      .status(400)
      .json({ message: 'startTime must be before endTime.' });

  const lab = await Lab.findById(labId);
  if (!lab) return res.status(404).json({ message: 'Lab not found.' });

  const session = await LabSession.create({
    lab: lab._id,
    labName: lab.name,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    numberOfDetections: numberOfDetections || 5,
    detectionFrequency: detectionFrequency || 60,
    enablePhoneDetection: enablePhoneDetection || false,
  });

  await Lab.findByIdAndUpdate(labId, {
    $set: { currentSessionId: session._id },
  });

  try {
    startSessionDetections(session._id).catch((err) =>
      console.error(`Failed scheduler:`, err)
    );
  } catch (err) {
    console.error('Scheduler error:', err);
  }

  res
    .status(201)
    .json({ message: 'Session created and scheduled', sessionId: session._id });
});

/* ============================================================
   ✅ GET LAB SESSION WITH DETECTIONS
============================================================ */
export const getLabSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await LabSession.findById(sessionId)
    .populate('lab', 'name capacity')
    .lean();
  if (!session) return res.status(404).json({ message: 'LabSession not found.' });

  const detectionDocs = await Detection.find({ labSession: sessionId })
    .select('detections')
    .lean();

  const detections = detectionDocs
    .flatMap((d) =>
      (d.detections || []).map((e) => ({
        timestamp: e.timestamp,
        imagePath: e.imagePath,
        imageUrl: e.imageUrl,
        sessionId: e.sessionId,
        detectedObjects: e.detectedObjects,
      }))
    )
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json({ data: session, detections });
});

/* ============================================================
   ✅ ADD DETECTION
============================================================ */
// export const addDetection = asyncHandler(async (req, res) => {
//   const { labId, labSessionId, detectedObjects, imagePath, imageUrl } = req.body;
//   const now = new Date();

//   if (!labId || !labSessionId || !detectedObjects)
//     return res
//       .status(400)
//       .json({ message: 'labId, labSessionId, detectedObjects required.' });

//   const session = await LabSession.findById(labSessionId);
//   if (!session) return res.status(404).json({ message: 'LabSession not found.' });

//   if (now < session.startTime || now > session.endTime)
//     return res.status(400).json({ message: 'Session is not active.' });

//   let doc = await Detection.findOne({ lab: labId, labSession: labSessionId });
//   if (!doc) {
//     doc = await Detection.create({
//       lab: labId,
//       labSession: labSessionId,
//       labName: session.labName,
//       detections: [],
//     });
//   }

//   await Detection.updateOne(
//     { _id: doc._id },
//     {
//       $push: {
//         detections: {
//           timestamp: now,
//           detectedObjects,
//           imagePath,
//           imageUrl,
//           sessionId: labSessionId,
//         },
//       },
//       $inc: { detectionsCount: 1 },
//     }
//   );

//   await LabSession.updateOne(
//     { _id: labSessionId },
//     { $set: { lastDetectionAt: now }, $inc: { detectionsCount: 1 } }
//   );

//   res.status(201).json({ message: 'Detection added' });
// });

export const addDetection = async (req, res) => {
  try {
    const { labSessionId, detectedObjects, imagePath, imageUrl } = req.body;

    const baseUrl = process.env.BASE_URL || 'http://localhost:5001';
    // ensure a valid URL is stored
    const finalImageUrl =
      imageUrl?.startsWith('http')
        ? imageUrl
        : imagePath
        ? `${baseUrl}/uploads/${imagePath}`
        : null;

    const now = new Date();

    const session = await LabSession.findByIdAndUpdate(
      labSessionId,
      {
        $push: {
          detections: {
            timestamp: now,
            detectedObjects,
            imageUrl: finalImageUrl,
            imagePath,
          },
        },
        $inc: { detectionsCount: 1 },
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Detection added successfully',
      data: session,
    });
  } catch (err) {
    console.error('❌ Error adding detection:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/* ============================================================
   ✅ OCCUPANCY STATS
============================================================ */
export const getSessionOccupancy = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await LabSession.findById(sessionId);
  if (!session) return res.status(404).json({ message: 'Session not found.' });

  const detections = await Detection.find({ labSession: sessionId });
  if (!detections.length)
    return res.json({ occupancyPercent: 0, averageCount: 0 });

  let totalCount = 0;
  let entries = 0;
  for (const det of detections) {
    for (const e of det.detections) {
      const person = (e.detectedObjects || []).find((o) => o.label === 'person');
      totalCount += person ? person.count : 0;
      entries++;
    }
  }

  const avg = entries ? totalCount / entries : 0;
  const lab = await Lab.findById(session.lab);
  const cap = lab?.capacity || 1;

  res.json({
    sessionId,
    averageCount: avg,
    occupancyPercent: Math.min((avg / cap) * 100, 100),
  });
});

/* ============================================================
   ✅ OCCUPANCY TIME-SERIES FOR CHART
============================================================ */
export const getOccupancy = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const detections = await Detection.find({ labSession: sessionId })
    .select('detections.timestamp detections.detectedObjects')
    .lean();

  if (!detections.length) return res.json([]);

  const flat = detections.flatMap((d) =>
    d.detections.map((e) => ({
      timestamp: e.timestamp,
      personCount:
        (e.detectedObjects || []).find((o) => o.label === 'person')?.count || 0,
    }))
  );

  const session = await LabSession.findById(sessionId).lean();
  const lab = await Lab.findById(session.lab).lean();
  const cap = lab?.capacity || 1;

  const result = flat.map((e) => ({
    timestamp: e.timestamp,
    occupancyPercent: Math.min((e.personCount / cap) * 100, 100),
  }));

  res.json(result);
});

/* ============================================================
   ✅ DETECTION CONFIG MANAGEMENT (for scheduler)
============================================================ */
export const updateDetectionConfig = asyncHandler(async (req, res) => {
  const { requiredCount, startTime, endTime } = req.body;
  const { sessionId } = req.params;

  const session = await LabSession.findByIdAndUpdate(
    sessionId,
    {
      detectionConfig: {
        requiredCount,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      },
    },
    { new: true }
  );

  if (!session) {
    return res.status(404).json({ message: 'Session not found' });
  }

  res
    .status(200)
    .json({ message: 'Detection config updated', session });
});

export const getDetectionConfig = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await LabSession.findById(sessionId).select('detectionConfig');
  if (!session) {
    return res.status(404).json({ message: 'Session not found' });
  }

  res.status(200).json(session.detectionConfig);
});


/* ============================================================
   ✅ GET ALL SESSIONS (for a given lab)
============================================================ */
export const getAllSessionsByLab = asyncHandler(async (req, res) => {
  const { labId } = req.params;

  const sessions = await LabSession.find({ lab: labId })
    .sort({ startTime: -1 })
    .lean();

  res.status(200).json({ data: sessions });
});

/* ============================================================
   ✅ DELETE ONE OR MULTIPLE SESSIONS
============================================================ */
export const deleteSessions = asyncHandler(async (req, res) => {
  const { ids } = req.body; // expects array of sessionIds

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: "No session IDs provided." });
  }

  await LabSession.deleteMany({ _id: { $in: ids } });
  await Detection.deleteMany({ labSession: { $in: ids } });

  res.status(200).json({ message: "Selected sessions deleted successfully." });
});




// import LabSession from '../models/LabSession.model.js';
// import Lab from '../models/Lab.model.js';
// import Detection from '../models/detection.model.js';
// import { asyncHandler } from '../utils/asyncHandler.js';
// import { startSessionDetections } from '../utils/scheduler.js'; // IMPORT

// /**
//  * Create a new LabSession and start detection
//  */
// // export const createLabSession = asyncHandler(async (req, res) => {
// //   const { labId, startTime, endTime, detectionFrequency, numberOfDetections, enablePhoneDetection } = req.body;

// //   if (!labId || !startTime || !endTime) {
// //     return res.status(400).json({ message: 'labId, startTime and endTime are required.' });
// //   }

// //   if (new Date(startTime) >= new Date(endTime)) {
// //     return res.status(400).json({ message: 'startTime must be before endTime.' });
// //   }

// //   const lab = await Lab.findById(labId);
// //   if (!lab) return res.status(404).json({ message: 'Lab not found.' });

// //   const session = await LabSession.create({
// //     lab: lab._id,
// //     labName: lab.name,
// //     startTime: new Date(startTime),
// //     endTime: new Date(endTime),
// //     numberOfDetections: numberOfDetections || 1,
// //     detectionFrequency: detectionFrequency || 60,
// //     enablePhoneDetection: enablePhoneDetection || false
// //   });

// //   try {
// //     startSessionDetections(session._id).catch(err => {
// //       console.error(`Failed to start session detections for ${session._id}`, err);
// //     });
// //     console.log(`Scheduled detection for session ${session._id}`);
// //   } catch (err) {
// //     console.error('Error calling startSessionDetections:', err);
// //   }

// //   res.status(201).json({
// //     message: 'Session created and scheduled',
// //     sessionId: session._id
// //   });
// // });

// export const createLabSession = asyncHandler(async (req, res) => {
//   const { labId, startTime, endTime, detectionFrequency, numberOfDetections, enablePhoneDetection } = req.body;

//   if (!labId || !startTime || !endTime) {
//     return res.status(400).json({ message: 'labId, startTime and endTime are required.' });
//   }

//   if (new Date(startTime) >= new Date(endTime)) {
//     return res.status(400).json({ message: 'startTime must be before endTime.' });
//   }

//   const lab = await Lab.findById(labId);
//   if (!lab) return res.status(404).json({ message: 'Lab not found.' });

//   // ✅ Always create a *new* session document
//   const session = await LabSession.create({
//     lab: lab._id,
//     labName: lab.name,
//     startTime: new Date(startTime),
//     endTime: new Date(endTime),
//     numberOfDetections: numberOfDetections || 1,
//     detectionFrequency: detectionFrequency || 60,
//     enablePhoneDetection: enablePhoneDetection || false,
//   });

//   // ✅ Explicitly link this session to its lab (optional but helpful)
//   await Lab.findByIdAndUpdate(labId, {
//     $set: { currentSessionId: session._id },
//   });

//   try {
//     startSessionDetections(session._id).catch(err => {
//       console.error(`Failed to start session detections for ${session._id}`, err);
//     });
//     console.log(`Scheduled detection for session ${session._id}`);
//   } catch (err) {
//     console.error('Error calling startSessionDetections:', err);
//   }

//   res.status(201).json({
//     message: 'Session created and scheduled',
//     sessionId: session._id,
//   });
// });

// /**
//  * Get LabSession by ID, with detections
//  */
// export const getLabSession = asyncHandler(async (req, res) => {
//   const { sessionId } = req.params;

//   const session = await LabSession.findById(sessionId);
//   if (!session) return res.status(404).json({ message: 'LabSession not found.' });

//   // Get detections for this session (limit recent 20)
//   const detections = await Detection.find({ labSession: sessionId })
//     .sort({ 'detections.timestamp': -1 })
//     .limit(20)
//     .lean();

//   res.json({ session, detections });
// });

// /**
//  * Add detection linked to a lab session (manual API add)
//  */
// export const addDetection = asyncHandler(async (req, res) => {
//   const { labId, labSessionId, detectedObjects, imagePath } = req.body;
//   const now = new Date();

//   if (!labId || !labSessionId || !detectedObjects) {
//     return res.status(400).json({ message: 'labId, labSessionId, and detectedObjects are required.' });
//   }

//   // Check if session exists
//   const session = await LabSession.findById(labSessionId);
//   if (!session) return res.status(404).json({ message: 'LabSession not found.' });

//   if (now < session.startTime || now > session.endTime) {
//     return res.status(400).json({ message: 'Session is not active.' });
//   }

//   // Upsert top-level Detection doc and push entry
//   let doc = await Detection.findOne({ lab: labId, labSession: labSessionId });
//   if (!doc) {
//     doc = await Detection.create({
//       lab: labId,
//       labSession: labSessionId,
//       labName: session.labName,
//       detections: []
//     });
//   }

//   await Detection.updateOne(
//     { _id: doc._id },
//     {
//       $push: {
//         detections: {
//           timestamp: now,
//           detectedObjects,
//           imagePath,
//           sessionId: labSessionId
//         }
//       },
//       $inc: { detectionsCount: 1 }
//     }
//   );

//   // Also update session summary
//   await LabSession.updateOne(
//     { _id: labSessionId },
//     {
//       $set: { lastDetectionAt: now },
//       $inc: { detectionsCount: 1 }
//     }
//   );

//   res.status(201).json({ message: 'Detection added' });
// });

// /**
//  * Get occupancy stats for a session (average count and percentage)
//  */
// export const getSessionOccupancy = asyncHandler(async (req, res) => {
//   const { sessionId } = req.params;

//   const session = await LabSession.findById(sessionId);
//   if (!session) return res.status(404).json({ message: 'Session not found.' });

//   const detections = await Detection.find({ labSession: sessionId });

//   if (!detections || detections.length === 0) {
//     return res.json({ occupancyPercent: 0, averageCount: 0 });
//   }

//   // Sum counts of "person" detectedObjects across all detection entries
//   let totalCount = 0;
//   let entries = 0;
//   for (const det of detections) {
//     for (const entry of det.detections) {
//       const personObj = (entry.detectedObjects || []).find(o => o.label === 'person');
//       totalCount += personObj ? personObj.count : 0;
//       entries += 1;
//     }
//   }

//   const averageCount = entries ? (totalCount / entries) : 0;

//   // Get lab capacity for percentage calc
//   const lab = await Lab.findById(session.lab);
//   const capacity = lab ? lab.capacity : 1;

//   const occupancyPercent = Math.min((averageCount / capacity) * 100, 100);

//   res.json({
//     sessionId,
//     averageCount,
//     occupancyPercent
//   });
// });

// /**
//  * 📊 Get time-series occupancy data for charts (for OccupancyGraph.jsx)
//  */
// export const getOccupancy = asyncHandler(async (req, res) => {
//   const { sessionId } = req.params;

//   // Fetch detections of this session (latest first)
//   const detections = await Detection.find({ labSession: sessionId })
//     .select('detections.timestamp detections.detectedObjects')
//     .lean();

//   // Always return an array (empty if none)
//   if (!detections?.length) {
//     return res.json([]);
//   }

//   // Flatten and calculate person counts
//   const flattened = detections.flatMap(d =>
//     d.detections.map(entry => ({
//       timestamp: entry.timestamp,
//       personCount:
//         (entry.detectedObjects || []).find(o => o.label === 'person')?.count || 0,
//     }))
//   );

//   // Fetch lab capacity
//   const session = await LabSession.findById(sessionId).lean();
//   const lab = await Lab.findById(session.lab).lean();
//   const capacity = lab?.capacity || 1;

//   // Build array with occupancy %
//   const result = flattened.map(entry => ({
//     timestamp: entry.timestamp,
//     occupancyPercent: Math.min((entry.personCount / capacity) * 100, 100),
//   }));

//   res.json(result);
// });


// export const updateDetectionConfig = async (req, res) => {
//   try {
//     const { requiredCount, startTime, endTime } = req.body;
//     const { sessionId } = req.params;

//     const session = await LabSession.findByIdAndUpdate(
//       sessionId,
//       {
//         detectionConfig: {
//           requiredCount,
//           startTime: new Date(startTime),
//           endTime: new Date(endTime)
//         }
//       },
//       { new: true }
//     );

//     if (!session) {
//       return res.status(404).json({ message: "Session not found" });
//     }

//     res.status(200).json({ message: "Detection config updated", session });
//   } catch (error) {
//     res.status(500).json({ message: "Error updating detection config", error });
//   }
// };

// export const getDetectionConfig = async (req, res) => {
//   try {
//     const { sessionId } = req.params;

//     const session = await LabSession.findById(sessionId).select("detectionConfig");
//     if (!session) {
//       return res.status(404).json({ message: "Session not found" });
//     }

//     res.status(200).json(session.detectionConfig);
//   } catch (error) {
//     res.status(500).json({ message: "Error fetching detection config", error });
//   }
// };













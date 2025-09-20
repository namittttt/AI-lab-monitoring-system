import LabSession from '../models/LabSession.model.js';
import Lab from '../models/Lab.model.js';
import Detection from '../models/detection.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { startSessionDetections } from '../utils/scheduler.js'; // IMPORT

/**
 * Create a new LabSession and start detection
 */
export const createLabSession = asyncHandler(async (req, res) => {
  const { labId, startTime, endTime, detectionFrequency, numberOfDetections, enablePhoneDetection } = req.body;

  if (!labId || !startTime || !endTime) {
    return res.status(400).json({ message: 'labId, startTime and endTime are required.' });
  }

  if (new Date(startTime) >= new Date(endTime)) {
    return res.status(400).json({ message: 'startTime must be before endTime.' });
  }

  const lab = await Lab.findById(labId);
  if (!lab) return res.status(404).json({ message: 'Lab not found.' });

  const session = await LabSession.create({
    lab: lab._id,
    labName: lab.name,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    numberOfDetections: numberOfDetections || 1,
    detectionFrequency: detectionFrequency || 60,
    enablePhoneDetection: enablePhoneDetection || false
  });

  try {
    startSessionDetections(session._id).catch(err => {
      console.error(`Failed to start session detections for ${session._id}`, err);
    });
    console.log(`Scheduled detection for session ${session._id}`);
  } catch (err) {
    console.error('Error calling startSessionDetections:', err);
  }

  res.status(201).json({
    message: 'Session created and scheduled',
    sessionId: session._id
  });
});

/**
 * Get LabSession by ID, with detections
 */
export const getLabSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await LabSession.findById(sessionId);
  if (!session) return res.status(404).json({ message: 'LabSession not found.' });

  // Get detections for this session (limit recent 20)
  const detections = await Detection.find({ labSession: sessionId })
    .sort({ 'detections.timestamp': -1 })
    .limit(20)
    .lean();

  res.json({ session, detections });
});

/**
 * Add detection linked to a lab session (manual API add)
 */
export const addDetection = asyncHandler(async (req, res) => {
  const { labId, labSessionId, detectedObjects, imagePath } = req.body;
  const now = new Date();

  if (!labId || !labSessionId || !detectedObjects) {
    return res.status(400).json({ message: 'labId, labSessionId, and detectedObjects are required.' });
  }

  // Check if session exists
  const session = await LabSession.findById(labSessionId);
  if (!session) return res.status(404).json({ message: 'LabSession not found.' });

  if (now < session.startTime || now > session.endTime) {
    return res.status(400).json({ message: 'Session is not active.' });
  }

  // Upsert top-level Detection doc and push entry
  let doc = await Detection.findOne({ lab: labId, labSession: labSessionId });
  if (!doc) {
    doc = await Detection.create({
      lab: labId,
      labSession: labSessionId,
      labName: session.labName,
      detections: []
    });
  }

  await Detection.updateOne(
    { _id: doc._id },
    {
      $push: {
        detections: {
          timestamp: now,
          detectedObjects,
          imagePath,
          sessionId: labSessionId
        }
      },
      $inc: { detectionsCount: 1 }
    }
  );

  // Also update session summary
  await LabSession.updateOne(
    { _id: labSessionId },
    {
      $set: { lastDetectionAt: now },
      $inc: { detectionsCount: 1 }
    }
  );

  res.status(201).json({ message: 'Detection added' });
});

/**
 * Get occupancy stats for a session (average count and percentage)
 */
export const getSessionOccupancy = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await LabSession.findById(sessionId);
  if (!session) return res.status(404).json({ message: 'Session not found.' });

  const detections = await Detection.find({ labSession: sessionId });

  if (!detections || detections.length === 0) {
    return res.json({ occupancyPercent: 0, averageCount: 0 });
  }

  // Sum counts of "person" detectedObjects across all detection entries
  let totalCount = 0;
  let entries = 0;
  for (const det of detections) {
    for (const entry of det.detections) {
      const personObj = (entry.detectedObjects || []).find(o => o.label === 'person');
      totalCount += personObj ? personObj.count : 0;
      entries += 1;
    }
  }

  const averageCount = entries ? (totalCount / entries) : 0;

  // Get lab capacity for percentage calc
  const lab = await Lab.findById(session.lab);
  const capacity = lab ? lab.capacity : 1;

  const occupancyPercent = Math.min((averageCount / capacity) * 100, 100);

  res.json({
    sessionId,
    averageCount,
    occupancyPercent
  });
});

export const updateDetectionConfig = async (req, res) => {
  try {
    const { requiredCount, startTime, endTime } = req.body;
    const { sessionId } = req.params;

    const session = await LabSession.findByIdAndUpdate(
      sessionId,
      {
        detectionConfig: {
          requiredCount,
          startTime: new Date(startTime),
          endTime: new Date(endTime)
        }
      },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    res.status(200).json({ message: "Detection config updated", session });
  } catch (error) {
    res.status(500).json({ message: "Error updating detection config", error });
  }
};

export const getDetectionConfig = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await LabSession.findById(sessionId).select("detectionConfig");
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    res.status(200).json(session.detectionConfig);
  } catch (error) {
    res.status(500).json({ message: "Error fetching detection config", error });
  }
};












// import LabSession from '../models/LabSession.model.js';
// import Lab from '../models/Lab.model.js';
// import Detection from '../models/detection.model.js';
// import { asyncHandler } from '../utils/asyncHandler.js';

// /**
//  * Create a new LabSession
//  */
// export const createLabSession = asyncHandler(async (req, res) => {
//   const { labId, startTime, endTime, detectionFrequency } = req.body;

//   if (!labId || !startTime || !endTime) {
//     return res.status(400).json({ message: 'labId, startTime and endTime are required.' });
//   }

//   if (new Date(startTime) >= new Date(endTime)) {
//     return res.status(400).json({ message: 'startTime must be before endTime.' });
//   }

//   const lab = await Lab.findById(labId);
//   if (!lab) return res.status(404).json({ message: 'Lab not found.' });

//   const session = new LabSession({
//     lab: lab._id,
//     labName: lab.name,
//     startTime: new Date(startTime),
//     endTime: new Date(endTime),
//     detectionFrequency: detectionFrequency || 60,
//   });

//   await session.save();

//   res.status(201).json(session);
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
//     .sort({ timestamp: -1 })
//     .limit(20)
//     .lean();

//   res.json({ session, detections });
// });

// /**
//  * Add detection linked to a lab session
//  */
// export const addDetection = asyncHandler(async (req, res) => {
//   const { labId, labSessionId, detectedObjects, imagePath } = req.body;
//   const now = new Date();

//   if (!labId || !labSessionId || !detectedObjects) {
//     return res.status(400).json({ message: 'labId, labSessionId, and detectedObjects are required.' });
//   }

//   // Check if session is active (optional)
//   const session = await LabSession.findById(labSessionId);
//   if (!session) return res.status(404).json({ message: 'LabSession not found.' });

//   if (now < session.startTime || now > session.endTime) {
//     return res.status(400).json({ message: 'Session is not active.' });
//   }

//   const detection = await Detection.create({
//     lab: labId,
//     labSession: labSessionId,
//     labName: session.labName,
//     detectedObjects,
//     imagePath,
//     timestamp: now,
//   });

//   res.status(201).json({ message: 'Detection added', detection });
// });

// /**
//  * Get occupancy stats for a session (average count and percentage)
//  */
// export const getSessionOccupancy = asyncHandler(async (req, res) => {
//   const { sessionId } = req.params;

//   const session = await LabSession.findById(sessionId);
//   if (!session) return res.status(404).json({ message: 'Session not found.' });

//   const detections = await Detection.find({ labSession: sessionId });

//   if (detections.length === 0) {
//     return res.json({ occupancyPercent: 0, averageCount: 0 });
//   }

//   // Sum counts of "person" detectedObjects across all detections
//   const totalCount = detections.reduce((sum, det) => {
//     const personObj = det.detectedObjects.find(o => o.label === 'person');
//     return sum + (personObj ? personObj.count : 0);
//   }, 0);

//   const averageCount = totalCount / detections.length;

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

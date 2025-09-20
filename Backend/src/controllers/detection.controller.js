import Detection from '../models/detection.model.js';
import Lab from '../models/Lab.model.js';
import LabSession from '../models/LabSession.model.js';
import path from 'path';
import fs from 'fs';
import { sendCmd } from '../utils/scheduler.js';


async function runDetectionForLab(labId, sessionId) {
  console.log('>>> runDetectionForLab called');
  console.log('LabId:', labId, 'SessionId:', sessionId);

  const lab = await Lab.findById(labId);
  if (!lab) {
    console.error(`Lab ${labId} not found`);
    return;
  }

  // For debugging: skip time constraints to see if detection is inserted
  const activeSession = await LabSession.findById(sessionId);
  if (!activeSession) {
    console.error(`❌ Session ${sessionId} not found`);
    return;
  }

  console.log(`✅ Found active session: ${activeSession._id}`);

  const workerState = getWorkerStateBySessionId(sessionId);
  if (!workerState) {
    console.error(`❌ No worker state for session ${sessionId}`);
    return;
  }

  try {
    const result = await sendCmd(workerState.worker, {
      command: 'captureAndDetect',
      cameraIP: lab.cameraIP,
      sessionId
    });

    console.log('Worker detection result:', result);

    if (!result || typeof result.detectionsCount !== 'number') {
      console.warn('⚠️ No detectionsCount found in result');
      return;
    }

    const detectionsCount = result.detectionsCount;

    // Create or update Detection document
    let detectionDoc = await Detection.findOne({
      lab: lab._id,
      labSession: activeSession._id
    });

    try {
      if (!detectionDoc) {
        const created = await Detection.create({
          lab: lab._id,
          labSession: activeSession._id,
          timestamp: new Date(),
          detectionsCount
        });
        console.log('✅ Detection document created:', created);
      } else {
        const updated = await Detection.updateOne(
          { _id: detectionDoc._id },
          { $set: { detectionsCount, timestamp: new Date() } }
        );
        console.log('✅ Detection document updated:', updated);
      }
    } catch (err) {
      console.error('❌ Error saving detection:', err);
    }

    // Update LabSession detections count
    try {
      const updatedSession = await LabSession.updateOne(
        { _id: activeSession._id },
        { $set: { numberOfDetections: detectionsCount } }
      );
      console.log('✅ LabSession updated with detectionsCount:', updatedSession);
    } catch (err) {
      console.error('❌ Error updating LabSession:', err);
    }

  } catch (err) {
    console.error('❌ Error in runDetectionForLab:', err);
  }
}
export default {
  runDetectionForLab,
}








// // -----------------------------------------
// // Manual Add Detection (API endpoint)
// // -----------------------------------------
// export const addDetection = async (req, res) => {
//   try {
//     const { labId, detectionsCount, detectedObjects, imagePath, sessionId } = req.body;

//     const lab = await Lab.findById(labId);
//     if (!lab) return res.status(404).json({ message: 'Lab not found' });

//     const session = await LabSession.findById(sessionId);
//     if (!session) return res.status(404).json({ message: 'Lab session not found' });

//     await Detection.updateOne(
//       { lab: lab._id, labSession: session._id },
//       {
//         $push: {
//           detections: {
//             timestamp: new Date(),
//             detectedObjects: detectedObjects || [],
//             imagePath: imagePath || '',
//             sessionId: session._id
//           }
//         },
//         $inc: { detectionsCount: detectionsCount || 1 }
//       },
//       { upsert: true }
//     );

//     await LabSession.updateOne(
//       { _id: session._id },
//       {
//         $set: { lastDetectionAt: new Date() },
//         $inc: { detectionsCount: detectionsCount || 1 }
//       }
//     );

//     res.json({ message: 'Detection added successfully' });
//   } catch (err) {
//     console.error('Error adding detection:', err);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // -----------------------------------------
// // Run Detection (Scheduler triggered)
// // -----------------------------------------
//  const runDetectionForLab = async (labId, sessionId) => {
//   try {
//     const lab = await Lab.findById(labId);
//     if (!lab) return console.error(`Lab ${labId} not found`);

//     const session = await LabSession.findById(sessionId);
//     if (!session) return console.error(`Session ${sessionId} not found`);

//     // Simulate YOLO detection result (replace with actual detection call)
//     const result = {
//       detectionsCount: 1, // example count
//       detectedObjects: [{ label: 'person', count: 1 }],
//       imagePath: `/images/${Date.now()}.jpg`
//     };

//     // Save to Detection collection
//     await Detection.updateOne(
//       { lab: lab._id, labSession: session._id },
//       {
//         $push: {
//           detections: {
//             timestamp: new Date(),
//             detectedObjects: result.detectedObjects || [],
//             imagePath: result.imagePath || '',
//             sessionId: session._id
//           }
//         },
//         $inc: { detectionsCount: result.detectionsCount || 1 }
//       },
//       { upsert: true }
//     );

//     // Update LabSession stats
//     await LabSession.updateOne(
//       { _id: session._id },
//       {
//         $set: { lastDetectionAt: new Date() },
//         $inc: { detectionsCount: result.detectionsCount || 1 }
//       }
//     );

//     console.log(`Detection saved for Lab ${lab.name}, Session ${session._id}`);
//   } catch (err) {
//     console.error('Error in runDetectionForLab:', err);
//   }
// };

// export default runDetectionForLab


















// import { spawn } from "child_process";
// import path from "path";
// import fs from "fs";
// import LabSession from "../models/LabSession.model.js";
// import Detection from "../models/detection.model.js";

// const activeTimers = new Map();     
// const activeProcesses = new Map();  

// function registerProcess(sessionId, process) {
//   activeProcesses.set(sessionId, process);
// }

// function unregisterProcess(sessionId) {
//   activeProcesses.delete(sessionId);
// }

// export function stopSessionDetections(sessionId) {
//   if (activeTimers.has(sessionId)) {
//     clearInterval(activeTimers.get(sessionId));
//     activeTimers.delete(sessionId);
//     console.log(`Timer cleared for ${sessionId}`);
//   }

//   if (activeProcesses.has(sessionId)) {
//     try {
//       activeProcesses.get(sessionId).kill("SIGTERM");
//       console.log(`Killed Python process for ${sessionId}`);
//     } catch (e) {
//       console.error(`Error killing process for ${sessionId}:`, e);
//     }
//     activeProcesses.delete(sessionId);
//   }

//   console.log(`Stopped detections for session ${sessionId}`);
// }

// export function stopAllDetections() {
//   for (const sessionId of [...activeTimers.keys()]) {
//     stopSessionDetections(sessionId);
//   }
// }

// async function runDetectionForLab(lab, sessionConfig) {
//   const { startTime, endTime, numberOfDetections, sessionId } = sessionConfig;

//   const start = new Date(startTime);
//   const end = new Date(endTime);
//   const totalSeconds = (end - start) / 1000;
//   const intervalSeconds = totalSeconds / numberOfDetections;

//   console.log(`Running detection for lab: ${lab.name}`);
//   console.log(`Start: ${start}, End: ${end}, Interval: ${intervalSeconds}s`);

//   const projectRoot = path.resolve(process.cwd(), "..");
//   const scriptPath = path.resolve(projectRoot, "yolovenv/detect_students.py");

//   if (!fs.existsSync(scriptPath)) {
//     throw new Error(`Python script not found at path: ${scriptPath}`);
//   }

//   let detectionCount = 0;

//   return new Promise(async (resolve, reject) => {
//     const activeSession = await LabSession.findOne({
//       lab: lab._id,
//       startTime: { $lte: start },
//       endTime: { $gte: start }
//     });

//     if (!activeSession) {
//       console.warn(`No active session for lab ${lab.name}, aborting detection.`);
//       resolve();
//       return;
//     }

//     const detectionDoc = await Detection.create({
//       lab: lab._id,
//       labSession: activeSession._id,
//       labName: lab.name,
//       detections: []
//     });

//     const timer = setInterval(async () => {
//       const now = new Date();

//       if (now > end || detectionCount >= numberOfDetections) {
//         console.log(`Stopping detection for lab ${lab.name}`);
//         stopSessionDetections(sessionId);
//         resolve();
//         return;
//       }

//       detectionCount++;
//       console.log(`Detection #${detectionCount} at ${now.toLocaleTimeString()}`);

//       const args = [
//         scriptPath,
//         "--labId", lab._id.toString(),
//         "--labName", lab.name,
//         "--source", lab.cameraIP || "0",
//         "--save-dir", path.resolve(process.cwd(), "screenshots", lab.name)
//       ];

//       const child = spawn("python", args, { cwd: process.cwd(), env: { ...process.env } });
//       registerProcess(sessionId, child);

//       child.stdout.on("data", async (data) => {
//         const lines = data.toString().trim().split(/\r?\n/);
//         for (const line of lines) {
//           try {
//             const json = JSON.parse(line);
//             console.log("DETECTION RESULT:", json);

//             let detectedObjects = [];
//             if (Array.isArray(json.detectedObjects)) {
//               detectedObjects = json.detectedObjects
//                 .filter(obj => typeof obj.count === "number" && obj.count > 0)
//                 .map(obj => ({ label: obj.label, count: obj.count }));
//             } else if (typeof json.count === "number" && json.count > 0) {
//               detectedObjects.push({ label: "person", count: json.count });
//             }

//             const imagePath = json.screenshot
//               ? path.join("screenshots", lab.name, path.basename(json.screenshot))
//               : "";

//             await Detection.updateOne(
//               { _id: detectionDoc._id },
//               {
//                 $push: {
//                   detections: {
//                     timestamp: new Date(),
//                     detectedObjects,
//                     imagePath
//                   }
//                 }
//               }
//             );
//           } catch (e) {
//             console.log("Python log or error:", line, e.message);
//           }
//         }
//       });

//       child.stderr.on("data", (data) => {
//         console.error("PYTHON ERROR:", data.toString());
//       });

//       child.on("close", () => unregisterProcess(sessionId));
//       child.on("error", (err) => {
//         unregisterProcess(sessionId);
//         reject(err);
//       });

//     }, intervalSeconds * 1000);

//     activeTimers.set(sessionId, timer);
//   });
// }

// export default runDetectionForLab;








// import { spawn } from "child_process";
// import path from "path";
// import fs from "fs";
// import LabSession from "../models/LabSession.model.js";
// import Detection from "../models/detection.model.js";

// // Track timers and processes per session
// const activeTimers = new Map();     // sessionId -> setInterval id
// const activeProcesses = new Map();  // sessionId -> child_process

// function registerProcess(sessionId, process) {
//   activeProcesses.set(sessionId, process);
// }

// function unregisterProcess(sessionId) {
//   if (activeProcesses.has(sessionId)) {
//     activeProcesses.delete(sessionId);
//   }
// }

// export function stopSessionDetections(sessionId) {
//   if (activeTimers.has(sessionId)) {
//     clearInterval(activeTimers.get(sessionId));
//     activeTimers.delete(sessionId);
//     console.log(`Timer cleared for ${sessionId}`);
//   }

//   if (activeProcesses.has(sessionId)) {
//     try {
//       activeProcesses.get(sessionId).kill("SIGTERM");
//       console.log(`Killed Python process for ${sessionId}`);
//     } catch (e) {
//       console.error(`Error killing process for ${sessionId}:`, e);
//     }
//     activeProcesses.delete(sessionId);
//   }

//   console.log(`Stopped detections for session ${sessionId}`);
// }

// export function stopAllDetections() {
//   for (const sessionId of [...activeTimers.keys()]) {
//     stopSessionDetections(sessionId);
//   }
// }

// async function runDetectionForLab(lab, sessionConfig) {
//   const { startTime, endTime, numberOfDetections, sessionId } = sessionConfig;

//   const start = new Date(startTime);
//   const end = new Date(endTime);
//   const totalSeconds = (end - start) / 1000;
//   const intervalSeconds = totalSeconds / numberOfDetections;

//   console.log(`Running detection for lab: ${lab.name}`);
//   console.log(`Start: ${start}, End: ${end}, Interval: ${intervalSeconds}s`);

//   const projectRoot = path.resolve(process.cwd(), "..");
//   const scriptPath = path.resolve(projectRoot, "yolovenv/detect_students.py");

//   if (!fs.existsSync(scriptPath)) {
//     throw new Error(`Python script not found at path: ${scriptPath}`);
//   }

//   let detectionCount = 0;

//   return new Promise(async (resolve, reject) => {
//     const activeSession = await LabSession.findOne({
//       lab: lab._id,
//       startTime: { $lte: start },
//       endTime: { $gte: start }
//     });

//     if (!activeSession) {
//       console.warn(`No active session for lab ${lab.name}, aborting detection.`);
//       resolve();
//       return;
//     }

//     const detectionDoc = await Detection.create({
//       lab: lab._id,
//       labSession: activeSession._id,
//       labName: lab.name,
//       detections: []
//     });

//     const timer = setInterval(async () => {
//       const now = new Date();

//       // Stop when conditions are met
//       if (now > end || detectionCount >= numberOfDetections) {
//         console.log(`Stopping detection for lab ${lab.name}`);
//         stopSessionDetections(sessionId);
//         resolve();
//         return;
//       }

//       detectionCount++;
//       console.log(`Detection #${detectionCount} at ${now.toLocaleTimeString()}`);

//       const args = [
//         scriptPath,
//         "--labId", lab._id.toString(),
//         "--labName", lab.name,
//         "--source", lab.cameraIP || "0",
//         "--save-dir", path.resolve(process.cwd(), "screenshots", lab.name),
//       ];

//       const child = spawn("python", args, { cwd: process.cwd(), env: { ...process.env } });
//       registerProcess(sessionId, child);

//       child.stdout.on("data", async (data) => {
//         const lines = data.toString().trim().split(/\r?\n/);
//         for (const line of lines) {
//           try {
//             const json = JSON.parse(line);
//             console.log("DETECTION RESULT:", json);

//             let detectedObjects = [];
//             if (Array.isArray(json.detectedObjects)) {
//               detectedObjects = json.detectedObjects
//                 .filter(obj => typeof obj.count === "number" && obj.count > 0)
//                 .map(obj => ({ label: obj.label, count: obj.count }));
//             } else if (typeof json.count === "number" && json.count > 0) {
//               detectedObjects.push({ label: "person", count: json.count });
//             }

//             const imagePath = json.screenshot
//               ? path.join("screenshots", lab.name, path.basename(json.screenshot))
//               : "";

//             await Detection.updateOne(
//               { _id: detectionDoc._id },
//               {
//                 $push: {
//                   detections: {
//                     timestamp: new Date(),
//                     detectedObjects,
//                     imagePath
//                   }
//                 }
//               }
//             );
//           } catch (e) {
//             console.log("Python log or error:", line, e.message);
//           }
//         }
//       });

//       child.stderr.on("data", (data) => {
//         console.error("PYTHON ERROR:", data.toString());
//       });

//       child.on("close", () => unregisterProcess(sessionId));
//       child.on("error", (err) => {
//         unregisterProcess(sessionId);
//         reject(err);
//       });

//     }, intervalSeconds * 1000);

//     activeTimers.set(sessionId, timer);
//   });
// }

// export default runDetectionForLab;















// import path from "path";
// import fs from "fs";
// import { spawn } from "child_process";
// import Detection from "../models/detection.model.js";
// import LabSession from "../models/LabSession.model.js";
// import Lab from "../models/Lab.model.js";
// import { registerProcess, unregisterProcess } from "../utils/scheduler.js"; // <-- new import

// async function runDetectionForLab(lab, sessionConfig) {
//   const { startTime, endTime, numberOfDetections, sessionId } = sessionConfig;

//   const start = new Date(startTime);
//   const end = new Date(endTime);
//   const totalSeconds = (end - start) / 1000;
//   const intervalSeconds = totalSeconds / numberOfDetections;

//   console.log(`Running detection for lab: ${lab.name}`);
//   console.log(`Start: ${start}, End: ${end}, Interval: ${intervalSeconds}s`);

//   const projectRoot = path.resolve(process.cwd(), "..");
//   const scriptPath = path.resolve(projectRoot, "yolovenv/detect_students.py");

//   if (!fs.existsSync(scriptPath)) {
//     throw new Error(`Python script not found at path: ${scriptPath}`);
//   }

//   let detectionCount = 0;

//   return new Promise(async (resolve, reject) => {
//     const activeSession = await LabSession.findOne({
//       lab: lab._id,
//       startTime: { $lte: start },
//       endTime: { $gte: start }
//     });

//     if (!activeSession) {
//       console.warn(`No active session for lab ${lab.name}, aborting detection.`);
//       resolve();
//       return;
//     }

//     const detectionDoc = await Detection.create({
//       lab: lab._id,
//       labSession: activeSession._id,
//       labName: lab.name,
//       detections: []
//     });

//     const timer = setInterval(async () => {
//       const now = new Date();
//       if (now > end || detectionCount >= numberOfDetections) {
//         console.log(`Stopping detection for lab ${lab.name}`);
//         clearInterval(timer);
//         resolve();
//         return;
//       }

//       detectionCount++;
//       console.log(`Detection #${detectionCount} at ${now.toLocaleTimeString()}`);

//       const args = [
//         scriptPath,
//         "--labId", lab._id.toString(),
//         "--labName", lab.name,
//         "--source", lab.cameraIP || "0",
//         "--save-dir", path.resolve(process.cwd(), "screenshots", lab.name),
//       ];

//       const child = spawn("python", args, { cwd: process.cwd(), env: { ...process.env } });

//       // Register Python process so it can be killed later
//       registerProcess(sessionId, child);

//       child.stdout.on("data", async (data) => {
//         const lines = data.toString().trim().split(/\r?\n/);
//         for (const line of lines) {
//           try {
//             const json = JSON.parse(line);
//             console.log("DETECTION RESULT:", json);

//             let detectedObjects = [];
//             if (Array.isArray(json.detectedObjects)) {
//               detectedObjects = json.detectedObjects
//                 .filter(obj => typeof obj.count === "number" && obj.count > 0)
//                 .map(obj => ({ label: obj.label, count: obj.count }));
//             } else if (typeof json.count === "number" && json.count > 0) {
//               detectedObjects.push({ label: "person", count: json.count });
//             }

//             const imagePath = json.screenshot
//               ? path.join("screenshots", lab.name, path.basename(json.screenshot))
//               : "";

//             await Detection.updateOne(
//               { _id: detectionDoc._id },
//               {
//                 $push: {
//                   detections: {
//                     timestamp: new Date(),
//                     detectedObjects,
//                     imagePath
//                   }
//                 }
//               }
//             );
//           } catch (e) {
//             console.log("Python log or error:", line, e.message);
//           }
//         }
//       });

//       child.stderr.on("data", (data) => {
//         console.error("PYTHON ERROR:", data.toString());
//       });

//       child.on("close", () => {
//         unregisterProcess(sessionId);
//       });

//       child.on("error", (err) => {
//         unregisterProcess(sessionId);
//         reject(err);
//       });

//     }, intervalSeconds * 1000);
//   });
// }

// export default runDetectionForLab;


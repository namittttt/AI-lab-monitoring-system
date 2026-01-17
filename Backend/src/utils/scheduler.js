
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import Lab from '../models/Lab.model.js';
import LabSession from '../models/LabSession.model.js';
import cron from 'node-cron';
import Detection from '../models/detection.model.js';
import { uploadScreenshot } from './cloudinary.js';
import { getIo } from '../utils/socket.js'; // update path as per your project

const activeWorkers = new Map();

function safeJsonParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

function workerScriptPath() {
  const projectRoot = path.resolve(process.cwd(), '..');
  return path.resolve(projectRoot, 'yolovenv', 'detect_students.py');
}

export function sendCmd(state, obj, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    if (!state || !state.child || state.child.killed) return reject(new Error('Worker not available'));
    const seq = ++state.seq;
    obj.seq = seq;
    const line = JSON.stringify(obj) + '\n';

    const timeout = setTimeout(() => {
      if (state.pending.has(seq)) {
        state.pending.delete(seq);
        reject(new Error('Worker response timeout'));
      }
    }, timeoutMs);

    state.pending.set(seq, { resolve, reject, timeout });
    try {
      state.child.stdin.write(line, 'utf8', (err) => {
        if (err) {
          clearTimeout(timeout);
          state.pending.delete(seq);
          return reject(err);
        }
      });
    } catch (e) {
      clearTimeout(timeout);
      state.pending.delete(seq);
      return reject(e);
    }
  });
}

function spawnWorker(lab, sessionId, saveDir) {
  const script = workerScriptPath();
  if (!fs.existsSync(script)) throw new Error(`Worker script not found at ${script}`);

  const args = [
    script,
    '--labId', lab._id.toString(),
    '--labName', lab.name,
    '--source', lab.cameraIP || '0',
    '--save-dir', saveDir || path.resolve(process.cwd(), 'screenshots', lab.name)
  ];

  const child = spawn('python', args, { cwd: process.cwd(), env: { ...process.env } });

  const state = {
    child,
    seq: 0,
    pending: new Map(),
    buf: '',
    isRunning: false
  };

  child.stdout.on('data', chunk => {
    state.buf += chunk.toString();
    let idx;
    while ((idx = state.buf.indexOf('\n')) >= 0) {
      const line = state.buf.slice(0, idx).trim();
      state.buf = state.buf.slice(idx + 1);
      if (!line) continue;
      const parsed = safeJsonParse(line);
      if (!parsed) {
        console.log(`[PY LOG][${sessionId}]`, line);
        continue;
      }
      const seq = parsed.seq;
      if (seq != null && state.pending.has(seq)) {
        const { resolve, timeout } = state.pending.get(seq);
        clearTimeout(timeout);
        state.pending.delete(seq);
        resolve(parsed);
      } else {
        console.log(`[PY MSG][${sessionId}]`, parsed);
      }
    }
  });

  child.stderr.on('data', d => console.error(`[PY ERR][${sessionId}]`, d.toString()));

  child.on('close', (code, sig) => {
    console.log(`Worker closed for ${sessionId} code=${code} sig=${sig}`);
    for (const [s, { reject, timeout }] of state.pending.entries()) {
      clearTimeout(timeout);
      reject(new Error('Worker exited'));
    }
    state.pending.clear();
    if (activeWorkers.has(sessionId)) {
      const ctrl = activeWorkers.get(sessionId);
      if (ctrl.intervalId) clearInterval(ctrl.intervalId);
      if (ctrl.startTimeoutId) clearTimeout(ctrl.startTimeoutId);
      activeWorkers.delete(sessionId);
    }
  });

  child.on('error', e => console.error('Worker spawn error', e));

  return state;
}

/**
 * Broadcast occupancy in real-time via Socket.IO
 */
async function broadcastOccupancy(lab, peopleCount) {
  const occupancyPercent = lab.capacity > 0
    ? Math.min(100, (peopleCount / lab.capacity) * 100)
    : 0;

   console.log(`[Occupancy] Lab: ${lab.name} | People: ${peopleCount} / Capacity: ${lab.capacity} | ${occupancyPercent.toFixed(2)}%`);
   
  getIo().emit('labOccupancyUpdate', {
    labId: lab._id,
    labName: lab.name,
    peopleCount,
    occupancyPercent: Number(occupancyPercent.toFixed(2))
  });

  // Also update current utilization in DB for dashboard reference
  await Lab.updateOne(
    { _id: lab._id },
    { $set: { currentUtilization: occupancyPercent } }
  );
}

// async function persistDetection(lab, sessionId, json) {
//   try {
//     const activeSession = await LabSession.findById(sessionId);
//     if (!activeSession) return;

//     let doc = await Detection.findOne({ lab: lab._id, labSession: activeSession._id });
//     if (!doc) {
//       doc = await Detection.create({
//         lab: lab._id,
//         labSession: activeSession._id,
//         labName: lab.name,
//         detections: [],
//         detectionsCount: 0
//       });
//     }

//     const detectedObjects = Array.isArray(json.detectedObjects) && json.detectedObjects.length
//       ? json.detectedObjects.filter(o => typeof o.count === 'number')
//       : (typeof json.count === 'number' ? [{ label: 'person', count: json.count }] : []);

//     const peopleObj = detectedObjects.find(o => o.label?.toLowerCase?.() === 'person');
//     const peopleCount = peopleObj ? peopleObj.count : 0;

//     // ✅ NEW: group screenshots under lab + session folders
//     const sessionDir = path.resolve(process.cwd(), 'screenshots', lab.name, `session_${sessionId}`);
//     fs.mkdirSync(sessionDir, { recursive: true });

//     let cloudUrl = '';
//     if (json.screenshot) {
//       const candidatePath = path.isAbsolute(json.screenshot)
//         ? json.screenshot
//         : path.join(process.cwd(), json.screenshot);

//       // ✅ Move screenshot to session folder
//       const destPath = path.join(sessionDir, path.basename(candidatePath));
//       try { fs.renameSync(candidatePath, destPath); } catch {}

//       try {
//         const uploadRes = await uploadScreenshot(destPath, {
//           deleteLocal: true,
//           folder: `lab_screenshots/${lab.name}/session_${sessionId}`
//         });
//         cloudUrl = uploadRes.url;
//       } catch {
//         if (fs.existsSync(destPath)) {
//           cloudUrl = `/screenshots/${lab.name}/session_${sessionId}/${path.basename(destPath)}`;
//         }
//       }
//     }

//     const entryTimestamp = json.timestamp ? new Date(json.timestamp) : new Date();
//     const detectionEntry = {
//       timestamp: entryTimestamp,
//       detectedObjects,
//       imagePath: cloudUrl,
//       sessionId: activeSession._id
//     };

//     await Detection.updateOne(
//       { _id: doc._id },
//       { $push: { detections: detectionEntry }, $inc: { detectionsCount: 1 } }
//     );

//     await LabSession.updateOne(
//       { _id: activeSession._id },
//       { $set: { lastDetectionAt: entryTimestamp }, $inc: { detectionsCount: 1 } }
//     );

//     await broadcastOccupancy(lab, peopleCount);

//     getIo().emit('detection', {
//       labId: lab._id,
//       labName: lab.name,
//       sessionId: activeSession._id,
//       timestamp: entryTimestamp,
//       detectedObjects,
//       peopleCount,
//       imageUrl: cloudUrl
//     });

//     if (json.phoneViolation === true && activeSession.enablePhoneDetection === true) {
//       getIo().emit('phoneViolation', {
//         labId: lab._id,
//         labName: lab.name,
//         sessionId: activeSession._id,
//         timestamp: entryTimestamp
//       });
//     }
//   } catch (err) {
//     console.error('Error persisting detection:', err);
//   }
// }


// Save detection in DB + broadcast occupancy
async function persistDetection(lab, sessionId, json) {
  console.log(`[persistDetection] Called for sessionId=${sessionId}, lab=${lab.name}`);
  try {
    const activeSession = await LabSession.findById(sessionId);
    if (!activeSession) {
      console.warn(`Session ${sessionId} not found when saving detection`);
      return;
    }

    let doc = await Detection.findOne({
      lab: lab._id,
      labSession: activeSession._id
    });

    if (!doc) {
      doc = await Detection.create({
        lab: lab._id,
        labSession: activeSession._id,
        labName: lab.name,
        detections: [],
        detectionsCount: 0
      });
    }

    const detectedObjects = Array.isArray(json.detectedObjects) && json.detectedObjects.length
      ? json.detectedObjects.filter(o => typeof o.count === 'number')
      : (typeof json.count === 'number' ? [{ label: 'person', count: json.count }] : []);

    const peopleObj = detectedObjects.find(o => o.label && o.label.toLowerCase && o.label.toLowerCase() === 'person');
    const peopleCount = peopleObj ? peopleObj.count : 0;

    // json.screenshot is expected to be a local path (absolute or relative)
    let cloudUrl = '';
    if (json.screenshot) {
      // Build absolute path if needed — screenshots stored under process.cwd()/screenshots/<lab.name>/...
      const candidatePath = path.isAbsolute(json.screenshot)
        ? json.screenshot
        : path.join(process.cwd(), json.screenshot);

      try {
        const uploadRes = await uploadScreenshot(candidatePath, { deleteLocal: true, folder: `lab_screenshots/${lab.name}` });
        cloudUrl = uploadRes.url;
        console.log('[persistDetection] Uploaded screenshot to Cloudinary:', cloudUrl);
      } catch (uploadErr) {
        console.error('[persistDetection] Cloudinary upload failed:', uploadErr);
        // fallback: preserve the local path (if file still exists)
        if (fs.existsSync(candidatePath)) {
          cloudUrl = `/screenshots/${lab.name}/${path.basename(candidatePath)}`; // static route if still served
        } else {
          cloudUrl = '';
        }
      }
    }

    const entryTimestamp = json.timestamp ? new Date(json.timestamp) : new Date();
    const detectionEntry = {
      timestamp: entryTimestamp,
      detectedObjects,
      imagePath: cloudUrl,      // store cloud URL (or empty string)
      sessionId: activeSession._id
    };

    await Detection.updateOne(
      { _id: doc._id },
      {
        $push: { detections: detectionEntry },
        $inc: { detectionsCount: 1 }
      }
    );

    await LabSession.updateOne(
      { _id: activeSession._id },
      {
        $set: {
          lastDetectionAt: entryTimestamp,
          sessionId: activeSession._id
        },
        $inc: { detectionsCount: 1 }
      }
    );

    // Broadcast occupancy in real-time using previous function
    await broadcastOccupancy(lab, peopleCount);

    // Emit the immediate detection + image to front-end
    try {
      getIo().emit('detection', {
        labId: lab._id,
        labName: lab.name,
        sessionId: activeSession._id,
        timestamp: entryTimestamp,
        detectedObjects,
        peopleCount,
        imageUrl: cloudUrl
      });

      getIo().emit('liveDetection', {
        labId: lab._id,
        labName: lab.name,
        imageUrl: `${cloudUrl}?t=${Date.now()}`,
        peopleCount,
        occupancyPercent: lab.capacity > 0 ? Math.min(100, (peopleCount / lab.capacity) * 100) : 0,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Failed to emit detection via socket:', e);
    }

    // Phone violation event unchanged
    if (json.phoneViolation === true && activeSession.enablePhoneDetection === true) {
      getIo().emit('phoneViolation', {
        labId: lab._id,
        labName: lab.name,
        sessionId: activeSession._id,
        sessionName: activeSession.labName,
        timestamp: entryTimestamp
      });
    }

  } catch (err) {
    console.error('Error persisting detection:', err);
  }
}

export async function startSessionDetections(sessionId) {
  if (activeWorkers.has(sessionId)) {
    console.log(`Session ${sessionId} already running`);
    return;
  }

  const session = await LabSession.findById(sessionId);
  if (!session) {
    console.error(`Session ${sessionId} not found`);
    return;
  }

  const lab = await Lab.findById(session.lab);
  if (!lab) {
    console.error(`Lab for session ${sessionId} not found`);
    return;
  }

  const start = new Date(session.startTime);
  const end = new Date(session.endTime);
  const runs = session.numberOfDetections || 1;

  if (!(end > start)) {
    console.error('Invalid session times');
    return;
  }

  const totalSeconds = (end - start) / 1000;
  const intervalSeconds = totalSeconds / runs;

  console.log(`Starting session ${sessionId} (lab ${lab.name}) start=${start} end=${end} runs=${runs} every=${intervalSeconds}s`);

  const saveDir = path.resolve(process.cwd(), 'screenshots', lab.name);
  fs.mkdirSync(saveDir, { recursive: true });

  const state = spawnWorker(lab, sessionId, saveDir);

  const controller = {
    child: state.child,
    state,
    lab,   // ✅ STORE lab inside controller
    session, // optional: store session too
    intervalId: null,
    startTimeoutId: null,
    runsDone: 0
  };

  activeWorkers.set(sessionId, controller);

  const doCapture = async () => {
    if (!activeWorkers.has(sessionId)) return;
    const now = new Date();
    if (now > end || controller.runsDone >= runs) {
      console.log(`Session ${sessionId} ended or runs completed`);
      await stopSessionDetections(sessionId);
      return;
    }
    if (state.isRunning) {
      console.log(`Previous capture still running for ${sessionId}, skipping`);
      return;
    }
    state.isRunning = true;
    try {
      const cmd = {
        cmd: 'capture',
        timestamp: new Date().toISOString(),
        enablePhoneDetection: session.enablePhoneDetection
      };
      const resp = await sendCmd(state, cmd, Math.max(15000, intervalSeconds * 1000));
      console.log(`[doCapture] Received response:`, resp);
      await persistDetection(lab, sessionId, resp);
      controller.runsDone += 1;
      console.log(`Session ${sessionId} capture ${controller.runsDone}/${runs} done`);
    } catch (err) {
      console.error(`Capture error for ${sessionId}:`, err.message || err);
    } finally {
      state.isRunning = false;
    }
  };

  const now = new Date();
  if (start > now) {
    const delay = start - now;
    controller.startTimeoutId = setTimeout(async () => {
      controller.startTimeoutId = null;
      await doCapture();
      controller.intervalId = setInterval(doCapture, Math.max(1000, intervalSeconds * 1000));
    }, delay);
    console.log(`Worker spawned. First capture scheduled in ${Math.round(delay / 1000)}s`);
  } else {
    console.log('Session start time is in the past or now. Starting capture immediately.');
    await doCapture();
    controller.intervalId = setInterval(doCapture, Math.max(1000, intervalSeconds * 1000));
  }
}

function deleteFolderRecursive(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file) => {
      const curPath = path.join(folderPath, file);
      try {
        if (fs.lstatSync(curPath).isDirectory()) {
          deleteFolderRecursive(curPath); // recurse for subdir
        } else {
          fs.unlinkSync(curPath); // delete file
        }
      } catch (err) {
        console.warn('Failed to delete', curPath, err.message);
      }
    });

    try {
      fs.rmdirSync(folderPath); // finally remove the folder
      console.log(`Deleted lab folder ${folderPath}`);
    } catch (err) {
      console.warn(`Failed to delete lab folder ${folderPath}`, err.message);
    }
  }
}

export async function stopSessionDetections(sessionId) {
  if (!activeWorkers.has(sessionId)) {
    console.log(`No active worker for ${sessionId}`);
    return;
  }
  const controller = activeWorkers.get(sessionId);

  if (controller.startTimeoutId) {
    clearTimeout(controller.startTimeoutId);
    controller.startTimeoutId = null;
  }
  if (controller.intervalId) {
    clearInterval(controller.intervalId);
    controller.intervalId = null;
  }

  const state = controller.state;
  try {
    if (state && state.child && !state.child.killed) {
      await sendCmd(state, { cmd: 'stop' }, 3000);
    }
  } catch {}

  setTimeout(() => {
    try {
      if (state && state.child && !state.child.killed) {
        state.child.kill('SIGTERM');
        console.log(`Force-killed worker for ${sessionId}`);
      }
    } catch (e) {
      console.error('Error force-killing worker:', e);
    }
  }, 2500);

  if (state && state.pending) {
    for (const [s, { reject, timeout }] of state.pending.entries()) {
      clearTimeout(timeout);
      reject(new Error('Session stopped'));
    }
    state.pending.clear();
  }

  // ✅ Cleanup lab screenshots + folder
  try {
    if (controller.lab) {
      const labDir = path.resolve(process.cwd(), 'screenshots', controller.lab.name);
      deleteFolderRecursive(labDir);
    }
  } catch (cleanupErr) {
    console.error('Cleanup error:', cleanupErr);
  }

  activeWorkers.delete(sessionId);
  console.log(`Stopped detections for session ${sessionId}`);
}

export function stopAllDetections() {
  for (const id of Array.from(activeWorkers.keys())) {
    stopSessionDetections(id).catch(e => console.error(e));
  }
}

export function getWorkerStateBySessionId(sessionId) {
  const controller = activeWorkers.get(sessionId);
  return controller ? controller.state : null;
}

/** ✅ NEW: daily cleanup at 00:00 (midnight) */
// cron.schedule('0 0 * * *', () => {
//   const root = path.resolve(process.cwd(), 'screenshots');
//   console.log('🧹 Running midnight cleanup of local screenshots...');
//   if (fs.existsSync(root)) {
//     fs.readdirSync(root).forEach(labDir => {
//       const full = path.join(root, labDir);
//       deleteFolderRecursive(full);
//     });
//   }
// });


// import { spawn } from 'child_process';
// import path from 'path';
// import fs from 'fs';
// import cron from 'node-cron';                // ✅ NEW (for midnight cleanup)
// import Lab from '../models/Lab.model.js';
// import LabSession from '../models/LabSession.model.js';
// import Detection from '../models/detection.model.js';
// import { uploadScreenshot } from './cloudinary.js';
// import { getIo } from '../utils/socket.js'; // update path as per your project

// const activeWorkers = new Map();

// function safeJsonParse(s) {
//   try { return JSON.parse(s); } catch { return null; }
// }

// function workerScriptPath() {
//   const projectRoot = path.resolve(process.cwd(), '..');
//   return path.resolve(projectRoot, 'yolovenv', 'detect_students.py');
// }

// export function sendCmd(state, obj, timeoutMs = 20000) {
//   return new Promise((resolve, reject) => {
//     if (!state || !state.child || state.child.killed) return reject(new Error('Worker not available'));
//     const seq = ++state.seq;
//     obj.seq = seq;
//     const line = JSON.stringify(obj) + '\n';

//     const timeout = setTimeout(() => {
//       if (state.pending.has(seq)) {
//         state.pending.delete(seq);
//         reject(new Error('Worker response timeout'));
//       }
//     }, timeoutMs);

//     state.pending.set(seq, { resolve, reject, timeout });
//     try {
//       state.child.stdin.write(line, 'utf8', (err) => {
//         if (err) {
//           clearTimeout(timeout);
//           state.pending.delete(seq);
//           return reject(err);
//         }
//       });
//     } catch (e) {
//       clearTimeout(timeout);
//       state.pending.delete(seq);
//       return reject(e);
//     }
//   });
// }

// function spawnWorker(lab, sessionId, saveDir) {
//   const script = workerScriptPath();
//   if (!fs.existsSync(script)) throw new Error(`Worker script not found at ${script}`);

//   const args = [
//     script,
//     '--labId', lab._id.toString(),
//     '--labName', lab.name,
//     '--source', lab.cameraIP || '0',
//     '--save-dir', saveDir || path.resolve(process.cwd(), 'screenshots', lab.name)
//   ];

//   const child = spawn('python', args, { cwd: process.cwd(), env: { ...process.env } });

//   const state = {
//     child,
//     seq: 0,
//     pending: new Map(),
//     buf: '',
//     isRunning: false
//   };

//   child.stdout.on('data', chunk => {
//     state.buf += chunk.toString();
//     let idx;
//     while ((idx = state.buf.indexOf('\n')) >= 0) {
//       const line = state.buf.slice(0, idx).trim();
//       state.buf = state.buf.slice(idx + 1);
//       if (!line) continue;
//       const parsed = safeJsonParse(line);
//       if (!parsed) {
//         console.log(`[PY LOG][${sessionId}]`, line);
//         continue;
//       }
//       const seq = parsed.seq;
//       if (seq != null && state.pending.has(seq)) {
//         const { resolve, timeout } = state.pending.get(seq);
//         clearTimeout(timeout);
//         state.pending.delete(seq);
//         resolve(parsed);
//       } else {
//         console.log(`[PY MSG][${sessionId}]`, parsed);
//       }
//     }
//   });

//   child.stderr.on('data', d => console.error(`[PY ERR][${sessionId}]`, d.toString()));

//   child.on('close', (code, sig) => {
//     console.log(`Worker closed for ${sessionId} code=${code} sig=${sig}`);
//     for (const [s, { reject, timeout }] of state.pending.entries()) {
//       clearTimeout(timeout);
//       reject(new Error('Worker exited'));
//     }
//     state.pending.clear();
//     if (activeWorkers.has(sessionId)) {
//       const ctrl = activeWorkers.get(sessionId);
//       if (ctrl.intervalId) clearInterval(ctrl.intervalId);
//       if (ctrl.startTimeoutId) clearTimeout(ctrl.startTimeoutId);
//       activeWorkers.delete(sessionId);
//     }
//   });

//   child.on('error', e => console.error('Worker spawn error', e));

//   return state;
// }

// /** Broadcast occupancy in real-time via Socket.IO */
// async function broadcastOccupancy(lab, peopleCount) {
//   const occupancyPercent = lab.capacity > 0
//     ? Math.min(100, (peopleCount / lab.capacity) * 100)
//     : 0;

//   getIo().emit('labOccupancyUpdate', {
//     labId: lab._id,
//     labName: lab.name,
//     peopleCount,
//     occupancyPercent: Number(occupancyPercent.toFixed(2))
//   });

//   await Lab.updateOne(
//     { _id: lab._id },
//     { $set: { currentUtilization: occupancyPercent } }
//   );
// }

// // Save detection in DB + broadcast occupancy
// async function persistDetection(lab, sessionId, json) {
//   try {
//     const activeSession = await LabSession.findById(sessionId);
//     if (!activeSession) return;

//     let doc = await Detection.findOne({ lab: lab._id, labSession: activeSession._id });
//     if (!doc) {
//       doc = await Detection.create({
//         lab: lab._id,
//         labSession: activeSession._id,
//         labName: lab.name,
//         detections: [],
//         detectionsCount: 0
//       });
//     }

//     const detectedObjects = Array.isArray(json.detectedObjects) && json.detectedObjects.length
//       ? json.detectedObjects.filter(o => typeof o.count === 'number')
//       : (typeof json.count === 'number' ? [{ label: 'person', count: json.count }] : []);

//     const peopleObj = detectedObjects.find(o => o.label?.toLowerCase?.() === 'person');
//     const peopleCount = peopleObj ? peopleObj.count : 0;

//     // ✅ group screenshots under lab + session folders
//     const sessionDir = path.resolve(process.cwd(), 'screenshots', lab.name, `session_${sessionId}`); // ✅ NEW
//     fs.mkdirSync(sessionDir, { recursive: true }); // ✅ NEW

//     let cloudUrl = '';
//     if (json.screenshot) {
//       const candidatePath = path.isAbsolute(json.screenshot)
//         ? json.screenshot
//         : path.join(process.cwd(), json.screenshot);

//       // ✅ Move screenshot to session folder for grouping
//       const destPath = path.join(sessionDir, path.basename(candidatePath));
//       try { fs.renameSync(candidatePath, destPath); } catch {}
//       try {
//         const uploadRes = await uploadScreenshot(destPath, { deleteLocal: true, folder: `lab_screenshots/${lab.name}/session_${sessionId}` });
//         cloudUrl = uploadRes.url;
//       } catch {
//         if (fs.existsSync(destPath)) {
//           cloudUrl = `/screenshots/${lab.name}/session_${sessionId}/${path.basename(destPath)}`;
//         }
//       }
//     }

//     const entryTimestamp = json.timestamp ? new Date(json.timestamp) : new Date();
//     const detectionEntry = {
//       timestamp: entryTimestamp,
//       detectedObjects,
//       imagePath: cloudUrl,
//       sessionId: activeSession._id
//     };

//     await Detection.updateOne(
//       { _id: doc._id },
//       { $push: { detections: detectionEntry }, $inc: { detectionsCount: 1 } }
//     );

//     await LabSession.updateOne(
//       { _id: activeSession._id },
//       { $set: { lastDetectionAt: entryTimestamp }, $inc: { detectionsCount: 1 } }
//     );

//     await broadcastOccupancy(lab, peopleCount);

//     getIo().emit('detection', {
//       labId: lab._id,
//       labName: lab.name,
//       sessionId: activeSession._id,
//       timestamp: entryTimestamp,
//       detectedObjects,
//       peopleCount,
//       imageUrl: cloudUrl
//     });

//     if (json.phoneViolation === true && activeSession.enablePhoneDetection === true) {
//       getIo().emit('phoneViolation', {
//         labId: lab._id,
//         labName: lab.name,
//         sessionId: activeSession._id,
//         timestamp: entryTimestamp
//       });
//     }
//   } catch (err) {
//     console.error('Error persisting detection:', err);
//   }
// }

// export async function startSessionDetections(sessionId) {
//   if (activeWorkers.has(sessionId)) return;
//   const session = await LabSession.findById(sessionId);
//   if (!session) return;
//   const lab = await Lab.findById(session.lab);
//   if (!lab) return;

//   const start = new Date(session.startTime);
//   const end = new Date(session.endTime);
//   const runs = session.numberOfDetections || 1;
//   const totalSeconds = (end - start) / 1000;
//   const intervalSeconds = totalSeconds / runs;

//   const saveDir = path.resolve(process.cwd(), 'screenshots', lab.name, `session_${sessionId}`); // ✅ UPDATED
//   fs.mkdirSync(saveDir, { recursive: true });

//   const state = spawnWorker(lab, sessionId, saveDir);
//   const controller = {
//     child: state.child,
//     state,
//     lab,
//     session,
//     intervalId: null,
//     startTimeoutId: null,
//     runsDone: 0
//   };
//   activeWorkers.set(sessionId, controller);

//   const doCapture = async () => {
//     if (!activeWorkers.has(sessionId)) return;
//     const now = new Date();
//     if (now > end || controller.runsDone >= runs) {
//       await stopSessionDetections(sessionId);
//       return;
//     }
//     if (state.isRunning) return;
//     state.isRunning = true;
//     try {
//       const cmd = {
//         cmd: 'capture',
//         timestamp: new Date().toISOString(),
//         enablePhoneDetection: session.enablePhoneDetection
//       };
//       const resp = await sendCmd(state, cmd, Math.max(15000, intervalSeconds * 1000));
//       await persistDetection(lab, sessionId, resp);
//       controller.runsDone += 1;
//     } catch (err) {
//       console.error(`Capture error for ${sessionId}:`, err);
//     } finally {
//       state.isRunning = false;
//     }
//   };

//   if (start > new Date()) {
//     const delay = start - new Date();
//     controller.startTimeoutId = setTimeout(() => {
//       doCapture();
//       controller.intervalId = setInterval(doCapture, intervalSeconds * 1000);
//     }, delay);
//   } else {
//     doCapture();
//     controller.intervalId = setInterval(doCapture, intervalSeconds * 1000);
//   }
// }

// function deleteFolderRecursive(folderPath) {
//   if (fs.existsSync(folderPath)) {
//     fs.readdirSync(folderPath).forEach(file => {
//       const cur = path.join(folderPath, file);
//       if (fs.lstatSync(cur).isDirectory()) deleteFolderRecursive(cur);
//       else fs.unlinkSync(cur);
//     });
//     fs.rmdirSync(folderPath);
//   }
// }

// export async function stopSessionDetections(sessionId) {
//   if (!activeWorkers.has(sessionId)) return;
//   const controller = activeWorkers.get(sessionId);
//   if (controller.startTimeoutId) clearTimeout(controller.startTimeoutId);
//   if (controller.intervalId) clearInterval(controller.intervalId);

//   const state = controller.state;
//   try { if (state?.child && !state.child.killed) await sendCmd(state, { cmd: 'stop' }, 3000); } catch {}
//   setTimeout(() => { try { state?.child?.kill('SIGTERM'); } catch {} }, 2500);

//   activeWorkers.delete(sessionId);
//   console.log(`Stopped detections for session ${sessionId}`);
// }

// /** ✅ NEW: daily cleanup at 00:00 (midnight) */
// cron.schedule('0 0 * * *', () => {
//   const root = path.resolve(process.cwd(), 'screenshots');
//   console.log('🧹 Running midnight cleanup of local screenshots...');
//   if (fs.existsSync(root)) {
//     fs.readdirSync(root).forEach(labDir => {
//       const full = path.join(root, labDir);
//       deleteFolderRecursive(full);
//     });
//   }
// });

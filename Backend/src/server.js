// server.js
import express from 'express';
import dotenv from 'dotenv';
import http from 'http';
import morgan from 'morgan';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import fs from 'fs';

import { connectDB } from './lib/db.js';

// Routes
import detectionRoutes from './routes/detection.route.js';
import excelRoutes from './routes/excelRoutes.route.js';
import reportRoutes from './routes/report.route.js';

// Excel scheduler
import { syncSessionsFromExcel } from './utils/excelScheduler.js';

// Socket.io
import { initIo } from './utils/socket.js';

// Models
import Lab from './models/Lab.model.js';

// Auto-start report scheduler (cron jobs)
import './utils/reportScheduler.js';

dotenv.config();
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5001;

// Initialize socket.io
initIo(server);

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

// Static folder for screenshots
const screenshotsFolder = path.resolve(
  process.env.SCREENSHOTS_DIR || path.join(process.cwd(), 'screenshots')
);
app.use('/screenshots', express.static(screenshotsFolder));

// API routes
app.use('/api/excel', excelRoutes);
app.use('/api/detections', detectionRoutes);
app.use('/api/reports', reportRoutes);

// Health check route
app.get('/health', (req, res) => res.json({ ok: true }));

// --- Server startup ---
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('✅ MongoDB connected');

    // Ensure a default lab exists
    const defaultLabName = 'LabARear';
    let lab = await Lab.findOne({ name: defaultLabName });
    if (!lab) {
      lab = await Lab.create({
        name: defaultLabName,
        capacity: 50,
        cameraStatus: 'online',
        cameraIP:
          'rtsp://admin:password@10.10.61.216:554/cam/realmonitor?channel=1&subtype=0&unicast=true&proto=Onvif',
        ipRange: '',
        currentUtilization: 0,
      });
      console.log(`🆕 Created default lab: ${lab.name}`);
    }

    // Look for any Excel file (.xlsx) in project root
    const files = fs.readdirSync(process.cwd());
    const excelFile = files.find(f => f.toLowerCase().endsWith('.xlsx'));

    if (excelFile) {
      try {
        const filePath = path.resolve(process.cwd(), excelFile);
        console.log(`📘 Found ${excelFile} - syncing sessions...`);
        const res = await syncSessionsFromExcel(filePath);
        console.log('✅ Initial Excel sync result:', res);
      } catch (err) {
        console.error('❌ Excel sync failed:', err);
      }
    } else {
      console.log('⚠️ No .xlsx file found at project root; waiting for uploads.');
    }

    // Start HTTP server
    server.listen(PORT, () =>
      console.log(`🚀 Server listening on port ${PORT}`)
    );
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

startServer();

export default app;





























// import express from 'express';
// import dotenv from 'dotenv';
// import http from 'http';
// import morgan from 'morgan';
// import path from 'path';
// import cors from 'cors';
// import cookieParser from 'cookie-parser';

// import { connectDB } from './lib/db.js';

// // Routes
// import authRoutes from './routes/auth.route.js';
// import settingsRoutes from './routes/settings.route.js';
// import labsRoutes from './routes/labs.route.js';
// import dashboardRoutes from './routes/dashboard.route.js';
// import violationsRoutes from './routes/violations.route.js';
// import detectionRoutes from './routes/detection.route.js';
// import labSessionRoutes from './routes/labSession.route.js';

// // Models
// import Setting from './models/setting.model.js';
// import Lab from './models/Lab.model.js';
// import LabSession from './models/LabSession.model.js';

// // Detection scheduler utils
// import { startSessionDetections, stopAllDetections } from './utils/scheduler.js';

// dotenv.config();
// const app = express();
// const server = http.createServer(app);
// const PORT = process.env.PORT || 5001;

// // Middleware
// app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
// app.use(express.json());
// app.use(cookieParser());
// app.use(morgan('dev'));

// // Static files for screenshots
// const screenshotsFolder = path.resolve(process.env.SCREENSHOTS_DIR || path.join(process.cwd(), 'screenshots'));
// app.use('/screenshots', express.static(screenshotsFolder));

// // API routes
// app.use('/api/auth', authRoutes);
// app.use('/api/settings', settingsRoutes);
// app.use('/api/labs', labsRoutes);
// app.use('/api/dashboard', dashboardRoutes);
// app.use('/api/violations', violationsRoutes);
// app.use('/api/detections', detectionRoutes);
// app.use('/api/labs', labSessionRoutes); // Session-specific routes

// // --- Detection session endpoints ---
// app.post('/api/start-session', async (req, res) => {
//   try {
//     const { labId, startTime, endTime, detectionsCount } = req.body;

//     if (!labId || !startTime || !endTime || !detectionsCount) {
//       return res.status(400).json({
//         message: 'labId, startTime, endTime, detectionsCount are required',
//       });
//     }

//     const start = new Date(startTime);
//     const end = new Date(endTime);

//     if (isNaN(start) || isNaN(end) || end <= start) {
//       return res.status(400).json({ message: 'Invalid start or end time' });
//     }

//     // Create session
//     const session = await LabSession.create({
//       lab: labId,
//       labName: req.body.labName,
//       startTime: start,
//       endTime: end,
//       numberOfDetections: detectionsCount,
//     });

//     console.log(`📅 Session created: ${session._id}`);
//     startSessionDetections(session._id);

//     res.status(200).json({
//       message: 'Session scheduled and started successfully',
//       sessionId: session._id,
//     });
//   } catch (err) {
//     console.error('❌ Error starting session:', err);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// app.post('/api/stop-all-sessions', (req, res) => {
//   stopAllDetections();
//   res.status(200).json({ message: 'All detection sessions stopped' });
// });

// // --- Server startup ---
// const startServer = async () => {
//   try {
//     await connectDB();
//     console.log('✅ Connected to database');

//     // Ensure default lab exists
//     const defaultLabName = 'Lab101';
//     let lab = await Lab.findOne({ name: defaultLabName });
//     if (!lab) {
//       lab = await Lab.create({
//         name: defaultLabName,
//         capacity: 1,
//         cameraStatus: 'online',
//         cameraIP: '0', // default webcam
//         ipRange: '',
//         currentUtilization: 0,
//       });
//       console.log(`🆕 Created default lab: ${lab.name}`);
//     }

//     // Ensure default frequency setting exists
//     let setting = await Setting.findOne({ key: 'default_detections_per_session' });
//     if (!setting) {
//       setting = await Setting.create({
//         key: 'default_detections_per_session',
//         value: Number(process.env.DEFAULT_DETECTIONS || 10),
//       });
//     }

//     server.listen(PORT, () => {
//       console.log(`🚀 Server listening on port ${PORT}`);
//     });
//   } catch (err) {
//     console.error('❌ Failed to start server:', err);
//     process.exit(1);
//   }
// };

// startServer();
// export default app;





// const PORT = process.env.PORT || 5001;

// const server = http.createServer(app);


// const startServer = async () => {
//   try {
//     await connectDB();
//     console.log('Connected to database');

//     // Create a default lab if not exists (for testing/demo purposes)
//     const LabId = 'Lab101';
//     let lab = await Lab.findOne({ name: LabId });
//     if (!lab) {
//       lab = await Lab.create({
//         name: LabId,
//         capacity: 1,
//         cameraStatus: 'online',
//         cameraIP: '0', // default webcam
//         ipRange: '',
//         currentUtilization: 0,
//       });
//       console.log(`Created test lab: ${lab.name}`);
//     } else {
//       console.log(`Test lab already exists: ${lab.name}`);
//     }

//     // Start HTTP server
//     server.listen(PORT, async () => {
//       console.log(`Server listening on port ${PORT}`);

//       // Load global frequency setting or create default
//       let setting = await Setting.findOne({ key: 'frequency_seconds' });
//       if (!setting) {
//         setting = await Setting.create({
//           key: 'frequency_seconds',
//           value: Number(process.env.DEFAULT_FREQUENCY_SECONDS || 60),
//         });
//       }

//       const globalFreq = Number(setting.value);

//       try {
//         // Schedule the detection job that respects session frequencies
//         scheduleDetection(globalFreq, detectionJob);
//         console.log(`Scheduled detection job with global frequency ${globalFreq} seconds`);
//       } catch (err) {
//         console.error('Failed to schedule detection job:', err.message);
//       }
//     });
//   } catch (err) {
//     console.error('Failed to start server:', err);
//     process.exit(1);
//   }
// };

// startServer();

// export default app;











// const startServer = async () => {
//     await connectDB();

//     const LabId = "Lab101";
//     let lab = await Lab.findOne({ name: LabId });
//     if (!lab) {
//         lab = await Lab.create({
//             name: LabId,
//             capacity: 1, // since it's just your laptop
//             cameraStatus: 'online',
//             cameraIP: '0', // "0" tells OpenCV to use default webcam
//             ipRange: '',
//             currentUtilization: 0
//         });
//         console.log(`Created test lab: ${lab.name}`);
//     } else {
//         console.log(`Test lab already exists: ${lab.name}`);
//     }

//     server.listen(PORT, async () => {
//         console.log(`Server listening on port ${PORT}`);

//         // read frequency from DB or set default
//         let setting = await Setting.findOne({ key: 'frequency_seconds' });
//         if (!setting) {
//             setting = await Setting.create({
//                 key: 'frequency_seconds',
//                 value: Number(process.env.DEFAULT_FREQUENCY_SECONDS || 60)
//             });
//         }

//         const freq = Number(setting.value);

//         const jobFn = async () => {
//             // console.log('Scheduler trigger: running detections for all labs...');
//             console.log('Scheduler trigger: running detections for specific lab...');

//             const lab = await Lab.findOne({name: LabId});
//              if (!lab) {
//             console.error(`Lab with ID ${LabId} not found`);
//             return;
//     }
//             // await detectionService.runDetectionForAllLabs();
//             await runDetectionForLab(lab);
//         };

//         try {
//             scheduleDetection(freq, jobFn);
//             console.log(`Scheduled detection every ${freq} seconds (or minutes if divisible by 60).`);
//         } catch (err) {
//             console.error('Could not schedule job:', err.message);
//         }
//     });
// };

// startServer();
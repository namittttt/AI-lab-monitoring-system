import express from 'express';
import dotenv from 'dotenv';
import http from 'http';
import morgan from 'morgan';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import { connectDB } from './lib/db.js';
import { initIo } from './utils/socket.js';
import { syncSessionsFromExcel } from './utils/excelScheduler.js';

// ✅ NEW: Import upgraded report scheduler (runs daily at 5 PM IST)
import runScheduler from './utils/reportScheduler.js';

// ✅ Routes
import authRoutes from './routes/auth.route.js';
import excelRoutes from './routes/excelRoutes.route.js';
import detectionRoutes from './routes/detection.route.js';
import reportRoutes from './routes/report.route.js';
import labRoutes from './routes/labs.route.js';
import labSessionRoutes from './routes/labSession.route.js';

// ✅ Models
import Lab from './models/Lab.model.js';

dotenv.config();

// --- Setup paths ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5001;

// --- Middleware ---
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

// --- Static Folders ---
const screenshotsFolder = path.resolve(
  process.env.SCREENSHOTS_DIR || path.join(process.cwd(), 'screenshots')
);
if (!fs.existsSync(screenshotsFolder)) {
  fs.mkdirSync(screenshotsFolder, { recursive: true });
}
app.use('/screenshots', express.static(screenshotsFolder));

const uploadsFolder = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsFolder)) {
  fs.mkdirSync(uploadsFolder, { recursive: true });
}
app.use('/uploads', express.static(uploadsFolder));

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/excel', excelRoutes);
app.use('/api/detections', detectionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/labs', labRoutes);
app.use('/api', labSessionRoutes);

// --- Health Check ---
app.get('/health', (req, res) => res.json({ ok: true }));

// --- Start Server ---
const startServer = async () => {
  try {
    await connectDB();
    console.log('✅ MongoDB connected');

    // Ensure default lab exists
    const defaultLabName = 'CCoffice2';
    let lab = await Lab.findOne({ name: defaultLabName });
    if (!lab) {
      lab = await Lab.create({
        name: defaultLabName,
        capacity: 50,
        cameraStatus: 'online',
        // cameraIP: process.env.DEFAULT_CAMERA_URL || '',
        cameraIP: 'rtsp://admin:epmcgit123456@10.10.61.244',
        ipRange: '',
        currentUtilization: 0,
      });
      console.log(`🆕 Created default lab: ${lab.name}`);
    }

    // Excel Sync
    const files = fs.readdirSync(process.cwd());
    const excelFile = files.find((f) => f.toLowerCase().endsWith('.xlsx'));
    if (excelFile) {
      try {
        const filePath = path.resolve(process.cwd(), excelFile);
        console.log(`📘 Found ${excelFile} - syncing sessions...`);
        const res = await syncSessionsFromExcel(filePath);
        console.log('✅ Initial Excel sync result:', res);
      } catch (err) {
        console.error('❌ Excel sync failed:', err);
      }
    }

    // Initialize Socket.io
    initIo(server);

    // ✅ Start the daily report scheduler (5 PM IST)
    runScheduler();

    // Start listening
    server.listen(PORT, () =>
      console.log(`🚀 Server running on http://localhost:${PORT}`)
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
// import fs from 'fs';
// import { fileURLToPath } from 'url';
// import { dirname } from 'path';

// import { connectDB } from './lib/db.js';
// import { initIo } from './utils/socket.js';
// import { syncSessionsFromExcel } from './utils/excelScheduler.js';
// import './utils/reportScheduler.js';

// // ✅ Routes
// import authRoutes from './routes/auth.route.js';
// import excelRoutes from './routes/excelRoutes.route.js';
// import detectionRoutes from './routes/detection.route.js';
// import reportRoutes from './routes/report.route.js';
// import labRoutes from './routes/labs.route.js';
// import labSessionRoutes from './routes/labSession.route.js';

// // ✅ Models
// import Lab from './models/Lab.model.js';

// dotenv.config();

// // --- Setup paths ---
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// const app = express();
// const server = http.createServer(app);
// const PORT = process.env.PORT || 5001;

// // --- Middleware ---
// app.use(
//   cors({
//     origin: process.env.CLIENT_URL || 'http://localhost:5173',
//     credentials: true,
//   })
// );
// app.use(express.json({ limit: '10mb' }));
// app.use(cookieParser());
// app.use(morgan('dev'));

// // --- Static Folders ---
// const screenshotsFolder = path.resolve(
//   process.env.SCREENSHOTS_DIR || path.join(process.cwd(), 'screenshots')
// );
// if (!fs.existsSync(screenshotsFolder)) {
//   fs.mkdirSync(screenshotsFolder, { recursive: true });
// }
// app.use('/screenshots', express.static(screenshotsFolder));

// const uploadsFolder = path.join(__dirname, 'uploads');
// if (!fs.existsSync(uploadsFolder)) {
//   fs.mkdirSync(uploadsFolder, { recursive: true });
// }
// app.use('/uploads', express.static(uploadsFolder));

// // --- API Routes ---
// app.use('/api/auth', authRoutes);
// app.use('/api/excel', excelRoutes);
// app.use('/api/detections', detectionRoutes);
// app.use('/api/reports', reportRoutes);
// app.use('/api/labs', labRoutes);              // ✅ fixes your 404
// app.use('/api', labSessionRoutes);            // ✅ lab session endpoints

// // --- Health Check ---
// app.get('/health', (req, res) => res.json({ ok: true }));

// // --- Start Server ---
// const startServer = async () => {
//   try {
//     await connectDB();
//     console.log('✅ MongoDB connected');

//     // Ensure default lab exists
//     const defaultLabName = 'LabARear';
//     let lab = await Lab.findOne({ name: defaultLabName });
//     if (!lab) {
//       lab = await Lab.create({
//         name: defaultLabName,
//         capacity: 50,
//         cameraStatus: 'online',
//         cameraIP: process.env.DEFAULT_CAMERA_URL || '',
//         ipRange: '',
//         currentUtilization: 0,
//       });
//       console.log(`🆕 Created default lab: ${lab.name}`);
//     }

//     // Excel Sync
//     const files = fs.readdirSync(process.cwd());
//     const excelFile = files.find((f) => f.toLowerCase().endsWith('.xlsx'));
//     if (excelFile) {
//       try {
//         const filePath = path.resolve(process.cwd(), excelFile);
//         console.log(`📘 Found ${excelFile} - syncing sessions...`);
//         const res = await syncSessionsFromExcel(filePath);
//         console.log('✅ Initial Excel sync result:', res);
//       } catch (err) {
//         console.error('❌ Excel sync failed:', err);
//       }
//     }

//     // Initialize Socket.io
//     initIo(server);

//     // Start listening
//     server.listen(PORT, () =>
//       console.log(`🚀 Server running on http://localhost:${PORT}`)
//     );
//   } catch (err) {
//     console.error('❌ Failed to start server:', err);
//     process.exit(1);
//   }
// };

// startServer();

// export default app;


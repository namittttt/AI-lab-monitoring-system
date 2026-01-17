
// src/utils/reportGenerator.js
import PDFDocument from 'pdfkit';
import axios from 'axios';
import { DateTime } from 'luxon';
import stream from 'stream';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { uploadBufferToCloudinary } from './cloudinary.js';
import Lab from '../models/Lab.model.js';
import LabSession from '../models/LabSession.model.js';
import Detection from '../models/detection.model.js';
import Report from '../models/Report.model.js';
import dotenv from 'dotenv';
import QRCode from 'qrcode';

dotenv.config();

const pipeline = promisify(stream.pipeline);
const HF_API_KEY = process.env.HF_API_KEY || '';
const HF_SUMMARY_MODEL = process.env.HF_SUMMARY_MODEL || 'sshleifer/distilbart-cnn-12-6';
const HF_CAPTION_MODEL = process.env.HF_CAPTION_MODEL || 'nlpconnect/vit-gpt2-image-captioning';
const QUICKCHART_BASE = process.env.QUICKCHART_BASE || 'https://quickchart.io/chart';
const DASHBOARD_BASE_URL = process.env.DASHBOARD_BASE_URL || 'https://your-dashboard.example.com/reports';

/** ----------------------- Helpers ----------------------- **/
function formatDate(dt, fmt = 'dd LLL yyyy') {
  return DateTime.fromJSDate(dt).setZone('Asia/Kolkata').toFormat(fmt);
}
function formatTime(dt) {
  return DateTime.fromJSDate(dt).setZone('Asia/Kolkata').toFormat('hh:mm a');
}

function normalizeImagePath(d) {
  if (!d) return null;
  if (d.imagePath && d.imagePath.trim() !== '') return d.imagePath;
  if (d.url) return d.url;
  if (d.cloudUrl) return d.cloudUrl;
  if (d.result?.secure_url) return d.result.secure_url;
  if (d.result?.url) return d.result.url;
  return null;
}

/** ----------------------- HF Model Caller ----------------------- **/
async function callHFModel(modelName, inputs, options = {}) {
  if (!HF_API_KEY) {
    console.warn('⚠️ No HF_API_KEY configured');
    return null;
  }

  const url = `https://router.huggingface.co/hf-inference/models/${modelName}`;
  const headers = {
    Authorization: `Bearer ${HF_API_KEY}`,
    'Content-Type': 'application/json',
    'x-wait-for-model': 'true',
  };

  const payload = { inputs };
  if (options.parameters) payload.parameters = options.parameters;

  const axiosConfig = { headers, timeout: 60000 };
  let retries = options.retries ?? 3;
  let delay = options.initialDelayMs ?? 3000;

  while (retries-- > 0) {
    try {
      const res = await axios.post(url, payload, axiosConfig);
      return res.data;
    } catch (err) {
      const status = err.response?.status;
      if (status === 503 || status === 404) {
        console.warn(`🕒 HF model ${modelName} not ready (status=${status}), retrying after ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        console.warn(`⏳ HF ${modelName} timed out, retrying...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      console.warn(`❌ HF call failed for ${modelName}:`, err.message);
      return null;
    }
  }
  console.warn(`⚠️ HF model ${modelName} unreachable after retries.`);
  return null;
}

/** ----------------------- AI Summary ----------------------- **/
async function getAISummary(text) {
  const response = await callHFModel(HF_SUMMARY_MODEL, text, {
    parameters: { max_length: 256, min_length: 40, do_sample: false },
    retries: 3,
  });
  if (!response) return 'Automated summary unavailable.';

  if (Array.isArray(response) && response[0]?.summary_text) return response[0].summary_text;
  if (response?.summary_text) return response.summary_text;
  if (Array.isArray(response) && response[0]?.generated_text) return response[0].generated_text;
  if (response?.generated_text) return response.generated_text;
  if (typeof response === 'string') return response;

  return 'Automated summary unavailable.';
}

/** ----------------------- Caption Generator + Cache ----------------------- **/
async function getImageCaptionAndCache(detectionDoc, imageUrl) {
  if (!imageUrl) return null;

  try {
    const existing = detectionDoc.detections.find((d) => d.imagePath === imageUrl && d.caption);
    if (existing) return existing.caption;
  } catch (_) {}

  const response = await callHFModel(HF_CAPTION_MODEL, imageUrl, { retries: 3 });
  let caption = null;
  if (Array.isArray(response) && response[0]?.generated_text) caption = response[0].generated_text;
  else if (response?.generated_text) caption = response.generated_text;
  else if (typeof response === 'string') caption = response;
  caption = caption?.trim() || 'Classroom snapshot — activity detected.';

  try {
    if (detectionDoc) {
      const idx = detectionDoc.detections.findIndex((d) => d.imagePath === imageUrl);
      if (idx !== -1) {
        detectionDoc.detections[idx].caption = caption;
        await detectionDoc.save();
      }
    }
  } catch (err) {
    console.warn('⚠️ Failed to cache caption', err.message);
  }

  return caption;
}

/** ----------------------- Image & Chart Fetch ----------------------- **/
async function fetchImageBuffer(pathOrUrl) {
  if (!pathOrUrl) return null;
  try {
    if (/^https?:\/\//.test(pathOrUrl)) {
      const res = await axios.get(pathOrUrl, {
        responseType: 'arraybuffer',
        timeout: 15000,
      });
      return Buffer.from(res.data);
    }
    const absPath = path.isAbsolute(pathOrUrl)
      ? pathOrUrl
      : path.join(process.cwd(), pathOrUrl);
    if (fs.existsSync(absPath)) return fs.readFileSync(absPath);
    console.warn('⚠️ Local image not found:', absPath);
    return null;
  } catch (err) {
    console.warn('❌ Failed to fetch image:', pathOrUrl, '|', err.message);
    return null;
  }
}

async function getChartBuffer(chartConfig) {
  try {
    const url = `${QUICKCHART_BASE}?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
    return await fetchImageBuffer(url);
  } catch (err) {
    console.warn('quickchart failed', err.message);
    return null;
  }
}

/** ----------------------- REPORT BUILDER ----------------------- **/
export async function buildDailyReport({
  mode = 'all',
  reportDate = new Date(),
  labId = null,
  uptoTime = null,
}) {
  const dayStartIST = DateTime.fromJSDate(reportDate, { zone: 'Asia/Kolkata' }).startOf('day');
  const dayEndIST = dayStartIST.endOf('day');
  const dayStart = dayStartIST.toUTC().toJSDate();
  const dayEnd = dayEndIST.toUTC().toJSDate();
  const cutoff = uptoTime
    ? DateTime.fromJSDate(uptoTime, { zone: 'Asia/Kolkata' }).toUTC().toJSDate()
    : dayEnd;

  const labs =
    mode === 'lab' && labId ? [await Lab.findById(labId)] : await Lab.find().sort({ name: 1 });

  const labSummaries = [];
  let totalDetections = 0;

  for (const lab of labs) {
    if (!lab) continue;
    const sessions = await LabSession.find({
      lab: lab._id,
      startTime: { $lte: cutoff },
      endTime: { $gte: dayStart },
    }).sort({ startTime: 1 });

    const sessionsData = [];
    for (const session of sessions) {
      const detDocs = await Detection.find({ lab: lab._id, labSession: session._id });
      const relevantDetections = detDocs.flatMap((doc) =>
        doc.detections
          .filter((d) => {
            const t = new Date(d.timestamp);
            return t >= dayStart && t <= cutoff;
          })
          .map((d) => ({
            ...d,
            imagePath: normalizeImagePath(d),
            detectionDocId: doc._id,
          }))
      );

      const detectionsCount = relevantDetections.length;
      totalDetections += detectionsCount;

      const unusual = relevantDetections.filter((d) => {
        const people = d.detectedObjects?.find((o) => o.label?.toLowerCase() === 'person');
        return lab.capacity > 0 && people && people.count > lab.capacity;
      });

      sessionsData.push({
        sessionId: session._id.toString(),
        sessionName:
          session.labName || `${formatTime(session.startTime)} - ${formatTime(session.endTime)}`,
        startTime: session.startTime,
        endTime: session.endTime,
        detectionsCount,
        detections: relevantDetections,
        unusual,
      });
    }

    labSummaries.push({
      labId: lab._id.toString(),
      labName: lab.name,
      sessions: sessionsData,
      sessionsCount: sessionsData.length,
      detectionsCount: sessionsData.reduce((s, x) => s + x.detectionsCount, 0),
      capacity: lab.capacity,
    });
  }

  const aiPrompt = `
You are generating a professional executive summary for a smart lab monitoring system.
Date: ${formatDate(reportDate, 'dd LLL yyyy')}
Total Detections: ${totalDetections}
Lab Summaries:
${labSummaries
  .map(
    (l) =>
      `${l.labName}: ${l.detectionsCount} detections across ${l.sessionsCount} sessions; Unusual: ${l.sessions.reduce(
        (s, x) => s + x.unusual.length,
        0
      )}`
  )
  .join('\n')}
`;
  const aiSummary = await getAISummary(aiPrompt);

  const barChartBuffer = await getChartBuffer({
    type: 'bar',
    data: {
      labels: labSummaries.map((l) => l.labName),
      datasets: [{ label: 'Detections', data: labSummaries.map((l) => l.detectionsCount) }],
    },
    options: { title: { display: true, text: 'Lab-wise Detections' }, legend: { display: false } },
  });

  const doc = new PDFDocument({ size: 'A4', margin: 40, autoFirstPage: false });
  const buffers = [];
  doc.on('data', buffers.push.bind(buffers));
  const endPromise = new Promise((resolve) => doc.on('end', resolve));

  doc.addPage();
  doc.fontSize(26).text('Daily Lab Report', { align: 'center' });
  doc.fontSize(12).text(`Date: ${formatDate(reportDate)}`, { align: 'center' });
  doc.moveDown(1);

  try {
    const qrUrl = `${DASHBOARD_BASE_URL}?date=${DateTime.fromJSDate(reportDate)
      .setZone('Asia/Kolkata')
      .toFormat('yyyy-LL-dd')}&mode=${mode}`;
    const qrData = await QRCode.toDataURL(qrUrl);
    doc.image(Buffer.from(qrData.split(',')[1], 'base64'), doc.page.width / 2 - 60, doc.y, {
      width: 120,
    });
  } catch (_) {}

  doc.addPage();
  doc.fontSize(14).text('Executive Summary', { underline: true });
  doc.fontSize(11).text(aiSummary);
  doc.moveDown(0.5);

  if (barChartBuffer) doc.image(barChartBuffer, { fit: [450, 250], align: 'center' });

  doc.addPage();
  for (const labSummary of labSummaries) {
    doc.fontSize(13).text(`Lab: ${labSummary.labName}`, { underline: true });
    doc.fontSize(10).text(`Total Detections: ${labSummary.detectionsCount}`);
    doc.moveDown(0.2);

    for (const session of labSummary.sessions) {
      doc.fontSize(11).text(`Session: ${session.sessionName}`);
      doc.fontSize(9).text(`Detections: ${session.detectionsCount}`);
      doc.moveDown(0.1);

      let count = 0;
      for (const det of session.detections) {
        if (!det.imagePath || count >= 4) continue;
        const buf = await fetchImageBuffer(det.imagePath);
        const caption =
          (await getImageCaptionAndCache(await Detection.findById(det.detectionDocId), det.imagePath)) ||
          `${labSummary.labName} | ${formatTime(new Date(det.timestamp))}`;
        if (buf) {
          doc.image(buf, { fit: [220, 140], align: 'left' });
          doc.fontSize(9).text(`Caption: ${caption}`);
          doc.moveDown(0.4);
          count++;
        }
      }
      if (count === 0)
        doc.fontSize(9).text('⚠️ No snapshots available for this session.', { italic: true });
      doc.moveDown(0.5);
    }
    doc.addPage();
  }

  doc.end();
  await endPromise;
  const pdfBuffer = Buffer.concat(buffers);

  return { buffer: pdfBuffer, meta: { totalDetections, labSummaries, aiSummary } };
}

/** ----------------------- Save & Cloudinary ----------------------- **/
export async function generateAndSaveReport({ mode = 'all', reportDate = new Date(), labId = null }) {
  const { buffer, meta } = await buildDailyReport({ mode, reportDate, labId });
  const dateStr = DateTime.fromJSDate(reportDate).setZone('Asia/Kolkata').toFormat('yyyyLLdd');
  const filename = `daily-lab-report-${mode}-${labId || 'all'}-${dateStr}`;
  const uploadRes = await uploadBufferToCloudinary(buffer, filename, 'reports');

  const reportDoc = await Report.create({
    date: reportDate,
    generatedAt: new Date(),
    mode,
    lab: labId,
    cloudUrl: uploadRes.secure_url || uploadRes.url,
    cloudPublicId: uploadRes.public_id,
    meta,
  });

  return { report: reportDoc, uploadRes, buffer };
}

export async function generateReportForLabOnDate({ labId, dateStrOrDate = new Date(), uptoTime = null }) {
  let reportDate =
    typeof dateStrOrDate === 'string'
      ? DateTime.fromISO(dateStrOrDate, { zone: 'Asia/Kolkata' }).toJSDate()
      : dateStrOrDate instanceof Date
      ? dateStrOrDate
      : new Date();

  let upto =
    typeof uptoTime === 'string'
      ? DateTime.fromISO(uptoTime, { zone: 'Asia/Kolkata' }).toJSDate()
      : uptoTime instanceof Date
      ? uptoTime
      : null;

  return await generateAndSaveReport({ mode: 'lab', reportDate, labId, uptoTime: upto });
}



// // Backend/src/utils/reportGenerator.js
// import PDFDocument from 'pdfkit';
// import axios from 'axios';
// import { DateTime } from 'luxon';
// import stream from 'stream';
// import { promisify } from 'util';
// import fs from 'fs';
// import path from 'path';
// import { uploadBufferToCloudinary } from '../utils/cloudinary.js';
// import Lab from '../models/Lab.model.js';
// import LabSession from '../models/LabSession.model.js';
// import Detection from '../models/detection.model.js';
// import Report from '../models/report.model.js';
// import dotenv from 'dotenv';
// import axiosLib from 'axios';

// dotenv.config();

// const pipeline = promisify(stream.pipeline);
// const HF_API_KEY = process.env.HF_API_KEY || '';

// function formatDate(dt, fmt = 'DD LLL yyyy') {
//   return DateTime.fromJSDate(dt).setZone('Asia/Kolkata').toFormat(fmt);
// }
// function formatTime(dt) {
//   return DateTime.fromJSDate(dt).setZone('Asia/Kolkata').toFormat('hh:mm a');
// }

// /**
//  * Try Hugging Face summary
//  */
// async function getAISummary(prompt) {
//   if (!HF_API_KEY) {
//     console.warn('⚠️ No Hugging Face API key found. Skipping AI summary.');
//     return null;
//   }

//   try {
//     const res = await axiosLib.post(
//       'https://router.huggingface.co/hf-inference/models/sshleifer/distilbart-cnn-12-6',
//       { inputs: prompt, options: { wait_for_model: true } },
//       {
//         headers: {
//           Authorization: `Bearer ${HF_API_KEY}`,
//           'Content-Type': 'application/json'
//         },
//         timeout: 30000
//       }
//     );

//     const summaryText = Array.isArray(res.data)
//       ? res.data[0]?.summary_text
//       : res.data?.summary_text;

//     return summaryText ? summaryText.trim() : null;
//   } catch (err) {
//     console.warn('HF summarization failed:', err.message || err);
//     return null;
//   }
// }


// /**
//  * Fallback summary
//  */
// function fallbackSummary(data) {
//   const lines = [];
//   lines.push(`Report Date: ${data.dateStr}`);
//   lines.push(`Total detections across all labs: ${data.totalDetections}`);
//   lines.push(`Number of labs with sessions: ${data.labSummaries.length}`);
//   const top = [...data.labSummaries]
//     .sort((a, b) => b.detectionsCount - a.detectionsCount)
//     .slice(0, 3);
//   if (top.length) {
//     lines.push('Top activity labs:');
//     top.forEach(t =>
//       lines.push(
//         ` - ${t.labName}: ${t.detectionsCount} detections across ${t.sessionsCount} session(s)`
//       )
//     );
//   }
//   if (data.trends && Object.keys(data.trends).length) {
//     lines.push('Trends:');
//     for (const k of Object.keys(data.trends)) {
//       lines.push(` - ${k}: ${data.trends[k]}`);
//     }
//   }
//   return lines.join('\n');
// }

// /**
//  * Fetch buffer for image
//  */
// async function fetchImageBuffer(pathOrUrl) {
//   if (!pathOrUrl) return null;

//   try {
//     if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
//       const r = await axios.get(pathOrUrl, {
//         responseType: 'arraybuffer',
//         timeout: 15000
//       });
//       return Buffer.from(r.data);
//     }

//     const absPath = path.isAbsolute(pathOrUrl)
//       ? pathOrUrl
//       : path.join(process.cwd(), pathOrUrl);

//     if (fs.existsSync(absPath)) {
//       return fs.readFileSync(absPath);
//     } else {
//       console.warn('Local file not found:', absPath);
//       return null;
//     }
//   } catch (err) {
//     console.warn('Failed to fetch image', pathOrUrl, err.message || err);
//     return null;
//   }
// }

// /**
//  * Build daily report
//  */
// export async function buildDailyReport({ mode = 'all', reportDate = new Date(), labId = null, uptoTime = null }) {
// // ✅ CHANGED: Correct IST day window
// const dayStartIST = DateTime.fromJSDate(reportDate, { zone: 'Asia/Kolkata' }).startOf('day');
// const dayEndIST = dayStartIST.endOf('day');

// // ✅ CHANGED: Convert to UTC for MongoDB queries
// const dayStart = dayStartIST.toUTC().toJSDate();
// const dayEnd = dayEndIST.toUTC().toJSDate();

// // ✅ CHANGED: Cutoff time handling
// const cutoff = uptoTime
//     ? DateTime.fromISO(uptoTime, { zone: 'Asia/Kolkata' }).toUTC().toJSDate()
//     : dayEnd;

//   // console.log("DEBUG >>> ReportDate (IST):", reportDate);
//   // console.log("DEBUG >>> dayStartIST:", dayStartIST.toISO());
//   // console.log("DEBUG >>> dayEndIST:", dayEndIST.toISO());
//   // console.log("DEBUG >>> dayStart(UTC):", dayStart.toISOString());
//   // console.log("DEBUG >>> cutoff(UTC):", cutoff.toISOString());

//   const labs = mode === 'lab' && labId ? [await Lab.findById(labId)] : await Lab.find().sort({ name: 1 });

//   const labSummaries = [];
//   let totalDetections = 0;

//   for (const lab of labs) {
//     if (!lab) continue;

//     // ✅ Simplified overlap query
//    const sessions = await LabSession.find({
//   lab: lab._id,
//   startTime: { $lte: cutoff },
//   endTime: { $gte: dayStart }
// }).sort({ startTime: 1 });

//     const sessionsData = [];

//     for (const session of sessions) {
//       const detDocs = await Detection.find({ lab: lab._id, labSession: session._id });

//       // ✅ Restrict detections to day window
//       const relevantDetections = detDocs.flatMap(doc =>
//         doc.detections.filter(d => {
//           const t = new Date(d.timestamp);
//           return t >= dayStart && t <= cutoff;
//         })
//       );

//       const detectionsCount = relevantDetections.length;
//       totalDetections += detectionsCount;

//       // unusual activity
//       const unusual = [];
//       for (const d of relevantDetections) {
//         const peopleObj = Array.isArray(d.detectedObjects)
//           ? d.detectedObjects.find(o => o.label && o.label.toLowerCase() === 'person')
//           : null;
//         const peopleCount = peopleObj ? peopleObj.count : 0;
//         if (lab.capacity > 0 && peopleCount > lab.capacity) {
//           unusual.push({ timestamp: d.timestamp, reason: `over_capacity (${peopleCount}/${lab.capacity})` });
//         }
//       }

//       sessionsData.push({
//         sessionId: session._id.toString(),
//         sessionName: session.labName || `${formatTime(session.startTime)} - ${formatTime(session.endTime)}`,
//         startTime: session.startTime,
//         endTime: session.endTime,
//         detectionsCount,
//         detections: relevantDetections,
//         unusual
//       });
//     }

//     labSummaries.push({
//       labId: lab._id.toString(),
//       labName: lab.name,
//       sessions: sessionsData,
//       sessionsCount: sessionsData.length,
//       detectionsCount: sessionsData.reduce((s, x) => s + x.detectionsCount, 0)
//     });
//   }

//   // Previous day trend
//   const prevDayIST = DateTime.fromJSDate(reportDate).setZone('Asia/Kolkata').minus({ days: 1 }).startOf('day');
//   const prevStart = prevDayIST.toUTC().toJSDate();
//   const prevEnd = prevDayIST.endOf('day').toUTC().toJSDate();

//   const previousDetCountAgg = await Detection.aggregate([
//     {
//       $match: {
//         createdAt: { $gte: prevStart, $lte: prevEnd }
//       }
//     },
//     { $group: { _id: null, total: { $sum: '$detectionsCount' } } }
//   ]);

//   const prevTotal = (previousDetCountAgg[0] && previousDetCountAgg[0].total) || 0;
//   let trendText = {};
//   if (prevTotal === 0 && totalDetections > 0) trendText['overall'] = 'Increase (no detections previous day)';
//   else if (prevTotal === 0 && totalDetections === 0) trendText['overall'] = 'No activity';
//   else {
//     const pct = prevTotal ? (((totalDetections - prevTotal) / prevTotal) * 100).toFixed(1) : '0.0';
//     trendText['overall'] = `${pct}% ${totalDetections > prevTotal ? 'increase' : (totalDetections < prevTotal ? 'decrease' : 'no change')}`;
//   }

//   // AI Summary
//   const aiPrompt = `Create a concise professional daily summary for a lab monitoring system.
// Date: ${formatDate(reportDate, 'dd LLL yyyy')}
// Summary data:
// Total detections: ${totalDetections}
// Labs: ${labSummaries.map(l => `${l.labName} (${l.detectionsCount} detections across ${l.sessionsCount} sessions)`).join('; ')}
// Trends: ${JSON.stringify(trendText)}
// Produce a 4-6 sentence executive summary suitable for inclusion at the top of a PDF report.`;

//   let aiSummary = await getAISummary(aiPrompt);
//   if (!aiSummary) {
//     aiSummary = fallbackSummary({
//       totalDetections,
//       labSummaries: labSummaries.map(ls => ({
//         labName: ls.labName,
//         sessionsCount: ls.sessionsCount,
//         detectionsCount: ls.detectionsCount,
//         unusualCount: ls.sessions.reduce((s, x) => s + x.unusual.length, 0)
//       })),
//       dateStr: formatDate(reportDate),
//       trends: trendText
//     });
//   }

//   // Build PDF
//   const doc = new PDFDocument({ size: 'A4', margin: 40 });
//   const buffers = [];
//   doc.on('data', buffers.push.bind(buffers));
//   const endPromise = new Promise((resolve) => doc.on('end', resolve));

//   doc.fontSize(22).text('Daily Lab Report', { align: 'center' });
//   doc.moveDown(1);
//   doc.fontSize(12).text(`Report Date: ${formatDate(reportDate)}`, { align: 'center' });
//   doc.text(`Generated At: ${DateTime.now().setZone('Asia/Kolkata').toFormat('dd LLL yyyy, hh:mm a')}`, { align: 'center' });
//   doc.moveDown(2);
//   doc.fontSize(10).text('Generated by: Lab Monitor System', { align: 'center' });
//   doc.addPage();

//   doc.fontSize(14).text('Report Metadata', { underline: true });
//   doc.moveDown(0.5);
//   doc.fontSize(10).list([
//     `Generated On (Asia/Kolkata): ${DateTime.now().setZone('Asia/Kolkata').toFormat('dd LLL yyyy, hh:mm a')}`,
//     `Report Date: ${formatDate(reportDate)}`,
//     `Mode: ${mode}${mode === 'lab' && labId ? ` (Lab ID: ${labId})` : ''}`,
//     `Cutoff Time: ${cutoff ? DateTime.fromJSDate(cutoff).setZone('Asia/Kolkata').toFormat('dd LLL yyyy, hh:mm a') : 'End of day'}`
//   ]);
//   doc.moveDown(1);

//   doc.fontSize(14).text('Executive Summary', { underline: true });
//   doc.moveDown(0.4);
//   doc.fontSize(11).text(aiSummary, { align: 'left' });
//   doc.addPage();

//   doc.fontSize(14).text('Lab-wise Details', { underline: true });
//   doc.moveDown(0.5);

//   for (const labSummary of labSummaries) {
//     doc.fontSize(12).text(`Lab: ${labSummary.labName}`);
//     doc.fontSize(10).text(`Total sessions (this date): ${labSummary.sessionsCount}`);
//     doc.text(`Total detections (this date): ${labSummary.detectionsCount}`);
//     doc.moveDown(0.3);

//     for (const session of labSummary.sessions) {
//       doc.fontSize(11).text(`Session: ${session.sessionName}`);
//       doc.fontSize(10).list([
//         `Start: ${formatTime(session.startTime)} | End: ${formatTime(session.endTime)}`,
//         `Total detections: ${session.detectionsCount}`,
//         `Unusual observations: ${session.unusual.length ? session.unusual.map(u => `${formatTime(new Date(u.timestamp))} - ${u.reason}`).join('; ') : 'None'}`
//       ]);
//       doc.moveDown(0.2);

//       if (session.detections && session.detections.length) {
//         doc.fontSize(10).text('Snapshots:');
//         doc.moveDown(0.2);

//         const maxImages = 6;
//         let imagesAdded = 0;

//         for (const det of session.detections) {
//           if (!det.imagePath) continue;
//           if (imagesAdded >= maxImages) break;

//           const buf = await fetchImageBuffer(det.imagePath);
//           if (buf) {
//             try {
//               doc.image(buf, { fit: [250, 200], align: 'left' });
//               doc.moveDown(0.1);

//               doc.fontSize(9).text(
//                 `Caption: ${labSummary.labName} | ${formatTime(new Date(det.timestamp))} | People: ${
//                   (() => {
//                     const p = Array.isArray(det.detectedObjects)
//                       ? det.detectedObjects.find(o => o.label && o.label.toLowerCase() === 'person')
//                       : null;
//                     return p ? p.count : 'N/A';
//                   })()
//                 }`,
//                 { indent: 10 }
//               );

//               doc.moveDown(0.4);
//               imagesAdded++;
//             } catch (err) {
//               console.warn('PDF image insert failed', err.message || err);
//             }
//           }
//         }

//         if (imagesAdded === 0) {
//           doc.fontSize(9).text('No snapshots available for this session.', { italic: true });
//         }
//       } else {
//         doc.fontSize(9).text('No detections for this session.', { italic: true });
//       }
//       doc.moveDown(0.5);
//     }

//     doc.addPage();
//   }

//   doc.fontSize(14).text('Overall Analysis', { underline: true });
//   doc.moveDown(0.3);
//   doc.fontSize(11).list([
//     `Total detections across all labs (date): ${totalDetections}`,
//     `Comparison vs previous day: ${trendText.overall}`,
//   ]);
//   doc.moveDown(0.5);

//   doc.fontSize(12).text('Lab Totals (table)');
//   doc.moveDown(0.2);

//   doc.fontSize(10);
//   const tableTop = doc.y;
//   doc.text('Lab', 50, tableTop);
//   doc.text('Sessions', 250, tableTop);
//   doc.text('Detections', 350, tableTop);
//   doc.moveDown(0.5);

//   labSummaries.forEach(ls => {
//     doc.text(ls.labName, 50);
//     doc.text(String(ls.sessionsCount), 250);
//     doc.text(String(ls.detectionsCount), 350);
//     doc.moveDown(0.4);
//   });

//   doc.addPage();
//   doc.fontSize(9).text('Generated by Lab Monitor System. This report contains snapshots and detection counts for the day.', { align: 'left' });

//   doc.end();
//   await endPromise;
//   const pdfBuffer = Buffer.concat(buffers);
//   return {
//     buffer: pdfBuffer,
//     meta: {
//       totalDetections,
//       labSummaries,
//       aiSummary,
//       trends: trendText
//     }
//   };
// }

// /**
//  * Save to DB + Cloudinary
//  */
// export async function generateAndSaveReport({ mode = 'all', reportDate = new Date(), labId = null, uptoTime = null }) {
//   const { buffer, meta } = await buildDailyReport({ mode, reportDate, labId, uptoTime });

//   const dateStr = DateTime.fromJSDate(reportDate).setZone('Asia/Kolkata').toFormat('yyyyLLdd');
//   const filename = `daily-lab-report-${mode}-${labId || 'all'}-${dateStr}`;

//   const uploadRes = await uploadBufferToCloudinary(
//     buffer,
//     filename,
//     process.env.REPORT_BUCKET_FOLDER || 'reports'
//   );
//   const reportDoc = await Report.create({
//     date: reportDate,
//     generatedAt: new Date(),
//     mode,
//     lab: labId,
//     cloudUrl: uploadRes.secure_url || uploadRes.url,
//     cloudPublicId: uploadRes.public_id,
//     meta
//   });

//   return { report: reportDoc, uploadRes, buffer };
// }

// export async function generateReportForLabOnDate({ labId, dateStrOrDate = new Date(), uptoTime = null }) {
//   let reportDate;
//   if (typeof dateStrOrDate === 'string') {
//     reportDate = DateTime.fromISO(dateStrOrDate, { zone: 'Asia/Kolkata' }).toJSDate();
//   } else if (dateStrOrDate instanceof Date) {
//     reportDate = dateStrOrDate;
//   } else {
//     reportDate = new Date();
//   }

//   let upto = null;
//   if (uptoTime) {
//     if (typeof uptoTime === 'string') {
//       upto = DateTime.fromISO(uptoTime, { zone: 'Asia/Kolkata' }).toJSDate();
//     } else if (uptoTime instanceof Date) {
//       upto = uptoTime;
//     }
//   }

//   return await generateAndSaveReport({
//     mode: 'lab',
//     reportDate,
//     labId,
//     uptoTime: upto
//   });
// }






// routes/reports.js
import express from 'express';
import { DateTime } from 'luxon';
import { generateAndSaveReport, buildDailyReport, generateReportForLabOnDate } from '../utils/reportGenerator.js';
import Report from '../models/report.model.js';

const router = express.Router();

/**
 * POST /api/reports/generate
 * (Your existing endpoint)
 */
router.post('/generate', async (req, res) => {
  try {
    const { date, labId, mode = 'all', uptoTime } = req.body || {};
    const reportDate = date ? new Date(date) : new Date();
    const upto = uptoTime ? new Date(uptoTime) : null;

    const { report } = await generateAndSaveReport({ mode, reportDate, labId, uptoTime: upto });
    return res.json({ ok: true, report });
  } catch (err) {
    console.error('generate report error', err);
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

/**
 * POST /api/reports/generate/manual
 * NEW: Manual report generation endpoint supporting:
 *  - mode: 'all' | 'lab'
 *  - date: 'YYYY-MM-DD' optional (defaults to today IST)
 *  - labId: required when mode === 'lab'
 *  - uptoTime: optional ISO string (interpreted in Asia/Kolkata)
 *
 * Returns stored report DB doc (after saving to cloudinary via existing generator).
 */
router.post('/generate/manual', async (req, res) => {
  try {
    const { date, labId, mode = 'all', uptoTime } = req.body || {};

    if (mode === 'lab' && !labId) {
      return res.status(400).json({ ok: false, error: 'labId is required when mode=lab' });
    }

    const reportDate = date ? DateTime.fromISO(date, { zone: 'Asia/Kolkata' }).toJSDate() : DateTime.now().setZone('Asia/Kolkata').toJSDate();
    const upto = uptoTime ? DateTime.fromISO(uptoTime, { zone: 'Asia/Kolkata' }).toJSDate() : null;

    const { report, uploadRes } = await generateAndSaveReport({ mode, reportDate, labId, uptoTime: upto });

    return res.json({ ok: true, report, uploadRes });
  } catch (err) {
    console.error('manual generate error', err);
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

/**
 * GET /api/reports/latest?mode=all|lab&labId=
 * (Existing endpoint)
 */
router.get('/latest', async (req, res) => {
  try {
    const { mode = 'all', labId } = req.query;
    const q = { mode };
    if (mode === 'lab' && labId) q.lab = labId;
    const r = await Report.findOne(q).sort({ generatedAt: -1 }).lean();
    if (!r) return res.status(404).json({ ok: false, error: 'No report found' });
    return res.json({ ok: true, report: r });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

/**
 * GET /api/reports/:id
 * (Existing endpoint)
 */
router.get('/:id', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).lean();
    if (!report) return res.status(404).json({ ok: false, error: 'Not found' });
    return res.json({ ok: true, report });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

/**
 * GET /api/reports/download/:id
 * (Existing endpoint)
 */
router.get('/download/:id', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).lean();
    if (!report) return res.status(404).send('Not found');
    return res.redirect(report.cloudUrl);
  } catch (err) {
    return res.status(500).send('Server error');
  }
});

/**
 * GET /api/reports/lab/:labId/date/:date
 * NEW: Fetch detailed report for a specific lab on any date (returns saved report if exists;
 * if not found, generates one on-the-fly and saves it).
 *
 * date format: YYYY-MM-DD (interpreted in Asia/Kolkata)
 *
 * Response:
 *  - if stored: { ok: true, report }
 *  - if not stored: generates and returns { ok: true, generated: true, report, uploadRes }
 */
router.get('/lab/:labId/date/:date', async (req, res) => {
  try {
    const { labId, date } = req.params;
    if (!labId || !date) return res.status(400).json({ ok: false, error: 'labId and date are required in path' });

    // Convert date to IST date-range and use a DB lookup by date (date field stored as an actual Date)
    const reportDate = DateTime.fromISO(date, { zone: 'Asia/Kolkata' }).startOf('day').toJSDate();
    const dayEnd = DateTime.fromISO(date, { zone: 'Asia/Kolkata' }).endOf('day').toJSDate();

    // Try to find an already-generated report for this lab and exact date value
    const existing = await Report.findOne({
      mode: 'lab',
      lab: labId,
      date: { $gte: reportDate, $lte: dayEnd }
    }).sort({ generatedAt: -1 }).lean();

    if (existing) {
      return res.json({ ok: true, report: existing, stored: true });
    }

    // Not found — generate one on-the-fly (and save)
    const { report, uploadRes, buffer } = await generateReportForLabOnDate({ labId, dateStrOrDate: date });
    return res.json({ ok: true, generated: true, report, uploadRes });
  } catch (err) {
    console.error('lab-date fetch error', err);
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

/**
 * GET /api/reports/list?date=YYYY-MM-DD&mode=all|lab&labId=
 * NEW: List reports stored for a date (useful for frontend "View" UI).
 */
router.get('/list', async (req, res) => {
  try {
    const { date, mode = 'all', labId } = req.query;
    if (!date) return res.status(400).json({ ok: false, error: 'date query is required (YYYY-MM-DD)' });

    const start = DateTime.fromISO(date, { zone: 'Asia/Kolkata' }).startOf('day').toJSDate();
    const end = DateTime.fromISO(date, { zone: 'Asia/Kolkata' }).endOf('day').toJSDate();

    const q = { date: { $gte: start, $lte: end } };
    if (mode) q.mode = mode;
    if (mode === 'lab' && labId) q.lab = labId;

    const reports = await Report.find(q).sort({ generatedAt: -1 }).lean();
    return res.json({ ok: true, count: reports.length, reports });
  } catch (err) {
    console.error('list reports error', err);
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

export default router;


// import express from 'express';
// import { DateTime } from 'luxon';
// import { generateAndSaveReport, buildDailyReport } from '../utils/reportGenerator.js';
// import Report from '../models/report.model.js';

// const router = express.Router();

// /**
//  * POST /api/reports/generate
//  * Body:
//  *  {
//  *    date: '2025-09-18', // optional, defaults to today (server time)
//  *    labId: '...', // optional for per-lab
//  *    mode: 'lab'|'all' (default 'all'),
//  *    uptoTime: ISOString optional: used for manual "till this time" runs
//  *  }
//  */
// router.post('/generate', async (req, res) => {
//   try {
//     const { date, labId, mode = 'all', uptoTime } = req.body || {};
//     const reportDate = date ? new Date(date) : new Date();
//     const upto = uptoTime ? new Date(uptoTime) : null;

//     const { report } = await generateAndSaveReport({ mode, reportDate, labId, uptoTime: upto });
//     return res.json({ ok: true, report });
//   } catch (err) {
//     console.error('generate report error', err);
//     return res.status(500).json({ ok: false, error: err.message || String(err) });
//   }
// });

// /**
//  * GET /api/reports/latest?mode=all|lab&labId=
//  * Returns the most recent report record.
//  */
// router.get('/latest', async (req, res) => {
//   try {
//     const { mode = 'all', labId } = req.query;
//     const q = { mode };
//     if (mode === 'lab' && labId) q.lab = labId;
//     const r = await Report.findOne(q).sort({ generatedAt: -1 }).lean();
//     if (!r) return res.status(404).json({ ok: false, error: 'No report found' });
//     return res.json({ ok: true, report: r });
//   } catch (err) {
//     return res.status(500).json({ ok: false, error: err.message || String(err) });
//   }
// });

// /**
//  * GET /api/reports/:id
//  * Returns report DB record. For downloading, cloudUrl is provided.
//  */
// router.get('/:id', async (req, res) => {
//   try {
//     const report = await Report.findById(req.params.id).lean();
//     if (!report) return res.status(404).json({ ok: false, error: 'Not found' });
//     return res.json({ ok: true, report });
//   } catch (err) {
//     return res.status(500).json({ ok: false, error: err.message || String(err) });
//   }
// });

// /**
//  * GET /api/reports/download/:id
//  * Redirects to Cloudinary URL to download/view
//  */
// router.get('/download/:id', async (req, res) => {
//   try {
//     const report = await Report.findById(req.params.id).lean();
//     if (!report) return res.status(404).send('Not found');
//     // safe redirect to cloudUrl
//     return res.redirect(report.cloudUrl);
//   } catch (err) {
//     return res.status(500).send('Server error');
//   }
// });

// export default router;

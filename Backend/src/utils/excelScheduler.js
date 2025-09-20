// Backend/src/utils/excelScheduler.js
import ExcelJS from 'exceljs';
import cron from 'node-cron';
import moment from 'moment-timezone';
import fs from 'fs';

import Lab from '../models/Lab.model.js';
import LabSession from '../models/LabSession.model.js';
import { startSessionDetections, stopSessionDetections } from '../utils/scheduler.js';

const cronRegistry = {
  startJobs: new Map(),
  stopJobs: new Map(),
};

const DAYNAME_TO_CRON_NUM = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tuesday: 2,
  wed: 3, wednesday: 3,
  thu: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

function toCronNumber(dayName) {
  if (!dayName) return null;
  const key = String(dayName).trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(DAYNAME_TO_CRON_NUM, key)
    ? DAYNAME_TO_CRON_NUM[key]
    : null;
}


/**
 * Normalize Excel headers (fix typos, case-insensitive)
 */
function normalizeHeader(header) {
  const h = String(header || '').trim().toLowerCase();
  switch (h) {
    case 'dayofweek': return 'DayOfWeek'; // typo fix
    case 'phonedetection':
    case 'ponedetection':
    case 'phonedetect': return 'PhoneDetection';
    case 'labname': return 'LabName';
    case 'starttime': return 'StartTime';
    case 'endtime': return 'EndTime';
    case 'detections': return 'Detections';
    default: return header;
  }
}

/**
 * Parse a time value (string, number, or Date) into a moment object in IST.
 * Supports:
 *  - "11:02 PM", "11:02:00 PM" (AM/PM formats)
 *  - "23:02" (24h format)
 *  - Excel serial (e.g. 0.95486 → 22:55)
 *  - JS Date
 * Always schedules the next valid occurrence of given day+time.
 */
function parseTimeStringToMomentOnNext(dayOfWeek, timeVal) {
  const tz = 'Asia/Kolkata';
  const now = moment.tz(tz);

  let hours, minutes;

  if (timeVal instanceof Date) {
    // ExcelJS might parse as JS Date with base 1900-01-00
    const d = moment(timeVal).tz(tz);
    hours = d.hours();
    minutes = d.minutes();
  } else if (typeof timeVal === 'number') {
    // Excel serial fraction of day
    const totalMinutes = Math.round(timeVal * 24 * 60);
    hours = Math.floor(totalMinutes / 60) % 24;
    minutes = totalMinutes % 60;
  } else {
    // String input
    const formats = [
  'h:mmA', 'hh:mmA', 'h:mm:ssA', 'hh:mm:ssA',
  'h:mm A', 'hh:mm A', 'h:mm:ss A', 'hh:mm:ss A',
  'H:mm', 'HH:mm', 'HH:mm:ss'
];

    const parsed = moment.tz(String(timeVal).trim(), formats, true, tz);
    if (!parsed.isValid()) {
      throw new Error(`Invalid time string: ${timeVal}`);
    }
    hours = parsed.hours();
    minutes = parsed.minutes();
  }

  // Map weekday string to number (0=Sunday ... 6=Saturday)
  const targetDowNum = toCronNumber(dayOfWeek);
  if (targetDowNum === null) {
    throw new Error(`Invalid dayOfWeek: ${dayOfWeek}`);
  }

  // Start from today
  let candidate = now.clone().startOf('day');
  // Walk forward until we hit the target weekday
  while (candidate.day() !== targetDowNum) {
    candidate.add(1, 'day');
  }

  // Apply time
  candidate.hour(hours).minute(minutes).second(0).millisecond(0);

  // If that time is already past for today, push to next week
  if (candidate.isBefore(now)) {
    candidate.add(7, 'days');
  }

  return candidate;
}

/**
 * Clear all sessions created from Excel and stop their cron jobs.
 */
async function clearExcelScheduledSessions() {
  for (const [, task] of cronRegistry.startJobs.entries()) {
    try { task.stop(); } catch {}
  }
  for (const [, task] of cronRegistry.stopJobs.entries()) {
    try { task.stop(); } catch {}
  }
  cronRegistry.startJobs.clear();
  cronRegistry.stopJobs.clear();

  try {
    const sessions = await LabSession.find({ createdFromExcel: true }).select('_id');
    for (const s of sessions) {
      try { await stopSessionDetections(s._id.toString()); } catch {}
    }
  } catch (e) {
    console.warn('Failed to stop active workers during clear:', e.message || e);
  }

  await LabSession.deleteMany({ createdFromExcel: true });
}

/**
 * Schedule cron jobs for a session (start + stop) using its stored UTC times.
 */
function scheduleCronForSession(sessionDoc) {
  if (!sessionDoc) return;

  const tz = 'Asia/Kolkata';
  const dayName = sessionDoc.recurrence?.dayOfWeek;
  const cronDayNum = toCronNumber(dayName);
  if (cronDayNum === null) {
    console.warn('Invalid dayOfWeek for session:', sessionDoc._id, dayName);
    return;
  }

  const startMoment = moment(sessionDoc.startTime).tz(tz);
  const endMoment = moment(sessionDoc.endTime).tz(tz);

  if (!startMoment.isValid() || !endMoment.isValid()) {
    console.warn('Invalid start/end Date fields for session', sessionDoc._id);
    return;
  }

  const startCronExpr = `${startMoment.minute()} ${startMoment.hour()} * * ${cronDayNum}`;
  const endCronExpr = `${endMoment.minute()} ${endMoment.hour()} * * ${cronDayNum}`;

  const startTask = cron.schedule(startCronExpr, async () => {
    console.log(`[ExcelScheduler] [START] session ${sessionDoc._id} lab=${sessionDoc.labName}`);
    try { await startSessionDetections(sessionDoc._id.toString()); } catch (e) {
      console.error('[ExcelScheduler] startSessionDetections error:', e);
    }
  }, { timezone: tz });

  const stopTask = cron.schedule(endCronExpr, async () => {
    console.log(`[ExcelScheduler] [STOP] session ${sessionDoc._id} lab=${sessionDoc.labName}`);
    try { await stopSessionDetections(sessionDoc._id.toString()); } catch (e) {
      console.error('[ExcelScheduler] stopSessionDetections error:', e);
    }
  }, { timezone: tz });

  cronRegistry.startJobs.set(sessionDoc._id.toString(), startTask);
  cronRegistry.stopJobs.set(sessionDoc._id.toString(), stopTask);

  console.log(`[ExcelScheduler] Scheduled weekly cron start: "${startCronExpr}" stop: "${endCronExpr}" for sessionId=${sessionDoc._id}`);
}

/**
 * Read Excel file, clear old sessions, create new sessions, and schedule them.
 */
export async function syncSessionsFromExcel(source) {
  const workbook = new ExcelJS.Workbook();
  if (Buffer.isBuffer(source)) {
    await workbook.xlsx.load(source);
  } else if (typeof source === 'string' && fs.existsSync(source)) {
    await workbook.xlsx.readFile(source);
  } else {
    throw new Error('syncSessionsFromExcel: invalid source');
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('No worksheet found in Excel file');

  const headerRow = sheet.getRow(1);
  const headers = headerRow.values.map(normalizeHeader);

  await clearExcelScheduledSessions();
  const processedSessions = [];

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    const values = row.values;
    const rowObj = {};

    headers.forEach((key, idx) => {
      if (!key) return;
      const val = values[idx] !== undefined ? values[idx] : '';
      rowObj[key] = (val && val.text) ? val.text : val;
    });

    const labName = rowObj.LabName;
    const dayOfWeek = rowObj.DayOfWeek;
    const startTimeVal = rowObj.StartTime;
    const endTimeVal = rowObj.EndTime;
    const detections = rowObj.Detections;
    const phoneDetectionRaw = rowObj.PhoneDetection;

    if (!labName || !dayOfWeek || !startTimeVal || !endTimeVal) {
      console.warn(`[ExcelScheduler] Skipping row ${rowNumber} - missing required columns`);
      continue;
    }

    const labNameStr = String(labName).trim();
    const dayStr = String(dayOfWeek).trim();
    const numDetections = Number(detections) || 1;
    const enablePhoneDetection = /^true$/i.test(String(phoneDetectionRaw).trim());

    let lab = await Lab.findOne({ name: labNameStr });
    if (!lab) {
      lab = await Lab.create({ name: labNameStr, cameraIP: '0' });
      console.log(`[ExcelScheduler] Created Lab "${labNameStr}" _id=${lab._id}`);
    }

    const startMomentIST = parseTimeStringToMomentOnNext(dayStr, startTimeVal);
    const endMomentIST = parseTimeStringToMomentOnNext(dayStr, endTimeVal);
    if (endMomentIST.isSameOrBefore(startMomentIST)) endMomentIST.add(1, 'day');

    const startUtc = startMomentIST.clone().utc().toDate();
    const endUtc = endMomentIST.clone().utc().toDate();

    const newSession = await LabSession.create({
      lab: lab._id,
      labName: lab.name,
      startTime: startUtc,
      endTime: endUtc,
      numberOfDetections: numDetections,
      enablePhoneDetection,
      createdFromExcel: true,
      recurrence: { dayOfWeek: dayStr, startTimeStr: startTimeVal, endTimeStr: endTimeVal },
    });

    console.log(`[ExcelScheduler] Created session ${newSession._id} for lab ${lab.name} start(IST)=${startMomentIST.format()} end(IST)=${endMomentIST.format()}`);

    scheduleCronForSession(newSession);
    processedSessions.push(newSession);
  }

  return { createdSessions: processedSessions.length };
}

export async function stopAllExcelScheduledSessions() {
  await clearExcelScheduledSessions();
  console.log('[ExcelScheduler] All excel scheduled sessions cleared.');
}

export default {
  syncSessionsFromExcel,
  stopAllExcelScheduledSessions,
  cronRegistry,
};


// runScheduler.js
import cron from 'node-cron';
import { DateTime } from 'luxon';
import { generateAndSaveReport } from '../utils/reportGenerator.js';
import dotenv from 'dotenv';
dotenv.config();

const cronExpr = process.env.REPORT_DAILY_CRON || '0 17 * * *'; // default: 17:00
const cronTZ = process.env.REPORT_DAILY_CRON_TZ || 'Asia/Kolkata';

const runScheduler = () => {
  console.log('Report scheduler starting with cron:', cronExpr, 'tz:', cronTZ);
  cron.schedule(cronExpr, async () => {
    try {
      // reportDate = today in Asia/Kolkata
      const reportDate = DateTime.now().setZone(cronTZ).toJSDate();
      console.log(`[Scheduler] Generating automatic "all labs" report for ${reportDate} (${cronTZ})`);
      await generateAndSaveReport({ mode: 'all', reportDate });
      console.log('[Scheduler] Report generation complete');
    } catch (err) {
      console.error('[Scheduler] Report generation failed', err);
    }
  }, {
    scheduled: true,
    timezone: cronTZ
  });
};

export default runScheduler;





// import cron from 'node-cron';
// import { DateTime } from 'luxon';
// import { generateAndSaveReport } from '../utils/reportGenerator.js';
// import dotenv from 'dotenv';

// dotenv.config();

// // default cron expression: every day at 17:00 (server local). If your server is not in Asia/Kolkata, you can compute the equivalent or set a TZ-aware cron in environment.
// const cronExpr = process.env.REPORT_DAILY_CRON || '0 17 * * *'; // minute hour day...
// const runScheduler = () => {
//   console.log('Report scheduler starting with cron:', cronExpr);
//   // This will run server-local time. If your server runs in UTC, and you want exact Asia/Kolkata 17:00, compute offset accordingly or use an external scheduler.
//   cron.schedule(cronExpr, async () => {
//     try {
//       // reportDate = today in Asia/Kolkata
//       const reportDate = DateTime.now().setZone('Asia/Kolkata').toJSDate();
//       console.log(`[Scheduler] Generating automatic "all labs" report for ${reportDate}`);
//       await generateAndSaveReport({ mode: 'all', reportDate });
//       console.log('[Scheduler] Report generation complete');
//     } catch (err) {
//       console.error('[Scheduler] Report generation failed', err);
//     }
//   }, {
//     scheduled: true
//   });
// };

// export default runScheduler;

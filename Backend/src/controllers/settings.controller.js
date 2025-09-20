
// controllers/frequency.controller.js
import Setting from "../models/setting.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const DEFAULT_KEY = "default_detections_per_session";

const getDefaultDetections = asyncHandler(async (req, res) => {
  let setting = await Setting.findOne({ key: DEFAULT_KEY });
  if (!setting) {
    setting = await Setting.create({
      key: DEFAULT_KEY,
      value: Number(process.env.DEFAULT_DETECTIONS || 10), // fallback default
    });
  }
  res.status(200).json({ default_detections: setting.value });
});

const setDefaultDetections = asyncHandler(async (req, res) => {
  const { default_detections } = req.body;

  if (!Number.isInteger(default_detections) || default_detections <= 0) {
    return res.status(400).json({
      message: "default_detections must be a positive integer.",
    });
  }

  const setting = await Setting.findOneAndUpdate(
    { key: DEFAULT_KEY },
    { value: default_detections },
    { upsert: true, new: true }
  );

  res.status(200).json({
    message: "Default detections per session updated successfully",
    default_detections: setting.value,
  });
});

export default {
  getDefaultDetections,
  setDefaultDetections,
};












// import Setting from "../models/setting.model.js";
// import { asyncHandler } from "../utils/asyncHandler.js";
// import { scheduleDetection, stop } from "../utils/scheduler.js";
// import { detectionJob } from "../utils/scheduler.js";  // Import detectionJob instead of detectionService

// const DEFAULT_KEY = 'frequency_seconds';

// /**
//  * Get the global frequency setting (tick frequency for scheduler).
//  */
// async function getFrequency(req, res) {
//   let setting = await Setting.findOne({ key: DEFAULT_KEY });
//   if (!setting) {
//     setting = await Setting.create({
//       key: DEFAULT_KEY,
//       value: Number(process.env.DEFAULT_FREQUENCY_SECONDS || 60),
//     });
//   }
//   res.json({ frequency_seconds: setting.value });
// }

// /**
//  * Set the global frequency setting and reschedule the detection job.
//  * Note: detectionJob respects per-session frequencies internally.
//  */
// async function setFrequency(req, res) {
//   const { frequency_seconds } = req.body;

//   if (!Number.isInteger(frequency_seconds) || frequency_seconds <= 0) {
//     return res.status(400).json({ message: 'frequency_seconds must be a positive integer (seconds).' });
//   }

//   try {
//     // Persist the new global frequency setting
//     const setting = await Setting.findOneAndUpdate(
//       { key: DEFAULT_KEY },
//       { value: frequency_seconds },
//       { upsert: true, new: true }
//     );

//     // Stop previous scheduled job and schedule a new one using detectionJob
//     stop();
//     scheduleDetection(frequency_seconds, detectionJob);

//     res.json({ frequency_seconds: setting.value });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// }

// export default {
//   getFrequency: asyncHandler(getFrequency),
//   setFrequency: asyncHandler(setFrequency)
// };

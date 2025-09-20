// Backend/src/models/LabSession.model.js
import mongoose from "mongoose";

const detectionConfigSchema = new mongoose.Schema({
  requiredCount: { type: Number, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true }
}, { _id: false });

const recurrenceSchema = new mongoose.Schema({
  dayOfWeek: { type: String }, // e.g. "Monday"
  startTimeStr: { type: String }, // e.g. "1:00 PM"
  endTimeStr: { type: String } // e.g. "3:00 PM"
}, { _id: false });

const labSessionSchema = new mongoose.Schema({
  lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true },
  labName: { type: String, required: true },

  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },

  numberOfDetections: { type: Number, required: true, default: 15 },
  detectionFrequency: { type: Number, default: 60 },

  enablePhoneDetection: { type: Boolean, default: false },

  detectionConfig: detectionConfigSchema,

  lastDetectionAt: { type: Date },
  detectionsCount: { type: Number, default: 0 },

  // NEW optional fields to support Excel-driven sessions
  createdFromExcel: { type: Boolean, default: false },
  recurrence: { type: recurrenceSchema, default: null },

  createdAt: { type: Date, default: Date.now }
});

const LabSession = mongoose.model('LabSession', labSessionSchema);
export default LabSession;

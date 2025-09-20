// Backend/src/models/LabTimetable.model.js
// Backend/src/models/LabTimetable.model.js
import mongoose from "mongoose";

const timetableEntrySchema = new mongoose.Schema({
  dayOfWeek: { type: Number, min: 0, max: 6, required: true }, // 0=Sunday, 6=Saturday
  startTime: { type: String, required: true }, // HH:mm format
  endTime: { type: String, required: true },
  numberOfDetections: { type: Number, default: 5 },
  detectionFrequency: { type: Number, default: 60 } // seconds
}, { _id: false });

const labTimetableSchema = new mongoose.Schema({
  lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true },
  entries: { type: [timetableEntrySchema], default: [] },
  repeatIntervalDays: { type: Number, default: 2 }, // can set to 7 for weekly
  nextGenerationDate: { type: Date, default: Date.now }, // when to generate next set of sessions
  createdAt: { type: Date, default: Date.now }
});

// ✅ Prevent OverwriteModelError on hot reloads
export default mongoose.models.LabTimetable || mongoose.model('LabTimetable', labTimetableSchema);


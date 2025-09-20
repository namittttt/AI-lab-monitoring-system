import mongoose from 'mongoose';

const detectedObjectSchema = new mongoose.Schema({
  label: { type: String, required: true },  // e.g., 'person', 'laptop'
  count: { type: Number, required: true }
}, { _id: false });

const detectionEntrySchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  detectedObjects: { type: [detectedObjectSchema], default: [] },
  imagePath: { type: String, default: '' },
  // store session id explicitly for traceability
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'LabSession' }
}, { _id: false });

const detectionSchema = new mongoose.Schema({
  lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true },
  labSession: { type: mongoose.Schema.Types.ObjectId, ref: 'LabSession', required: true },
  labName: { type: String, required: true },
  // array of detection entries (captures)
  detections: { type: [detectionEntrySchema], default: [] },
  // optionally keep a top-level summary count (redundant with LabSession but useful)
  detectionsCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const Detection = mongoose.model('Detection', detectionSchema);
export default Detection;




// import mongoose from "mongoose";

// const detectedObjectSchema = new mongoose.Schema({
//   label: { type: String, required: true }, // e.g., 'person', 'laptop'
//   count: { type: Number, required: true }  // count of that object
// }, { _id: false });

// // One detection entry in a session
// const detectionEntrySchema = new mongoose.Schema({
//   timestamp: { type: Date, default: Date.now },
//   detectedObjects: [detectedObjectSchema],
//   imagePath: { type: String } // relative path or URL
// }, { _id: false });

// // Document structure for a lab session's detections
// const detectionSchema = new mongoose.Schema({
//   lab: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Lab',
//     required: true
//   },
//   labSession: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'LabSession',
//     required: true
//   },
//   labName: {
//     type: String,
//     required: true
//   },
//   detections: [detectionEntrySchema] // multiple detections in same doc
// });

// const Detection = mongoose.model('Detection', detectionSchema);
// export default Detection;
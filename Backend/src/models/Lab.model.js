// Backend/src/models/Lab.js
import mongoose from "mongoose";

const labSchema = new mongoose.Schema({
  name: { type: String, required: true },
  capacity: { type: Number, default: 10 },
  cameraStatus: { type: String, enum: ['online','offline','unknown'], default: 'unknown' },
  cameraIP: { type: String, required: true },
  ipRange: { type: String, default: '' },
  currentUtilization: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const Lab = mongoose.model('Lab',labSchema);
export default Lab ;
// module.exports = mongoose.model('Lab', labSchema);

import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  date: { type: Date, required: true }, // report date (the day the data belongs to)
  generatedAt: { type: Date, default: Date.now },
  mode: { type: String, enum: ['lab', 'all'], required: true },
  lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab' }, // optional if mode='lab'
  cloudUrl: { type: String, required: true },
  cloudPublicId: { type: String },
  meta: { type: Object, default: {} }
}, { timestamps: true });

const Report = mongoose.model('Report', reportSchema);
export default Report;


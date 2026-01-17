import mongoose from "mongoose";

const labSchema = new mongoose.Schema({
  name: { type: String, required: true },
  capacity: { type: Number, default: 10 },

  cameraStatus: {
    type: String,
    enum: ["online", "offline", "unknown"],
    default: "unknown",
  },

  cameraIP: { type: String, required: false, default: null },
  ipRange: { type: String, default: "" },
  currentUtilization: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  // currentSession: { type: mongoose.Schema.Types.ObjectId, ref: "LabSession", default: null },
});

const Lab = mongoose.model("Lab", labSchema);
export default Lab;




// // Backend/src/models/Lab.model.js
// import mongoose from "mongoose";

// const labSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   capacity: { type: Number, default: 10 },
  
//   // 👇 Allow camera status tracking
//   cameraStatus: {
//     type: String,
//     enum: ["online", "offline", "unknown"],
//     default: "unknown",
//   },
  
//   // 👇 Make cameraIP optional (no longer required)
//   cameraIP: { type: String, required: false, default: null },

//   // 👇 Optional IP range (used if needed later)
//   ipRange: { type: String, default: "" },

//   currentUtilization: { type: Number, default: 0 },
//   createdAt: { type: Date, default: Date.now },
// });

// const Lab = mongoose.model("Lab", labSchema);
// export default Lab;


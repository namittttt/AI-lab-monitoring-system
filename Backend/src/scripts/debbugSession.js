import mongoose from 'mongoose';
import { DateTime } from 'luxon';
import LabSession from '../models/LabSession.model.js';
import dotenv from 'dotenv';

dotenv.config(); // loads process.env.MONGO_URI

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

async function run() {
  try {
    await connectDB(); // connect first

    const reportDate = new Date("2025-09-19");
    const dayStartIST = DateTime.fromJSDate(reportDate, { zone: 'Asia/Kolkata' }).startOf('day');
    const dayEndIST = dayStartIST.endOf('day');

    console.log("dayStartIST:", dayStartIST.toISO());
    console.log("dayEndIST:", dayEndIST.toISO());

    const sessions = await LabSession.find({ lab: "689973d096ca553b3e3397d1" });
    sessions.forEach(s => {
      console.log("Session:", s.startTime, s.endTime);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

run();

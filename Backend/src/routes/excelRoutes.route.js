// Backend/src/routes/excelRoutes.js
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import {
  syncSessionsFromExcel,
  stopAllExcelScheduledSessions,
} from "../utils/excelScheduler.js";

const router = express.Router();

// Folder to store timetable file
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const TIMETABLE_FILE = path.join(UPLOAD_DIR, "timetable.xlsx");

// Ensure upload folder exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

// Multer storage (disk, not memory)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, "timetable.xlsx"), // always overwrite with same name
});
const upload = multer({ storage });

/**
 * Upload timetable (replaces old file + clears old sessions)
 */
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    // Clear existing sessions
    await stopAllExcelScheduledSessions();

    // Remove old file if exists (before saving new one)
    if (fs.existsSync(TIMETABLE_FILE)) {
      fs.unlinkSync(TIMETABLE_FILE);
    }

    // Multer already saved new file as timetable.xlsx
    const result = await syncSessionsFromExcel(TIMETABLE_FILE);

    res.json({
      ok: true,
      message: "Timetable uploaded successfully",
      activeFile: "timetable.xlsx",
      result,
    });
  } catch (err) {
    console.error("Excel upload error:", err);
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

/**
 * Delete current timetable file + clear sessions
 */
router.delete("/clear", async (req, res) => {
  try {
    await stopAllExcelScheduledSessions();

    if (fs.existsSync(TIMETABLE_FILE)) {
      fs.unlinkSync(TIMETABLE_FILE);
    }

    res.json({ ok: true, message: "Timetable cleared successfully" });
  } catch (err) {
    console.error("Excel clear error:", err);
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

/**
 * Get info about current timetable
 */
router.get("/status", (req, res) => {
  if (fs.existsSync(TIMETABLE_FILE)) {
    res.json({
      ok: true,
      activeFile: "timetable.xlsx",
    });
  } else {
    res.json({
      ok: false,
      message: "No timetable uploaded",
    });
  }
});

export default router;

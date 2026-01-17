// routes/excelRoutes.js
import express from "express";
import multer from "multer";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";

import {
  syncSessionsFromExcel,
  stopAllExcelScheduledSessions,
} from "../utils/excelScheduler.js";

const router = express.Router();

// Folder to store uploaded Excel files
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const TIMETABLE_FILE = path.join(UPLOAD_DIR, "timetable.xlsx");

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, "timetable.xlsx"), // always same name
});
const upload = multer({ storage });

/* ============================================================
   ✅ POST /api/excel/upload — Upload & process Excel
   ============================================================ */
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    console.log("[ExcelScheduler] Clearing old Excel sessions...");
    await stopAllExcelScheduledSessions();

    if (!req.file || !fs.existsSync(TIMETABLE_FILE)) {
      return res.status(400).json({
        ok: false,
        error: "No file uploaded or timetable file missing",
      });
    }

    console.log("✅ File uploaded:", TIMETABLE_FILE);

    const result = await syncSessionsFromExcel(TIMETABLE_FILE);

    res.json({
      ok: true,
      message: "Timetable uploaded and sessions synced successfully.",
      activeFile: "timetable.xlsx",
      result,
    });
  } catch (err) {
    console.error("Excel upload error:", err);
    res.status(500).json({
      ok: false,
      error: err.message || "Internal Server Error while uploading Excel",
    });
  }
});

/* ============================================================
   ✅ GET /api/excel/status — Check if timetable file exists
   ============================================================ */
router.get("/status", async (req, res) => {
  try {
    const exists = fs.existsSync(TIMETABLE_FILE);
    res.json({
      ok: true,
      activeFile: exists ? "timetable.xlsx" : null,
      exists,
    });
  } catch (err) {
    console.error("Excel status error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ============================================================
   ✅ GET /api/excel/preview — Return Excel contents as table
   ============================================================ */
router.get("/preview", async (req, res) => {
  try {
    if (!fs.existsSync(TIMETABLE_FILE)) {
      return res.status(404).json({ ok: false, error: "No uploaded Excel found" });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(TIMETABLE_FILE);
    const sheet = workbook.worksheets[0];

    const rows = sheet
      .getSheetValues()
      .filter((r) => Array.isArray(r))
      .map((r) => r.slice(1)); // remove first undefined cell

    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error("Excel preview error:", err);
    res.status(500).json({ ok: false, error: "Failed to parse Excel file" });
  }
});


router.delete("/clear", async (req, res) => {
  try {
    if (fs.existsSync(TIMETABLE_FILE)) {
      fs.unlinkSync(TIMETABLE_FILE);
    }
    res.json({ ok: true, message: "Timetable cleared" });
  } catch (err) {
    console.error("Excel clear error:", err);
    res.status(500).json({ ok: false, error: "Failed to clear timetable" });
  }
});

export default router;

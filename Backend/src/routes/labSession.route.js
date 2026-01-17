import express from 'express'
import {
  createLabSession,
  getLabSession,
  addDetection,
  getSessionOccupancy,
  updateDetectionConfig,
  getDetectionConfig,
  getAllSessionsByLab,
  deleteSessions
} from '../controllers/labSession.controller.js'

const router = express.Router()

// ✅ Create new lab session
router.post('/sessions', createLabSession)

// ✅ Get session details + recent detections
router.get('/sessions/:sessionId', getLabSession)

// ✅ Add detection to a session
router.post('/sessions/detection', addDetection)

// ✅ Get occupancy stats for a session
router.get('/sessions/:sessionId/occupancy', getSessionOccupancy)

// ✅ Update detection configuration (count needed, start, end time)
router.post('/sessions/:sessionId/config', updateDetectionConfig)

// ✅ Get current detection configuration for a session
router.get('/sessions/:sessionId/config', getDetectionConfig)

// ✅ Get all sessions for a lab
router.get('/labs/:labId/sessions', getAllSessionsByLab)

// ✅ Delete selected sessions
router.delete('/sessions', deleteSessions)


export default router

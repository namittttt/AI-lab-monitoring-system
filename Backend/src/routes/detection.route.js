import express from 'express';
import detectionService from "../controllers/detection.controller.js" // where your runDetection functions live
import Lab from '../models/Lab.model.js';
import LabSession from '../models/LabSession.model.js';
// import Lab from '../models/Lab.model.js';
import { startSessionDetections, stopSessionDetections, stopAllDetections } from '../utils/scheduler.js';

const router = express.Router();

router.post('/start-session', async (req, res) => {
  try {
    const { labId, labName, startTime, endTime, detectionsCount } = req.body;
    console.log('Received /start-session request:', { labId, labName, startTime, endTime, detectionsCount });

    if (!labId || !startTime || !endTime || !detectionsCount) {
      return res.status(400).json({ message: 'labId, startTime, endTime, detectionsCount required' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
      console.log(`Parsed startTime: ${start.toISOString()}, endTime: ${end.toISOString()}`);
      
    if (isNaN(start) || isNaN(end) || end <= start) return res.status(400).json({ message: 'Invalid times' });

    const lab = await Lab.findById(labId);
    if (!lab) return res.status(404).json({ message: 'Lab not found' });

    const session = await LabSession.create({
      lab: labId,
      labName: labName || lab.name,
      startTime: start,
      endTime: end,
      numberOfDetections: detectionsCount
    });

    // Start persistent worker & scheduling
    await startSessionDetections(session._id);

    res.json({ message: 'Session created and scheduled', sessionId: session._id });
  } catch (err) {
    console.error('Error starting session:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** Stop single session */
router.post('/stop-session', async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ message: 'sessionId required' });

    await stopSessionDetections(sessionId);
    return res.json({ message: 'Stopped session' });
  } catch (err) {
    console.error('Error stopping session:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** Stop all sessions */
router.post('/stop-all', (req, res) => {
  stopAllDetections();
  res.json({ message: 'Stopped all sessions' });
});



// Run detection for a specific lab
router.post('/detect/:labId', async (req, res) => {
  try {
    const lab = await Lab.findById(req.params.labId);
    if (!lab) return res.status(404).json({ error: 'Lab not found' });

    const result = await detectionService.runDetectionForLab(lab);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Run detection for all labs with cameraStatus "online"
router.post('/detect-all', async (req, res) => {
  try {
    const results = await detectionService.runDetectionForAllLabs();
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

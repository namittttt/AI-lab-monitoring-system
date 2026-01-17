import axiosClient from '../lib/axiosClient.js'
export const createSession = (payload)=> axiosClient.post('/sessions', payload)
export const getSession = (id)=> axiosClient.get(`/sessions/${id}`)
export const addDetection = (payload)=> axiosClient.post('/sessions/detection', payload)
export const getOccupancy = (id)=> axiosClient.get(`/sessions/${id}/occupancy`)
export const updateConfig = (sessionId, payload)=> axiosClient.post(`/sessions/${sessionId}/config`, payload)
export const getConfig = (sessionId)=> axiosClient.get(`/sessions/${sessionId}/config`)

export const scheduleSession = async (labId, startTime, endTime) => {
  const res = await axios.post(`${API_BASE_URL}/sessions/schedule`, {
    labId,
    startTime,
    endTime,
  });
  return res.data;
};

// control endpoints
export const startSession = (payload)=> axiosClient.post('/start-session', payload)
export const stopSession = (payload)=> axiosClient.post('/stop-session', payload)
export const stopAllSessions = ()=> axiosClient.post('/stop-all')
export const triggerDetect = (labId)=> axiosClient.post(`/detect/${labId}`)
export const triggerDetectAll = ()=> axiosClient.post('/detect-all')

// ✅ NEW: Fetch all sessions for a lab
// ─────────────────────────────────────────────
export const getAllSessionsByLab = (labId) =>
  axiosClient.get(`/labs/${labId}/sessions`)

// ✅ NEW: Delete one or multiple sessions
export const deleteSessions = (ids) =>
  axiosClient.delete('/sessions', { data: { ids } })
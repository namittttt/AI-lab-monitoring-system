// -----------------------------
// File: src/services/labService.js
// -----------------------------
import axiosClient from '../lib/axiosClient.js'
export const createLab = (payload)=> axiosClient.post('/labs', payload)
export const listLabs = ()=> axiosClient.get('/labs')

export const getLab = (id)=> axiosClient.get(`/labs/${id}`)
export const deleteLab = (id) => axiosClient.delete(`/labs/${id}`);
// export const listallLabs = ()=> axiosClient.get('/labs')

export const getLabDetections = (labId) => 
  axiosClient.get(`/labs/${labId}/detections`)

export const startSession = (payload) => axiosClient.post('/sessions', payload)  // creates a new lab session
export const stopSession = (payload) => axiosClient.post('/sessions/detection', payload) 
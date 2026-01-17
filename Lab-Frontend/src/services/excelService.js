import axiosClient from '../lib/axiosClient.js';

export const uploadTimetable = (formData) =>
  axiosClient.post('/excel/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const statusTimetable = () => axiosClient.get('/excel/status');

export const clearTimetable = () => axiosClient.delete('/excel/clear');

export const previewTimetable = () => axiosClient.get('/excel/preview');

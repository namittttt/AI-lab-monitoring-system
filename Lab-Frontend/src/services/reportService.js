// import axiosClient from '../lib/axiosClient.js'
// export const generateReport = (payload)=> axiosClient.post('/api/reports/generate/manual', payload)
// export const latestReport = (params)=> axiosClient.get('/api/reports/latest', { params })
// export const listReports = (params)=> axiosClient.get('/api/reports/list', { params })
// export const getReport = (id)=> axiosClient.get(`/api/reports/${id}`)
// export const downloadReport = (id)=> axiosClient.get(`/api/reports/download/${id}`)
// export const getReportForLabDate = (labId, date)=> axiosClient.get(`/api/reports/lab/${labId}/date/${date}`)
// src/services/reportService.js
import axiosClient from '../lib/axiosClient.js'

export const generateReport = (payload) =>
  axiosClient.post('/reports/generate/manual', payload)

export const latestReport = (params) =>
  axiosClient.get('/reports/latest', { params })

export const listReports = (params) =>
  axiosClient.get('/reports/list', { params })

export const getReport = (id) =>
  axiosClient.get(`/reports/${id}`)

export const downloadReport = (id) =>
  axiosClient.get(`/reports/download/${id}`)

export const getReportForLabDate = (labId, date) =>
  axiosClient.get(`/reports/lab/${labId}/date/${date}`)

import { io } from 'socket.io-client'
import { useSocketStore } from '../store/socketStore'


let socket = null


export const connectSocket = (opts = {}) => {
if (socket && socket.connected) return socket


// connect to same origin; if server elsewhere pass full URL in opts.url
const url = opts.url || '/'
socket = io(url, { transports:['websocket'], withCredentials: true })


socket.on('connect', ()=> console.log('socket connected', socket.id))


socket.on('labOccupancyUpdate', (payload)=> {
// payload: { labId, labName, peopleCount, occupancyPercent }
useSocketStore.getState().pushOccupancy(payload.labId, payload)
})


socket.on('detection', (payload)=> {
// payload: { labId, sessionId, timestamp, detectedObjects, peopleCount, imageUrl }
useSocketStore.getState().pushDetection(payload)
})


socket.on('phoneViolation', (payload)=> {
useSocketStore.getState().pushViolation(payload)
})


socket.on('workerLog', (payload)=> {
useSocketStore.getState().pushLog(payload)
})


socket.on('disconnect', ()=> console.log('socket disconnected'))


return socket
}


export const disconnectSocket = ()=>{
if(socket){ socket.disconnect(); socket = null }
}
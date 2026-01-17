// src/store/socketStore.js
import { create } from 'zustand'
import { io } from 'socket.io-client'
import { queryClient } from '../main' // ✅ Import your global React Query client

// Use backend socket URL or current origin as fallback
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin

export const useSocketStore = create((set, get) => {
  let socket = null

  return {
    connected: false,
    occupancy: {},   // { labId: { peopleCount, occupancyPercent, labName, lastUpdated } }
    detections: [],  // latest detections for all labs
    violations: [],  // phone violation alerts
    logs: [],        // debug logs

    // ---- Updaters ----
    pushOccupancy: (labId, data) =>
      set((state) => ({
        occupancy: {
          ...state.occupancy,
          [labId]: {
            ...data,
            lastUpdated: new Date().toISOString(),
          },
        },
      })),

    pushDetection: (det) =>
      set((state) => ({
        detections: [det, ...state.detections].slice(0, 200),
      })),

    pushViolation: (v) =>
      set((state) => ({
        violations: [v, ...state.violations].slice(0, 100),
      })),

    pushLog: (l) =>
      set((state) => ({
        logs: [l, ...state.logs].slice(0, 200),
      })),

    // ---- Socket Connect ----
    connect: () => {
      if (socket) return // already connected

      socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
      })

      socket.on('connect', () => {
        console.log('✅ Socket connected:', socket.id)
        set({ connected: true })
      })

      socket.on('disconnect', (reason) => {
        console.warn('❌ Socket disconnected:', reason)
        set({ connected: false })
      })

      // 🟢 OCCUPANCY UPDATES (every detection interval)
      socket.on('labOccupancyUpdate', (payload) => {
        if (!payload?.labId) return

        const occData = {
          peopleCount: payload.peopleCount ?? 0,
          occupancyPercent: payload.occupancyPercent ?? 0,
          labName: payload.labName ?? 'Unknown',
        }

        get().pushOccupancy(payload.labId, occData)

        // ✅ Update React Query cache for live view
        queryClient.setQueryData(['live-detection', payload.labId], (prev) => ({
          ...(prev || {}),
          ...occData,
          timestamp: new Date().toISOString(),
        }))
      })

      // 🟣 NEW DETECTION (real-time image + data)
      socket.on('detection', (payload) => {
        if (!payload?.labId) return
        console.log('🆕 New detection from socket:', payload)

        // ✅ Push to local detection list
        get().pushDetection(payload)

        // Update occupancy locally
        const occData = {
          peopleCount: payload.peopleCount ?? 0,
          occupancyPercent: payload.occupancyPercent ?? 0,
          labName: payload.labName ?? 'Unknown',
        }
        get().pushOccupancy(payload.labId, occData)

        // ✅ Append detection to React Query cache instead of replacing it
        queryClient.setQueryData(['live-detection', payload.labId], (prev) => {
        const prevList = Array.isArray(prev?.detections) ? prev.detections : []
        const newDetection = {
          imagePath: payload.imageUrl,
          timestamp: new Date().toISOString(),
          detectedObjects: payload.detectedObjects || [],
          peopleCount: payload.peopleCount ?? 0,
          occupancyPercent: payload.occupancyPercent ?? 0,
        }

        return {
          ...occData,
          detections: [newDetection, ...prevList].slice(0, 20),
          lastUpdated: new Date().toISOString(),
        }
      })

      })

      // 🟢 LIVE DETECTION (instant camera frame)
        socket.on('liveDetection', (payload) => {
          if (!payload?.labId) return
          console.log('🎥 Live frame from socket:', payload)

          // Update occupancy instantly for UI consistency
          const occData = {
            peopleCount: payload.peopleCount ?? 0,
            occupancyPercent: payload.occupancyPercent ?? 0,
            labName: payload.labName ?? 'Unknown',
          }
          get().pushOccupancy(payload.labId, occData)

          // ✅ Add this live frame into React Query cache for SessionLiveView
          queryClient.setQueryData(['live-detection', payload.labId], (prev) => ({
            ...(prev || {}),
            latestFrame: {
              imageUrl: `${payload.imageUrl}?t=${Date.now()}`, // Force refresh
              timestamp: payload.timestamp || new Date().toISOString(),
              peopleCount: payload.peopleCount ?? 0,
              occupancyPercent: payload.occupancyPercent ?? 0,
            },
            ...occData,
            lastUpdated: new Date().toISOString(),
          }))
        })

      // 🔴 PHONE VIOLATION EVENT
      socket.on('phoneViolation', (payload) => {
        console.log('📱 Phone violation detected:', payload)
        get().pushViolation(payload)
      })

      // 📝 OPTIONAL: GENERAL LOGS
      socket.on('log', (msg) => {
        console.log('🪵 Log:', msg)
        get().pushLog(msg)
      })

      set({ _socket: socket })
    },

    // ---- Disconnect socket ----
    disconnect: () => {
      if (socket) {
        socket.disconnect()
        socket = null
        set({ connected: false })
      }
    },

    // ---- Helpers ----
    getOccupancyForLab: (labId) => get().occupancy[labId] || null,
    getLatestDetectionForLab: (labId) => {
      const detections = get().detections.filter((d) => d.labId === labId)
      return detections.length ? detections[0] : null
    },
  }
})



// // src/store/socketStore.js
// import { create } from 'zustand'
// import { io } from 'socket.io-client'
// import { queryClient } from '../main' // ✅ Import your global QueryClient instance

// // Use your backend socket URL or fallback to current origin
// const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin

// export const useSocketStore = create((set, get) => {
//   let socket = null

//   return {
//     connected: false,
//     occupancy: {},   // { labId: { peopleCount, occupancyPercent, labName, lastUpdated } }
//     detections: [],  // latest detections (for global dashboard)
//     violations: [],  // phone violation events
//     logs: [],        // generic logs or debug info

//     // ---- Updaters ----
//     pushOccupancy: (labId, data) =>
//       set((state) => ({
//         occupancy: {
//           ...state.occupancy,
//           [labId]: {
//             ...data,
//             lastUpdated: new Date().toISOString(),
//           },
//         },
//       })),

//     pushDetection: (det) =>
//       set((state) => ({
//         detections: [det, ...state.detections].slice(0, 200),
//       })),

//     pushViolation: (v) =>
//       set((state) => ({
//         violations: [v, ...state.violations].slice(0, 100),
//       })),

//     pushLog: (l) =>
//       set((state) => ({
//         logs: [l, ...state.logs].slice(0, 200),
//       })),

//     // ---- Socket Connect ----
//     connect: () => {
//       if (socket) return // already connected

//       socket = io(SOCKET_URL, {
//         transports: ['websocket', 'polling'],
//         reconnection: true,
//       })

//       socket.on('connect', () => {
//         console.log('✅ Socket connected')
//         set({ connected: true })
//       })

//       socket.on('disconnect', (reason) => {
//         console.warn('❌ Socket disconnected:', reason)
//         set({ connected: false })
//       })

//       // ---- Real-time events from backend ----

//       // 🟢 Occupancy updates every detection interval
//       socket.on('labOccupancyUpdate', (payload) => {
//         if (!payload?.labId) return

//         const occData = {
//           peopleCount: payload.peopleCount ?? 0,
//           occupancyPercent: payload.occupancyPercent ?? 0,
//           labName: payload.labName ?? 'Unknown',
//         }

//         get().pushOccupancy(payload.labId, occData)

//         // ✅ Also update React Query cache for live view
//         queryClient.setQueryData(['live-detection', payload.labId], (prev) => ({
//           ...(prev || {}),
//           ...occData,
//           timestamp: new Date().toISOString(),
//         }))
//       })

//       // 🟣 New detection (includes image + count)
//       socket.on('detection', (payload) => {
//         if (!payload?.labId) return
//         get().pushDetection(payload)

//         const detData = {
//           imageUrl: payload.imageUrl,
//           peopleCount: payload.peopleCount ?? 0,
//           occupancyPercent: payload.occupancyPercent ?? 0,
//           labName: payload.labName ?? 'Unknown',
//           timestamp: new Date().toISOString(),
//         }

//         // Update occupancy in local store
//         get().pushOccupancy(payload.labId, detData)

//         // ✅ Sync live detection data with React Query cache
//         queryClient.setQueryData(['live-detection', payload.labId], detData)
//       })

//       // 🔴 Phone violation (alert event)
//       socket.on('phoneViolation', (payload) => {
//         console.log('📱 Phone violation:', payload)
//         get().pushViolation(payload)
//       })

//       // 📝 Optional: general logs
//       socket.on('log', (msg) => {
//         get().pushLog(msg)
//       })

//       set({ _socket: socket })
//     },

//     // ---- Disconnect socket ----
//     disconnect: () => {
//       if (socket) {
//         socket.disconnect()
//         socket = null
//         set({ connected: false })
//       }
//     },

//     // ---- Helper Getters ----
//     getOccupancyForLab: (labId) => get().occupancy[labId] || null,
//     getLatestDetectionForLab: (labId) => {
//       const detections = get().detections.filter((d) => d.labId === labId)
//       return detections.length ? detections[0] : null
//     },
//   }
// })



// // // src/store/socketStore.js
// // import { create } from 'zustand'
// // import { io } from 'socket.io-client'

// // // Use your backend socket URL or fallback to current origin
// // const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin

// // export const useSocketStore = create((set, get) => {
// //   let socket = null

// //   return {
// //     connected: false,
// //     occupancy: {},   // { labId: { peopleCount, occupancyPercent, labName, lastUpdated } }
// //     detections: [],  // latest detections list (for global logs or dashboard)
// //     violations: [],  // phone violations
// //     logs: [],        // generic logs

// //     // ---- Updaters ----
// //     pushOccupancy: (labId, data) =>
// //       set((state) => ({
// //         occupancy: {
// //           ...state.occupancy,
// //           [labId]: {
// //             ...data,
// //             lastUpdated: new Date().toISOString(),
// //           },
// //         },
// //       })),

// //     pushDetection: (det) =>
// //       set((state) => ({
// //         detections: [det, ...state.detections].slice(0, 200),
// //       })),

// //     pushViolation: (v) =>
// //       set((state) => ({
// //         violations: [v, ...state.violations].slice(0, 100),
// //       })),

// //     pushLog: (l) =>
// //       set((state) => ({
// //         logs: [l, ...state.logs].slice(0, 200),
// //       })),

// //     // ---- Socket Connect ----
// //     connect: () => {
// //       if (socket) return // already connected

// //       socket = io(SOCKET_URL, {
// //         transports: ['websocket', 'polling'],
// //         reconnection: true,
// //       })

// //       socket.on('connect', () => {
// //         console.log('✅ Socket connected');
// //         set({ connected: true })
// //       })

// //       socket.on('disconnect', (reason) => {
// //         console.warn('❌ Socket disconnected:', reason)
// //         set({ connected: false })
// //       })

// //       // ---- Real-time events from backend ----

// //       // 🟢 Occupancy updates every detection interval
// //       socket.on('labOccupancyUpdate', (payload) => {
// //         if (!payload?.labId) return
// //         get().pushOccupancy(payload.labId, {
// //           peopleCount: payload.peopleCount ?? 0,
// //           occupancyPercent: payload.occupancyPercent ?? 0,
// //           labName: payload.labName ?? 'Unknown',
// //         })
// //       })

// //       // 🟣 New detection (includes image + count)
// //       socket.on('detection', (payload) => {
// //         if (!payload?.labId) return
// //         get().pushDetection(payload)
// //         get().pushOccupancy(payload.labId, {
// //           peopleCount: payload.peopleCount ?? 0,
// //           occupancyPercent: payload.occupancyPercent ?? 0,
// //           labName: payload.labName ?? 'Unknown',
// //         })
// //       })

// //       // 🔴 Phone violation (alert event)
// //       socket.on('phoneViolation', (payload) => {
// //         console.log('📱 Phone violation:', payload)
// //         get().pushViolation(payload)
// //       })

// //       // Optional: logging events (if emitted)
// //       socket.on('log', (msg) => {
// //         get().pushLog(msg)
// //       })

// //       set({ _socket: socket })
// //     },

// //     // ---- Disconnect socket ----
// //     disconnect: () => {
// //       if (socket) {
// //         socket.disconnect()
// //         socket = null
// //         set({ connected: false })
// //       }
// //     },

// //     // ---- Helper Getters ----
// //     getOccupancyForLab: (labId) => get().occupancy[labId] || null,
// //     getLatestDetectionForLab: (labId) => {
// //       const detections = get().detections.filter((d) => d.labId === labId)
// //       return detections.length ? detections[0] : null
// //     },
// //   }
// // })

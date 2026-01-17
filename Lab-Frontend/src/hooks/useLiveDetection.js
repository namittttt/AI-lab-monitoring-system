// // src/hooks/useLiveDetection.js
// import { useEffect } from 'react'
// import { useQuery } from '@tanstack/react-query'
// import { useSocketStore } from '../store/socketStore'

// export function useLiveDetection(labId) {
//   const { connect, disconnect } = useSocketStore()

//   useEffect(() => {
//     connect()
//     return () => disconnect()
//   }, [connect, disconnect])

//   const { data } = useQuery({
//     queryKey: ['live-detection', labId],
//     initialData: {
//       imageUrl: null,
//       peopleCount: 0,
//       occupancyPercent: 0,
//       timestamp: null,
//     },
//   })

//   return data
// }


// // src/hooks/useLiveDetection.js
// import { useEffect } from 'react'
// import { useSocketStore } from '../store/socketStore'

// export function useLiveDetection(labId) {
//   const { connect, disconnect, getLatestDetectionForLab } = useSocketStore()

//   useEffect(() => {
//     connect()
//     return () => disconnect()
//   }, [connect, disconnect])

//   // ✅ Use the helper from your store instead of latestDetection
//   const detection = getLatestDetectionForLab(labId) || {}

//   return {
//     imageUrl: detection.imageUrl || null,
//     peopleCount: detection.peopleCount || 0,
//     occupancyPercent: detection.occupancyPercent || 0,
//     labName: detection.labName || 'Unknown',
//     timestamp: detection.timestamp || null,
//   }
// }

// src/hooks/useLiveDetection.js
// src/hooks/useLiveDetection.js
import { useEffect, useState } from "react";
import { useSocketStore } from "../store/socketStore";
import { getLabDetections } from "../services/labService"; // fallback API

export function useLiveDetection(labId) {
  const { connect, getOccupancyForLab, detections } = useSocketStore();
  const [liveDetections, setLiveDetections] = useState([]);
  const [peopleCount, setPeopleCount] = useState(0);
  const [occupancyPercent, setOccupancyPercent] = useState(0);

  // ✅ Fetch + connect socket
  useEffect(() => {
    if (!labId) return;

    connect(); // ensure socket connected

    // initial fetch for backup data
    const fetchInitial = async () => {
      const res = await getLabDetections(labId);
      if (res?.data) setLiveDetections(res.data.slice(0, 20));
    };
    fetchInitial();

    const interval = setInterval(fetchInitial, 60000); // refresh every 1min
    return () => clearInterval(interval);
  }, [labId, connect]);

  // ✅ Real-time sync with Zustand store
  useEffect(() => {
    const occ = getOccupancyForLab(labId);
    if (occ) {
      setPeopleCount(occ.peopleCount ?? 0);
      setOccupancyPercent(occ.occupancyPercent ?? 0);
    }

    const labDetections = detections.filter((d) => d.labId === labId);
    if (labDetections.length > 0) {
      setLiveDetections(labDetections.slice(0, 20));
    }
  }, [detections, labId, getOccupancyForLab]);

  // ✅ FRONTEND CLEANUP: clear detections every midnight
  useEffect(() => {
    const scheduleMidnightClear = () => {
      const now = new Date();
      const msUntilMidnight =
        new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0) - now;

      // Clear detections at midnight
      const timeout = setTimeout(() => {
        setLiveDetections([]);
        console.log("🕛 [LiveDetection] Cleared detections at midnight.");

        // Schedule next clears every 24 hours
        setInterval(() => {
          setLiveDetections([]);
          console.log("🕛 [LiveDetection] Cleared detections at midnight (repeated).");
        }, 24 * 60 * 60 * 1000);
      }, msUntilMidnight);

      return () => clearTimeout(timeout);
    };

    const cleanup = scheduleMidnightClear();
    return cleanup;
  }, []);

  return { detections: liveDetections, peopleCount, occupancyPercent };
}

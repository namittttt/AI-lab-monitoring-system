// src/utils/socket.js
import { Server } from "socket.io";

let ioInstance; // store the global io

/**
 * Initialize Socket.IO
 * Call this ONCE in your server.js after creating the HTTP server
 */
export function initIo(server) {
  ioInstance = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  ioInstance.on("connection", (socket) => {
    console.log("✅ Client connected:", socket.id);

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);
    });
  });

  console.log("🚀 Socket.IO initialized");
  return ioInstance;
}

/**
 * Get the active Socket.IO instance
 * Throws an error if initIo() hasn't been called yet
 */
export function getIo() {
  if (!ioInstance) {
    throw new Error("Socket.IO not initialized. Call initIo(server) first.");
  }
  return ioInstance;
}

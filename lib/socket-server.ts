import http from 'http';

// Declare the augmentation for the process object
declare global {
  var NEXT_SERVER: http.Server | null;
}

let nextServer: http.Server | null = null;

// Store reference to the Next.js HTTP server
export function setNextServer(server: http.Server) {
  nextServer = server;
  
  // Make the server available globally for Socket.io
  global.NEXT_SERVER = server;
  
  console.log('Next.js server registered for Socket.io');
}

// Get the Next.js server
export function getNextServer() {
  return nextServer;
} 
import http from 'http';

let nextServer: http.Server | null = null;

// Store reference to the Next.js HTTP server
export function setNextServer(server: http.Server) {
  nextServer = server;
  
  // Make the server available globally for Socket.io
  (process as any).NEXT_SERVER = server;
  
  console.log('Next.js server registered for Socket.io');
}

// Get the Next.js server
export function getNextServer() {
  return nextServer;
} 
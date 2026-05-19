import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from './config';

let socket: Socket | null = null;

export function getViewerSocket() {
  if (socket) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 1500,
    reconnectionDelayMax: 8000,
  });

  return socket;
}

// Lets any component send over the SAME WebSocket connection SocketProvider owns,
// without opening a second connection. SocketProvider is the only thing that
// calls setSocket() — everyone else just calls getSocket() to send.
let socket: WebSocket | null = null;

export function setSocket(s: WebSocket | null): void {
  socket = s;
}

export function getSocket(): WebSocket | null {
  return socket;
}
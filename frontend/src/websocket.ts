let socket: WebSocket | null = null;

export function connectSocket(
  onTranscript: (text: string, isFinal: boolean) => void
) {
  socket = new WebSocket('ws://localhost:4000');

  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === 'transcript') {
      onTranscript(msg.text, msg.isFinal);
    }
  };
}

export function sendPCM(buffer: ArrayBuffer) {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(buffer);
  }
}
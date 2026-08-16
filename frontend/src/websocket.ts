let socket: WebSocket | null = null;

export function connectSocket(
  onTranscript: (text: string, isFinal: boolean) => void
) {
  const configuredUrl = import.meta.env.VITE_VOICE_WS_URL;
  const defaultProtocol =
    window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = new URL(
    configuredUrl ?? `${defaultProtocol}//${window.location.hostname}:4000`
  );
  socket = new WebSocket(url);

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

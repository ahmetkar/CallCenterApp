import { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import './App.css';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

interface WsMessage {
  type: string;
  text?: string;
  sessionId?: string;
}

export default function App() {
  const [isRecording, setIsRecording] =
    useState(false);
  const [isProcessing, setIsProcessing] =
    useState(false);
  const [duration, setDuration] =
    useState(0);
  const [level, setLevel] = useState(0);

  const processorRef =
    useRef<ScriptProcessorNode | null>(
      null
    );

  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const wsRef = useRef<WebSocket | null>(
    null
  );
  const streamRef =
    useRef<MediaStream | null>(null);
  const audioContextRef =
    useRef<AudioContext | null>(null);

  const timerRef =
    useRef<number | null>(null);
  const chatRef =
    useRef<HTMLDivElement | null>(null);

  const currentAudio =
    useRef<HTMLAudioElement | null>(
      null
    );

  const audioQueue =
    useRef<ArrayBuffer[]>([]);

  const isPlaying = useRef(false);

  const stopCurrentAudio = () => {
    audioQueue.current = [];

    if (currentAudio.current) {
      currentAudio.current.pause();
      currentAudio.current.currentTime = 0;
      currentAudio.current = null;
    }

    isPlaying.current = false;
  };

  const playNext = () => {
    if (isPlaying.current) return;

    const next =
      audioQueue.current.shift();

    if (!next) return;

    isPlaying.current = true;

    const blob = new Blob([next], {
      type: 'audio/ogg',
    });

    const url =
      URL.createObjectURL(blob);

    const audio = new Audio(url);

    currentAudio.current = audio;

    audio.onended = () => {
      URL.revokeObjectURL(url);
      isPlaying.current = false;
      currentAudio.current = null;
      playNext();
    };

    audio.onerror = () => {
      URL.revokeObjectURL(url);
      isPlaying.current = false;
      currentAudio.current = null;
      playNext();
    };

    audio.play().catch(() => {
      URL.revokeObjectURL(url);
      isPlaying.current = false;
      currentAudio.current = null;
      playNext();
    });
  };

  useEffect(() => {
    const ws = new WebSocket(
      'ws://localhost:4000'
    );

    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      console.log('WS connected');
    };

    ws.onmessage = (event) => {
      if (
        event.data instanceof ArrayBuffer
      ) {
        audioQueue.current.push(
          event.data
        );

        if (!isPlaying.current) {
          playNext();
        }

        return;
      }

      const msg = JSON.parse(
        event.data
      ) as WsMessage;

      switch (msg.type) {
        case 'user':
          setMessages((prev) => [
            ...prev,
            {
              role: 'user',
              text: msg.text || '',
            },
          ]);
          break;

        case 'assistant':
          stopCurrentAudio();

          setIsProcessing(false);

          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              text: msg.text || '',
            },
          ]);
          break;

        case 'session':
          if (msg.sessionId) {
            localStorage.setItem(
              'voice_session',
              msg.sessionId
            );
          }
          break;

        case 'audio_end':
          setIsProcessing(false);
          break;

        case 'session_complete':
          setIsProcessing(false);
          break;
      }
    };

    wsRef.current = ws;

    return () => {
      stopCurrentAudio();
      ws.close();
    };
  }, []);

  useEffect(() => {
    chatRef.current?.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  const startRecording =
    async () => {
      audioQueue.current = [];
      isPlaying.current = false;

      if (isRecording) return;

      stopCurrentAudio();

      if (
        !wsRef.current ||
        wsRef.current.readyState !==
          WebSocket.OPEN
      ) {
        alert(
          'WebSocket bağlantısı hazır değil'
        );
        return;
      }

      try {
        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              audio: true,
            }
          );

        streamRef.current = stream;

        const audioContext =
          new AudioContext({
            sampleRate: 48000,
          });

        audioContextRef.current =
          audioContext;

        const source =
          audioContext.createMediaStreamSource(
            stream
          );

        const processor =
          audioContext.createScriptProcessor(
            4096,
            1,
            1
          );

        processorRef.current =
          processor;

        processor.onaudioprocess = (
          event
        ) => {
          const input =
            event.inputBuffer.getChannelData(
              0
            );

          let sum = 0;

          for (
            let i = 0;
            i < input.length;
            i++
          ) {
            sum +=
              input[i] *
              input[i];
          }

          const rms = Math.sqrt(
            sum / input.length
          );

          setLevel(
            Math.min(1, rms * 4)
          );

          if (
            wsRef.current
              ?.readyState ===
            WebSocket.OPEN
          ) {
            const copy =
              new Float32Array(
                input
              );

            wsRef.current.send(
              copy.buffer
            );
          }
        };

        source.connect(processor);
        processor.connect(
          audioContext.destination
        );

        let d = 0;

        timerRef.current =
          window.setInterval(() => {
            d++;
            setDuration(d);
          }, 1000);

        setIsRecording(true);
        setIsProcessing(false);
      } catch (err) {
        console.error(
          'Recording error',
          err
        );
      }
    };

  const stopRecording =
    async () => {
      if (!isRecording) return;

      processorRef.current?.disconnect();
      processorRef.current = null;

      streamRef.current
        ?.getTracks()
        .forEach((track) =>
          track.stop()
        );

      streamRef.current = null;

      if (
        audioContextRef.current
      ) {
        await audioContextRef.current.close();

        audioContextRef.current =
          null;
      }

      if (timerRef.current) {
        clearInterval(
          timerRef.current
        );

        timerRef.current =
          null;
      }

      setDuration(0);
      setLevel(0);
      setIsRecording(false);
      setIsProcessing(true);

      if (
        wsRef.current
          ?.readyState ===
        WebSocket.OPEN
      ) {
        wsRef.current.send(
          JSON.stringify({
            type: 'stop',
          })
        );
      }
    };

  const toggleRecording =
    async () => {
      if (isRecording) {
        await stopRecording();
      } else {
        await startRecording();
      }
    };

  return (
    <div className="container">
      <div className="card mic-card">
        <h1>Türkçe Voice Agent</h1>

        <div className="mic-wrapper">
          <button
            className={`mic-button ${
              isRecording
                ? 'recording'
                : ''
            }`}
            onClick={
              toggleRecording
            }
          >
            {isRecording ? (
              <Square
                size={36}
              />
            ) : (
              <Mic
                size={36}
              />
            )}
          </button>
        </div>

        <div className="status">
          <span
            className={`dot ${
              isRecording
                ? 'active'
                : ''
            }`}
          />

          {isRecording
            ? 'Dinleniyor...'
            : 'Mikrofon kapalı'}
        </div>

        <div className="timer">
          {String(
            Math.floor(
              duration / 60
            )
          ).padStart(2, '0')}
          :
          {String(
            duration % 60
          ).padStart(2, '0')}
        </div>

        <div className="level-bar">
          <div
            className="level-fill"
            style={{
              width: `${level * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="card chat-card">
        <div className="chat-header">
          Sohbet
        </div>

        <div
          ref={chatRef}
          className="chat-window"
        >
          {messages.map(
            (m, i) => (
              <div
                key={i}
                className={`bubble ${m.role}`}
              >
                {m.text}
              </div>
            )
          )}

          {isProcessing && (
            <div className="bubble assistant loading">
              Düşünüyorum...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


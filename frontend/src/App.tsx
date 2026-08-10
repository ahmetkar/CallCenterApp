import { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import './App.css';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [level, setLevel] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([
  {
    role: 'assistant',
    text: 'Merhaba, size nasıl yardımcı olabilirim?',
  },
]);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);

  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const audioQueue = useRef<string[]>([]);
  const isPlaying = useRef(false);

  const playNext = () => {
    if (isPlaying.current) return;

    const next = audioQueue.current.shift();
    if (!next) return;

    isPlaying.current = true;

    const audio = new Audio(`data:audio/wav;base64,${next}`);

    audio.onended = () => {
      isPlaying.current = false;
      playNext();
    };

    audio.play().catch(() => {
      isPlaying.current = false;
      playNext();
    });
  };

 
useEffect(() => {
  const audio = new Audio('/welcome.wav');
  audio.play().catch(() => {
    // Tarayıcı autoplay engelleyebilir
  });
}, []);

  useEffect(() => {
    chatRef.current?.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  const startRecording = async () => {
    if (isRecording) return;

    setIsRecording(true);
    setIsProcessing(false);

    const ws = new WebSocket('ws://localhost:4000');
    ws.binaryType = 'arraybuffer';

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case 'user':
          setMessages((prev) => [
            ...prev,
            { role: 'user', text: msg.text },
          ]);
          break;

        case 'assistant':
          setIsProcessing(false);
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', text: msg.text },
          ]);
          break;

        case 'assistant_audio_chunk':
          audioQueue.current.push(msg.audio);
          playNext();
          break;

        case 'session_complete':
          ws.close();
          wsRef.current = null;
          break;
      }
    };

    await new Promise<void>((resolve) => {
      ws.onopen = () => resolve();
    });

    wsRef.current = ws;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 48000,
      },
    });

    streamRef.current = stream;

        // Ses seviyesi analizi
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;

    const source = audioContext.createMediaStreamSource(stream);

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;

    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);

    const updateLevel = () => {
      analyser.getByteFrequencyData(data);

      let sum = 0;

      for (let i = 0; i < data.length; i++) {
        sum += data[i];
      }

      const avg = sum / data.length;
      setLevel(avg / 255);

      animationRef.current =
        requestAnimationFrame(updateLevel);
    };

    updateLevel();

    // MediaRecorder
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
    });

    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = async (event) => {
      if (!event.data.size) return;

      if (
        wsRef.current &&
        wsRef.current.readyState === WebSocket.OPEN
      ) {
        const buffer = await event.data.arrayBuffer();
        wsRef.current.send(buffer);
      }
    };

    mediaRecorder.start(250);

    setDuration(0);

    timerRef.current = window.setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);
  };

  const stopRecording = async () => {
    if (!isRecording) return;

    setIsRecording(false);
    setIsProcessing(true);

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) =>
      track.stop()
    );
    streamRef.current = null;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setDuration(0);
    setLevel(0);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'stop',
        })
      );
    }
  };

  const toggleRecording = async () => {
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
          className={`mic-button ${isRecording ? 'recording' : ''}`}
          onClick={toggleRecording}
        >
          {isRecording ? <Square size={36} /> : <Mic size={36} />}
        </button>
      </div>

        <div className="status">
          <span
            className={`dot ${
              isRecording ? 'active' : ''
            }`}
          />
          {isRecording
            ? 'Dinleniyor...'
            : 'Mikrofon kapalı'}
        </div>

        <div className="timer">
          {String(Math.floor(duration / 60)).padStart(
            2,
            '0'
          )}
          :
          {String(duration % 60).padStart(2, '0')}
        </div>

        <div className="level-bar">
          <div
            className="level-fill"
            style={{ width: `${level * 100}%` }}
          />
        </div>
      </div>

      <div className="card chat-card">
        <div className="chat-header">
          Sohbet
        </div>

        <div ref={chatRef} className="chat-window">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`bubble ${message.role}`}
            >
              {message.text}
            </div>
          ))}

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
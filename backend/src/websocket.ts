import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { DeepgramService } from './services/deepgram.service';
import { GeminiService } from './services/gemini.service';
import { TtsService } from './services/tts.service';

export function setupWebSocket(server: HttpServer): void {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (client: WebSocket) => {
    console.log('New recording session');

    const deepgram = new DeepgramService();
    const gemini = new GeminiService();
    const tts = new TtsService();

    const webmChunks: Buffer[] = [];

    client.on('message', async (raw, isBinary) => {
      try {
        if (isBinary) {
          webmChunks.push(Buffer.from(raw as Buffer));
          return;
        }

        const message = JSON.parse(raw.toString());

        if (message.type !== 'stop') return;

        console.log(
          `Received ${webmChunks.length} webm chunks`
        );

        const webmBuffer = Buffer.concat(webmChunks);

        const transcript =
          await deepgram.transcribeWebm(webmBuffer);

        client.send(
          JSON.stringify({
            type: 'user',
            text: transcript,
          })
        );

        const ai = await gemini.processMessage(transcript);

        client.send(
          JSON.stringify({
            type: 'assistant',
            text: ai.text,
          })
        );

        const audioChunks = await tts.synthesizeChunks(
          ai.text
        );

        for (let i = 0; i < audioChunks.length; i++) {
          client.send(
            JSON.stringify({
              type: 'assistant_audio_chunk',
              audio: audioChunks[i],
              index: i,
              isLast: i === audioChunks.length - 1,
            })
          );
        }

        client.send(
          JSON.stringify({
            type: 'session_complete',
          })
        );

        client.close();
      } catch (err) {
        console.error(err);
      }
    });

    client.on('close', () => {
      console.log('Session closed');
    });
  });
}
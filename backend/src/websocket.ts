import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { AudioProcessor } from './helpers/audio.processor';
import { DeepgramService } from './services/deepgram.service';
import { GeminiService } from './services/gemini.service';
import { TtsService } from './services/tts.service';

export function setupWebSocket(
  server: HttpServer
): void {
  const wss = new WebSocketServer({ server });

  wss.on(
    'connection',
    (client: WebSocket) => {
      console.log('New recording session');

      const audioProcessor =
        new AudioProcessor();
      const deepgram = new DeepgramService();
      const gemini = new GeminiService();
      const tts = new TtsService();

      client.on(
        'message',
        async (raw, isBinary) => {
          try {
            // Float32 PCM frame
            if (isBinary) {
                const buffer = Buffer.from(raw as Buffer);

                // Buffer -> Float32Array (4096 sample)
                const float32 = new Float32Array(
                  buffer.buffer,
                  buffer.byteOffset,
                  Math.floor(buffer.byteLength / 4)
                );

                audioProcessor.addFrame(float32);

                return;
              }
            const message = JSON.parse(
              raw.toString()
            );

            if (message.type !== 'stop') return;

            // Backend'de PCM oluştur
            const pcm =
              audioProcessor.getPCMBuffer();

                          console.log(
              'PCM size:',
              pcm.length
            );

            audioProcessor.reset();

            const transcript =
              await deepgram.transcribePCM(
                pcm
              );

            client.send(
              JSON.stringify({
                type: 'user',
                text: transcript,
              })
            );

            const ai =
              await gemini.processMessage(
                transcript
              );

            client.send(
              JSON.stringify({
                type: 'assistant',
                text: ai.text,
              })
            );

            const audioChunks =
              await tts.synthesizeChunks(
                ai.text
              );

            for (
              let i = 0;
              i < audioChunks.length;
              i++
            ) {
              client.send(
                JSON.stringify({
                  type: 'assistant_audio_chunk',
                  audio: audioChunks[i],
                  index: i,
                  isLast:
                    i === audioChunks.length - 1,
                })
              );
            }

            client.send(
              JSON.stringify({
                type: 'session_complete',
              })
            );
          } catch (err) {
            console.error(err);

            client.send(
              JSON.stringify({
                type: 'assistant',
                text: 'Bir hata oluştu.',
              })
            );
          }
        }
      );

      client.on('close', () => {
        console.log('Session closed');
        gemini.resetConversation();
      });
    }
  );
}
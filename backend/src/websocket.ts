import { randomUUID } from 'crypto';
import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

import { AudioProcessor } from './helpers/audio.processor';
import { DeepgramService } from './services/deepgram.service';
import { SessionManager } from './services/gemini.service';
import { TtsService } from './services/tts.service';

const sessionManager = new SessionManager();

export function setupWebSocket(
  server: HttpServer
): void {
  const wss = new WebSocketServer({
    server,
  });

  wss.on(
    'connection',
    (client: WebSocket) => {
      console.log(
        'New recording session'
      );

      const sessionId =
        randomUUID();

      const gemini =
        sessionManager.getSession(
          sessionId
        );

      const audioProcessor =
        new AudioProcessor();

      const deepgram =
        new DeepgramService();

      const tts =
        new TtsService();

      client.send(
        JSON.stringify({
          type: 'session',
          sessionId,
        })
      );

      client.on(
        'message',
        async (raw, isBinary) => {
          try {
            if (isBinary) {
              const buffer =
                Buffer.from(
                  raw as Buffer
                );

              const float32 =
                new Float32Array(
                  buffer.buffer,
                  buffer.byteOffset,
                  Math.floor(
                    buffer.byteLength /
                      4
                  )
                );

              audioProcessor.addFrame(
                float32
              );

              return;
            }

            const message =
              JSON.parse(
                raw.toString()
              );

            if (
              message.type !==
              'stop'
            ) {
              return;
            }

            const pcm =
              audioProcessor.getPCMBuffer();

            audioProcessor.reset();

            console.log(
              'PCM size:',
              pcm.length
            );

            if (
              pcm.length === 0
            ) {
              client.send(
                JSON.stringify({
                  type: 'assistant',
                  text: 'Ses algılanamadı. Lütfen tekrar konuşur musunuz?',
                })
              );

              return;
            }

            let transcript =
              '';

            try {
              transcript =
                await deepgram.transcribePCM(
                  pcm
                );
            } catch (err) {
              console.error(
                'Deepgram error:',
                err
              );

              client.send(
                JSON.stringify({
                  type: 'assistant',
                  text: 'Sesinizi anlayamadım. Lütfen tekrar konuşur musunuz?',
                })
              );

              return;
            }

            if (
              !transcript ||
              transcript.trim()
                .length ===
                0
            ) {
              client.send(
                JSON.stringify({
                  type: 'assistant',
                  text: 'Sesinizi anlayamadım. Lütfen tekrar konuşur musunuz?',
                })
              );

              return;
            }

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
              i <
              audioChunks.length;
              i++
            ) {
              client.send(
                JSON.stringify({
                  type: 'assistant_audio_chunk',
                  audio: audioChunks[i],
                  index: i,
                  isLast:
                    i ===
                    audioChunks.length -
                      1,
                })
              );
            }

            client.send(
              JSON.stringify({
                type: 'session_complete',
              })
            );
          } catch (err) {
            console.error(
              'WebSocket error:',
              err
            );

            client.send(
              JSON.stringify({
                type: 'assistant',
                text: 'Bir hata oluştu. Lütfen tekrar deneyin.',
              })
            );
          }
        }
      );

      client.on(
        'close',
        () => {
          console.log(
            'Session closed:',
            sessionId
          );
        }
      );
    }
  );

  setInterval(() => {
    sessionManager.cleanupIdleSessions(
      30
    );
  }, 5 * 60 * 1000);
}
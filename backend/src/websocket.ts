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
    async (client: WebSocket) => {
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

      try {
        
        const welcome =
                await gemini.startConversation();

              client.send(
                JSON.stringify({
                  type: 'assistant',
                  text: welcome.text,
                })
              );

              let index = 0;

              for await (const chunk of tts.synthesizeStream(
                welcome.text
              )) {
                client.send(chunk, {
                  binary: true,
                });

                index++;
              }

              client.send(
                JSON.stringify({
                  type: 'audio_end',
                })
              );

        client.send(
          JSON.stringify({
            type: 'session_complete',
          })
        );
      } catch (err) {
        console.error(
          'Welcome error:',
          err
        );
      }

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

            let index = 0;

            for await (const chunk of tts.synthesizeStream(
              ai.text
            )) {
              client.send(chunk, {
                binary: true,
              });

              index++;
            }

            client.send(
              JSON.stringify({
                type: 'audio_end',
              })
            );

            client.send(
              JSON.stringify({
                type: 'session_complete',
              })
            );
          } catch (err: any) {
            console.error(
              'WebSocket error:',
              err
            );

            let message =
              'Bir hata oluştu. Lütfen tekrar deneyin.';

            if (
              err?.status ===
              429
            ) {
              message =
                'Sistem şu anda yoğun. Lütfen birkaç saniye sonra tekrar deneyin.';
            }

            client.send(
              JSON.stringify({
                type: 'assistant',
                text: message,
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
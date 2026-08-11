import { randomUUID } from 'crypto';
import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

import { SessionManager } from './services/gemini.service';
import { createPipeline } from './pipelines/pipeline-factory';

const sessionManager = new SessionManager();

const voiceTarget =
  process.env.VOICE_TARGET ||
  'frontend';

export function setupWebSocket(
  server: HttpServer
): void {
  const wss = new WebSocketServer({
    server,
  });

  wss.on(
    'connection',
    async (
      client: WebSocket
    ) => {
      console.log(
        'New session'
      );

      const sessionId =
        randomUUID();

      const gemini =
        sessionManager.getSession(
          sessionId
        );

      const pipeline =
        createPipeline({
          client,
          gemini,
          voiceTarget,
        });

      client.send(
        JSON.stringify({
          type: 'session',
          sessionId,
        })
      );

      try {
        await pipeline.start();
      } catch (err) {
        console.error(
          'Pipeline start error:',
          err
        );
      }

      client.on(
        'message',
        async (
          raw,
          isBinary
        ) => {
          try {
            await pipeline.handleMessage(
              Buffer.from(
                raw as Buffer
              ),
              isBinary
            );
          } catch (err) {
            console.error(
              'Pipeline error:',
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
        async () => {
          console.log(
            'Session closed:',
            sessionId
          );

          await pipeline.close();

          sessionManager.removeSession(
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
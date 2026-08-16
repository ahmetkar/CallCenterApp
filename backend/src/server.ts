import 'dotenv/config';

import express from 'express';
import http from 'http';

import {
  WebSocketServer,
  WebSocket,
} from 'ws';

import { TwilioController } from './controllers/twilio.controller';

import { GeminiService } from './services/gemini.service';
import { CloudPipeline } from './pipelines/cloud-pipeline';

import {
  mulawToPcm16,
} from './integrations/telephony/twilio-audio';


export async function startServer() {
  const app =
    express();


  /* =====================================================
     HTTP BODY PARSERS
  ===================================================== */

  app.use(
    express.urlencoded({
      extended: false,
    })
  );

  app.use(
    express.json()
  );


  /* =====================================================
     HTTP SERVER
  ===================================================== */

  const server =
    http.createServer(
      app
    );


  /* =====================================================
     CONTROLLERS
  ===================================================== */

  const twilioController =
    new TwilioController();


  /* =====================================================
     TWILIO INCOMING CALL
  ===================================================== */

  app.post(
    '/twilio/incoming',
    (
      req,
      res
    ) =>
      twilioController
        .incomingCall(
          req,
          res
        )
  );


  /* =====================================================
     TWILIO OUTBOUND CALL
  ===================================================== */

  app.post(
    '/twilio/outbound',
    (
      req,
      res
    ) =>
      twilioController
        .outboundCall(
          req,
          res
        )
  );



  app.post(
  '/twilio/stream-status',
  (req, res) =>
    twilioController.streamStatus(
      req,
      res
    )
);

  /* =====================================================
     TWILIO STREAM STATUS
  ===================================================== */

  /**
   * Twilio Media Stream'in durumunu
   * görmek için kullanılır.
   *
   * Örneğin:
   *
   * stream-started
   * stream-stopped
   * stream-error
   */

  app.post(
    '/twilio/stream-status',
    (
      req,
      res
    ) => {

      console.log(
        '========================================'
      );

      console.log(
        'TWILIO STREAM STATUS'
      );

      console.log(
        JSON.stringify(
          req.body,
          null,
          2
        )
      );

      console.log(
        '========================================'
      );

      res.sendStatus(200);
    }
  );


  /* =====================================================
     WEBSOCKET SERVER
  ===================================================== */

  const wss =
    new WebSocketServer({
      server,
      path:
        '/twilio/media',
    });


  console.log(
    'WebSocket server initialized:',
    '/twilio/media'
  );


  /* =====================================================
     WEBSOCKET CONNECTION
  ===================================================== */

  wss.on(
    'connection',
    async (
      socket: WebSocket,
      request
    ) => {

      console.log(
        '========================================'
      );

      console.log(
        '🔥 TWILIO WEBSOCKET CONNECTED'
      );

      console.log(
        'WebSocket URL:',
        request.url
      );

      console.log(
        '========================================'
      );


      /* =================================================
         GEMINI + PIPELINE
      ================================================= */

      const gemini =
        new GeminiService();

      const pipeline =
        new CloudPipeline(
          socket,
          gemini
        );


      /* =================================================
         STATE
      ================================================= */

      let streamSid:
        string | null = null;

      let pipelineStarted =
        false;


      /* =================================================
         START PIPELINE
      ================================================= */

      const startPipeline =
        async () => {

          if (
            pipelineStarted
          ) {
            return;
          }

          pipelineStarted =
            true;

          try {

            console.log(
              'Starting CloudPipeline...'
            );

            await pipeline.start();

            console.log(
              'CloudPipeline started'
            );

          } catch (err) {

            console.error(
              'Cloud pipeline start error:',
              err
            );

            pipelineStarted =
              false;

            if (
              socket.readyState ===
              WebSocket.OPEN
            ) {
              socket.close();
            }
          }
        };


      /* =================================================
         PIPELINE → TWILIO
      ================================================= */

      /**
       * TTS tarafından oluşturulan audio
       * Twilio Media Stream'e gönderilir.
       *
       * Beklenen format:
       *
       * μ-law
       * 8000 Hz
       * mono
       */

      pipeline
        .getTransport()
        .onAudio(
          (
            mulaw: Buffer
          ) => {

            if (
              !streamSid
            ) {

              console.warn(
                'No Twilio streamSid yet'
              );

              return;
            }


            if (
              socket.readyState !==
              WebSocket.OPEN
            ) {
              return;
            }


            const payload =
              mulaw.toString(
                'base64'
              );


            socket.send(
              JSON.stringify({
                event:
                  'media',

                streamSid,

                media: {
                  payload,
                },
              })
            );
          }
        );


      /* =================================================
         TWILIO → SERVER
      ================================================= */

      socket.on(
        'message',
        async (
          data
        ) => {

          try {

            const message =
              JSON.parse(
                data.toString()
              );


            console.log(
              'Twilio event:',
              message.event
            );


            switch (
              message.event
            ) {


              /* =========================================
                 CONNECTED
              ========================================= */

              case 'connected':

                console.log(
                  'Twilio stream connected event'
                );

                break;


              /* =========================================
                 START
              ========================================= */

              case 'start': {

                streamSid =
                  message
                    .start
                    ?.streamSid ??
                  message
                    .streamSid ??
                  null;


                console.log(
                  '========================================'
                );

                console.log(
                  'Twilio stream started'
                );

                console.log(
                  'Stream SID:',
                  streamSid
                );

                console.log(
                  'Call SID:',
                  message
                    .start
                    ?.callSid
                );

                console.log(
                  'Account SID:',
                  message
                    .start
                    ?.accountSid
                );

                console.log(
                  'Audio format:',
                  message
                    .start
                    ?.mediaFormat
                );

                console.log(
                  '========================================'
                );


                /**
                 * ÖNEMLİ:
                 *
                 * Pipeline artık WebSocket
                 * bağlantısında değil,
                 *
                 * Twilio'nun "start"
                 * eventinden sonra başlıyor.
                 */

                await startPipeline();

                break;
              }


              /* =========================================
                 MEDIA
              ========================================= */

              case 'media': {

                /**
                 * Sadece telefondan gelen
                 * inbound sesi işliyoruz.
                 */

                if (
                  message.media
                    ?.track !==
                  'inbound'
                ) {
                  break;
                }


                if (
                  !message.media
                    ?.payload
                ) {
                  break;
                }


                /**
                 * Twilio:
                 *
                 * Base64
                 *     ↓
                 * μ-law / 8000 Hz
                 *     ↓
                 * PCM16
                 */

                const mulaw =
                  Buffer.from(
                    message.media
                      .payload,
                    'base64'
                  );


                const pcm =
                  mulawToPcm16(
                    mulaw
                  );


                /**
                 * Pipeline'a ses gönder.
                 */

                if (
                  pipelineStarted
                ) {

                  await pipeline
                    .receiveAudio(
                      pcm
                    );

                } else {

                  console.warn(
                    'Received audio before pipeline started'
                  );
                }

                break;
              }


              /* =========================================
                 STOP
              ========================================= */

              case 'stop': {

                console.log(
                  '========================================'
                );

                console.log(
                  'Twilio Media Stream stopped'
                );

                console.log(
                  'Stream SID:',
                  streamSid
                );

                console.log(
                  '========================================'
                );


                try {

                  await pipeline
                    .stopConversation();

                } catch (err) {

                  console.error(
                    'Pipeline stop error:',
                    err
                  );
                }

                break;
              }


              /* =========================================
                 DTMF
              ========================================= */

              case 'dtmf':

                console.log(
                  'DTMF:',
                  message.dtmf
                );

                break;


              /* =========================================
                 MARK
              ========================================= */

              case 'mark':

                console.log(
                  'Twilio mark:',
                  message.mark
                );

                break;


              /* =========================================
                 UNKNOWN
              ========================================= */

              default:

                console.log(
                  'Unknown Twilio event:',
                  message.event
                );

                break;
            }

          } catch (err) {

            console.error(
              'Twilio WebSocket message error:',
              err
            );
          }
        }
      );


      /* =================================================
         WEBSOCKET CLOSE
      ================================================= */

      socket.on(
        'close',
        async (
          code,
          reason
        ) => {

          console.log(
            '========================================'
          );

          console.log(
            'Twilio Media Stream closed'
          );

          console.log(
            'Close code:',
            code
          );

          console.log(
            'Close reason:',
            reason.toString()
          );

          console.log(
            '========================================'
          );


          try {

            await pipeline.close();

          } catch (err) {

            console.error(
              'Pipeline close error:',
              err
            );
          }
        }
      );


      /* =================================================
         WEBSOCKET ERROR
      ================================================= */

      socket.on(
        'error',
        async (
          error
        ) => {

          console.error(
            '========================================'
          );

          console.error(
            'Twilio WebSocket error:',
            error
          );

          console.error(
            '========================================'
          );


          try {

            await pipeline.close();

          } catch (err) {

            console.error(
              'Pipeline close error:',
              err
            );
          }
        }
      );
    }
  );


  /* =====================================================
     SERVER ERROR
  ===================================================== */

  server.on(
    'error',
    error => {

      console.error(
        'HTTP server error:',
        error
      );
    }
  );


  /* =====================================================
     START SERVER
  ===================================================== */

  const port =
    Number(
      process.env.PORT ??
      4000
    );


  server.listen(
    port,
    () => {

      console.log(
        `Server running on port ${port}`
      );

      console.log(
        `Twilio WebSocket: ws://localhost:${port}/twilio/media`
      );

      console.log(
        `Twilio incoming: http://localhost:${port}/twilio/incoming`
      );
    }
  );
}
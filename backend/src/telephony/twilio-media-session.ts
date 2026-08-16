import {
  WebSocket,
} from 'ws';

import {
  CloudPipeline,
} from '../pipelines/cloud-pipeline';

import {
  GeminiService,
} from '../services/gemini.service';

export class TwilioMediaSession {
  private pipeline:
    CloudPipeline;

  private streamSid?: string;

  constructor(
    private socket: WebSocket,
    private gemini: GeminiService
  ) {
    /*
     * TTS çıktısını Twilio'ya
     * göndereceğiz.
     */
    this.pipeline =
      new CloudPipeline(
        null,
        this.gemini,
        (pcm: Buffer) => {
          this.sendAudio(
            pcm
          );
        }
      );
  }

  async start() {
    await this.pipeline.start();

    this.socket.on(
      'message',
      async data => {
        await this.handleMessage(
          data.toString()
        );
      }
    );

    this.socket.on(
      'close',
      async () => {
        await this.pipeline.close();
      }
    );
  }

  private async handleMessage(
    raw: string
  ) {
    const message =
      JSON.parse(raw);

    switch (
      message.event
    ) {
      case 'start':
        this.streamSid =
          message.start
            ?.streamSid;

        break;

      case 'media':
        await this.handleMedia(
          message
        );

        break;

      case 'stop':
        await this.pipeline.close();

        break;
    }
  }

  private async handleMedia(
    message: any
  ) {
    const payload =
      message.media?.payload;

    if (!payload) {
      return;
    }

    /*
     * Twilio:
     *
     * Base64 μ-law
     *
     * Burada PCM'e çevrilmesi gerekiyor.
     */
    const pcm =
      this.decodeMuLaw(
        payload
      );

    await this.pipeline
      .sendAudio(pcm);
  }

  private sendAudio(
    pcm: Buffer
  ) {
    if (
      !this.streamSid
    ) {
      return;
    }

    /*
     * PCM -> μ-law
     * μ-law -> Base64
     *
     * dönüşümü burada yapılacak.
     */

    const payload =
      this.encodeMuLaw(
        pcm
      );

    this.socket.send(
      JSON.stringify({
        event: 'media',
        streamSid:
          this.streamSid,
        media: {
          payload,
        },
      })
    );
  }

  private decodeMuLaw(
    payload: string
  ): Buffer {
    /*
     * Twilio μ-law decoder
     *
     * TTS/Deepgram sample-rate
     * uyumuna göre burada
     * dönüştürme yapılmalı.
     */

    return Buffer.from(
      payload,
      'base64'
    );
  }

  private encodeMuLaw(
    pcm: Buffer
  ): string {
    /*
     * Gerçek μ-law encoding
     * burada yapılmalı.
     */

    return pcm.toString(
      'base64'
    );
  }
}
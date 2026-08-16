import { TtsService } from './tts.service';

import {
  pcm16ToMulaw,
} from '../integrations/telephony/twilio-audio';

export interface VoiceTransport {
  send(
    text: string
  ): Promise<void>;

  stop?(): Promise<void>;

  close?(): Promise<void>;
}


/* =====================================================
   FRONTEND TRANSPORT
===================================================== */

export class FrontendVoiceTransport
  implements VoiceTransport
{
  private currentRequest = 0;

  constructor(
    private client: any,
    private tts: TtsService
  ) {}

  async send(
    text: string
  ): Promise<void> {
    const requestId =
      ++this.currentRequest;

    for await (
      const chunk of
      this.tts.synthesizeStream(
        text
      )
    ) {
      if (
        requestId !==
        this.currentRequest
      ) {
        return;
      }

      const arrayBuffer =
        chunk.buffer.slice(
          chunk.byteOffset,
          chunk.byteOffset +
            chunk.byteLength
        ) as ArrayBuffer;

      this.client.send(
        arrayBuffer
      );
    }

    if (
      requestId ===
      this.currentRequest
    ) {
      this.client.send(
        JSON.stringify({
          type:
            'audio_end',
        })
      );
    }
  }

  async stop(): Promise<void> {
    this.currentRequest++;

    this.client.send(
      JSON.stringify({
        type:
          'audio_stop',
      })
    );
  }

  async close(): Promise<void> {
    await this.stop();
  }
}


/* =====================================================
   CLOUD / TWILIO TRANSPORT
===================================================== */

export class CloudVoiceTransport
  implements VoiceTransport
{
  private currentRequest = 0;

  private audioCallback?: (
    pcm: Buffer
  ) => void;

  constructor(
    private tts: TtsService
  ) {}

  onAudio(
    callback: (
      pcm: Buffer
    ) => void
  ): void {
    this.audioCallback =
      callback;
  }

  async send(
    text: string
  ): Promise<void> {
    const requestId =
      ++this.currentRequest;

    /**
     * Buradan TTS'den PCM16 geliyor.
     */
    const pcm =
      await this.tts
        .synthesizeForCloud(
          text
        );

    if (
      requestId !==
      this.currentRequest
    ) {
      return;
    }

    /**
     * PCM16
     *
     * ↓
     *
     * μ-law
     */
    const mulaw =
      pcm16ToMulaw(
        pcm
      );

    if (
      requestId ===
      this.currentRequest
    ) {
      this.audioCallback?.(
        mulaw
      );
    }
  }

  async stop(): Promise<void> {
    this.currentRequest++;
  }

  async close(): Promise<void> {
    await this.stop();
  }
}
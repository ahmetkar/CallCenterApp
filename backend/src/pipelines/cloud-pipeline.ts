import { WebSocket } from 'ws';

import { DeepgramService } from '../services/deepgram.service';
import { GeminiService } from '../services/gemini.service';
import { TtsService } from '../services/tts.service';
import { CloudVoiceTransport } from '../services/voice-transport';
import { VoicePipeline } from './voice-pipeline';

export class CloudPipeline
  implements VoicePipeline
{
  private deepgram =
    new DeepgramService();

  private tts =
    new TtsService();

  private transport: CloudVoiceTransport;

  constructor(
    private client: WebSocket,
    private gemini: GeminiService
  ) {
    this.transport =
      new CloudVoiceTransport(
        this.tts
      );

    this.transport.onAudio(
      async (
        pcm: Buffer
      ) => {
        await this.processPcm(
          pcm
        );
      }
    );
  }

  async start(): Promise<void> {
    const welcome =
      await this.gemini.startConversation();

    this.client.send(
      JSON.stringify({
        type: 'assistant',
        text: welcome.text,
      })
    );

    await this.transport.send(
      welcome.text
    );

    this.client.send(
      JSON.stringify({
        type: 'session_complete',
      })
    );
  }

  async handleMessage(
    raw: Buffer,
    isBinary: boolean
  ): Promise<void> {
    // Cloud modunda frontend'den ses beklenmiyor.
    // Bu metod sadece kontrol mesajları için kullanılabilir.
    if (isBinary) {
      return;
    }

    try {
      const message =
        JSON.parse(
          raw.toString()
        );

      // İleride:
      // start-call
      // end-call
      // dtmf
      // transfer
      // vb. mesajlar burada işlenebilir.

      if (
        message.type ===
        'ping'
      ) {
        this.client.send(
          JSON.stringify({
            type: 'pong',
          })
        );
      }
    } catch {
      // JSON değilse görmezden gel.
    }
  }

  private async processPcm(
    pcm: Buffer
  ): Promise<void> {
    if (
      pcm.length ===
      0
    ) {
      return;
    }

    const transcript =
      await this.deepgram.transcribePCM(
        pcm
      );

    if (
      !transcript
    ) {
      return;
    }

    this.client.send(
      JSON.stringify({
        type: 'user',
        text: transcript,
      })
    );

    const ai =
      await this.gemini.processMessage(
        transcript
      );

    this.client.send(
      JSON.stringify({
        type: 'assistant',
        text: ai.text,
      })
    );

    await this.transport.send(
      ai.text
    );

    this.client.send(
      JSON.stringify({
        type: 'session_complete',
      })
    );
  }

  getTransport() {
    return this.transport;
  }

  async close(): Promise<void> {
    await this.transport.close?.();
  }
}
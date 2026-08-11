import { WebSocket } from 'ws';

import { AudioProcessor } from '../helpers/audio.processor';
import { DeepgramService } from '../services/deepgram.service';
import { GeminiService } from '../services/gemini.service';
import { TtsService } from '../services/tts.service';
import { FrontendVoiceTransport } from '../services/voice-transport';
import { VoicePipeline } from './voice-pipeline';

export class FrontendPipeline
  implements VoicePipeline
{
  private audioProcessor =
    new AudioProcessor();

  private deepgram =
    new DeepgramService();

  private tts =
    new TtsService();

  private transport: FrontendVoiceTransport;

  constructor(
    private client: WebSocket,
    private gemini: GeminiService
  ) {
    this.transport =
      new FrontendVoiceTransport(
        client,
        this.tts
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
    if (isBinary) {
      const float32 =
        new Float32Array(
          raw.buffer,
          raw.byteOffset,
          Math.floor(
            raw.byteLength /
              4
          )
        );

      this.audioProcessor.addFrame(
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
      this.audioProcessor.getPCMBuffer();

    this.audioProcessor.reset();

    await this.processPcm(
      pcm
    );
  }

  private async processPcm(
    pcm: Buffer
  ): Promise<void> {
    if (
      pcm.length ===
      0
    ) {
      this.client.send(
        JSON.stringify({
          type: 'assistant',
          text: 'Ses algılanamadı. Lütfen tekrar konuşur musunuz?',
        })
      );

      return;
    }

    const transcript =
      await this.deepgram.transcribePCM(
        pcm
      );

    if (
      !transcript
    ) {
      this.client.send(
        JSON.stringify({
          type: 'assistant',
          text: 'Sesinizi anlayamadım. Lütfen tekrar konuşur musunuz?',
        })
      );

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

  async close(): Promise<void> {
    await this.transport.close?.();
  }
}
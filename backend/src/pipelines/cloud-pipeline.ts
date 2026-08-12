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

  private processing = false;

  private transcriptQueue: string[] = [];

  private transcriptBuffer: string[] = [];

  private speechTimer: NodeJS.Timeout | null =
    null;

  constructor(
    private client: WebSocket,
    private gemini: GeminiService
  ) {
    this.transport =
      new CloudVoiceTransport(
        this.tts
      );

    this.transport.onAudio(
      (pcm: Buffer) => {
        void this.deepgram.sendAudio(
          pcm
        );
      }
    );

    this.deepgram.onTranscript(
      (
        transcript,
        speechFinal
      ) => {
        this.handleTranscriptEvent(
          transcript,
          speechFinal
        );
      }
    );
  }

  async start(): Promise<void> {
    await this.deepgram.connect();

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
      return;
    }

    try {
      const message = JSON.parse(
        raw.toString()
      );

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

      if (
        message.type ===
        'stop'
      ) {
        if (this.speechTimer) {
          clearTimeout(
            this.speechTimer
          );
          this.speechTimer = null;
        }

        await this.deepgram.finishUtterance();

        await new Promise(resolve =>
          setTimeout(resolve, 150)
        );

        this.flushTranscriptBuffer();
      }
    } catch {
      // ignore
    }
  }

  private handleTranscriptEvent(
    transcript: string,
    speechFinal: boolean
  ): void {
    this.transcriptBuffer.push(
      transcript
    );

    if (this.speechTimer) {
      clearTimeout(
        this.speechTimer
      );
      this.speechTimer = null;
    }

    if (speechFinal) {
      this.flushTranscriptBuffer();
      return;
    }

    this.speechTimer =
      setTimeout(() => {
        this.flushTranscriptBuffer();
      }, 500);
  }

  private flushTranscriptBuffer(): void {
    if (
      this.transcriptBuffer.length ===
      0
    ) {
      return;
    }

    const text =
      this.transcriptBuffer.join(
        ' '
      );

    this.transcriptBuffer = [];

    this.enqueueTranscript(
      text
    );
  }

  private enqueueTranscript(
    transcript: string
  ): void {
    this.transcriptQueue.push(
      transcript
    );

    void this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (
      this.processing
    ) {
      return;
    }

    this.processing = true;

    try {
      while (
        this.transcriptQueue.length >
        0
      ) {
        const transcript =
          this.transcriptQueue.shift()!;

        console.log(
          'Cloud transcript:',
          transcript
        );

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

        // TTS arka planda çalışsın
        void this.transport
          .send(ai.text)
          .catch(console.error);

        this.client.send(
          JSON.stringify({
            type: 'session_complete',
          })
        );
      }
    } catch (err) {
      console.error(
        'Cloud pipeline error:',
        err
      );
    } finally {
      this.processing = false;
    }
  }

  getTransport() {
    return this.transport;
  }

  async close(): Promise<void> {
    if (this.speechTimer) {
      clearTimeout(
        this.speechTimer
      );
    }

    await this.deepgram.close();
    await this.transport.close?.();
  }
}


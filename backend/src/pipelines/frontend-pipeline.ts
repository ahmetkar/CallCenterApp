import { WebSocket as NodeWebSocket } from 'ws';
import { DeepgramService } from '../services/deepgram.service';
import { GeminiService } from '../services/gemini.service';
import { TtsService } from '../services/tts.service';
import { FrontendVoiceTransport } from '../services/voice-transport';
import { VoicePipeline } from './voice-pipeline';

export class FrontendPipeline
  implements VoicePipeline
{
  private deepgram =
    new DeepgramService();

  private tts =
    new TtsService();

  private transport: FrontendVoiceTransport;

  private processing = false;

  private transcriptQueue: string[] = [];

  private transcriptBuffer: string[] = [];

  private speechTimer: NodeJS.Timeout | null =
    null;

  private currentResponseId = 0;

  constructor(
    private client: NodeWebSocket,
    private gemini: GeminiService
  ) {
    this.transport =
      new FrontendVoiceTransport(
        client,
        this.tts
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
      await this.deepgram.sendAudio(
        raw
      );
      return;
    }

    const message = JSON.parse(
      raw.toString()
    );

    if (message.type === 'stop') {
      await this.interrupt();
      return;
    }
  }

  private async interrupt() {
    this.currentResponseId++;

    this.transcriptQueue = [];
    this.transcriptBuffer = [];

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

    await this.transport.stop?.();

    this.client.send(
      JSON.stringify({
        type: 'session_complete',
      })
    );
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

        const responseId =
          ++this.currentResponseId;

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

        if (
          responseId !==
          this.currentResponseId
        ) {
          continue;
        }

        this.client.send(
          JSON.stringify({
            type: 'assistant',
            text: ai.text,
          })
        );

        await this.transport.send(
          ai.text
        );

        if (
          responseId !==
          this.currentResponseId
        ) {
          continue;
        }

        this.client.send(
          JSON.stringify({
            type: 'session_complete',
          })
        );
      }
    } catch (err) {
      console.error(
        'Pipeline error:',
        err
      );
    } finally {
      this.processing = false;
    }
  }

  async close(): Promise<void> {
    this.currentResponseId++;

    if (this.speechTimer) {
      clearTimeout(
        this.speechTimer
      );
    }

    await this.deepgram.close();
    await this.transport.close?.();
  }
}
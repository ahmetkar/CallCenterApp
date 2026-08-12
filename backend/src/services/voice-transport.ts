import type { WebSocket as NodeWebSocket } from 'ws';
import { TtsService } from "./tts.service";

export class FrontendVoiceTransport {
  private currentRequest = 0;

  constructor(
    private client: NodeWebSocket,
    private tts: TtsService
  ) {}

  async send(text: string): Promise<void> {
  const requestId = ++this.currentRequest;

  for await (const chunk of this.tts.synthesizeStream(text)) {
    if (requestId !== this.currentRequest) {
      return;
    }

    const arrayBuffer = chunk.buffer.slice(
        chunk.byteOffset,
        chunk.byteOffset + chunk.byteLength
      ) as ArrayBuffer;


    this.client.send(
      arrayBuffer
    );
  }

  if (requestId === this.currentRequest) {
    this.client.send(
      JSON.stringify({
        type: 'audio_end',
      })
    );
  }
}

  close() {
    this.currentRequest++;
  }
}

export class CloudVoiceTransport {
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
  ) {
    this.audioCallback = callback;
  }

  async send(text: string): Promise<void> {
    const pcm =
      await this.tts.synthesizeForCloud(text);

    this.audioCallback?.(pcm);
  }

  close() {}
}
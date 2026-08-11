import { WebSocket } from 'ws';
import { TtsService } from './tts.service';

export interface VoiceTransport {
  send(text: string): Promise<void>;

  onAudio?(
    callback: (
      pcm: Buffer
    ) => Promise<void>
  ): void;

  close?(): Promise<void>;
}

export class FrontendVoiceTransport
  implements VoiceTransport
{
  constructor(
    private client: WebSocket,
    private tts: TtsService
  ) {}

  async send(
    text: string
  ): Promise<void> {
    for await (const chunk of this.tts.synthesizeStream(
      text
    )) {
      this.client.send(chunk, {
        binary: true,
      });
    }

    this.client.send(
      JSON.stringify({
        type: 'audio_end',
      })
    );
  }

  async close(): Promise<void> {
    // Frontend tarafında kapatılacak ekstra bir kaynak yok.
  }
}

export class CloudVoiceTransport
  implements VoiceTransport
{
  private audioCallback?: (
    pcm: Buffer
  ) => Promise<void>;

  constructor(
    private tts: TtsService
  ) {}

  async send(
    text: string
  ): Promise<void> {
    const pcm =
      await this.tts.synthesizeForCloud(
        text
      );

    await this.sendAudioToCloud(
      pcm
    );
  }

  onAudio(
    callback: (
      pcm: Buffer
    ) => Promise<void>
  ): void {
    this.audioCallback =
      callback;
  }

  async receiveFromCloud(
    pcm: Buffer
  ): Promise<void> {
    if (
      this.audioCallback
    ) {
      await this.audioCallback(
        pcm
      );
    }
  }

  private async sendAudioToCloud(
    pcm: Buffer
  ): Promise<void> {
    // TODO:
    // Buraya gerçek cloud santral adapter'i gelecek.
    // Örnek:
    // await twilioAdapter.sendAudio(pcm);
    // await amazonConnectAdapter.sendAudio(pcm);
    // await asteriskAdapter.sendAudio(pcm);

    console.log(
      'Cloud audio sent:',
      pcm.length,
      'bytes'
    );
  }

  async close(): Promise<void> {
    // TODO:
    // Santral bağlantısını kapat.
  }
}
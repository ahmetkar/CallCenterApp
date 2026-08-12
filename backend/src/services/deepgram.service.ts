import WebSocket from 'ws';

type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'closing';

export class DeepgramService {
  private ws: WebSocket | null = null;

  private state: ConnectionState =
    'disconnected';

  private connectPromise:
    | Promise<void>
    | null = null;

  private transcriptCallback?: (
    text: string,
    speechFinal: boolean
  ) => void;

  onTranscript(
    callback: (
      text: string,
      speechFinal: boolean
    ) => void
  ): void {
    this.transcriptCallback =
      callback;
  }

  async connect(): Promise<void> {
    if (this.state === 'connected') {
      return;
    }

    if (
      this.state === 'connecting' &&
      this.connectPromise
    ) {
      return this.connectPromise;
    }

    this.state = 'connecting';

    this.connectPromise =
      new Promise<void>(
        (resolve, reject) => {
          const url =
            'wss://api.deepgram.com/v1/listen?' +
            'model=nova-3' +
            '&language=tr' +
            '&encoding=linear16' +
            '&sample_rate=16000' +
            '&punctuate=true' +
            '&smart_format=true'+
            '&endpointing=300';

          const ws = new WebSocket(url, {
            headers: {
              Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
            },
          });

          this.ws = ws;

          ws.once('open', () => {
            this.state = 'connected';
            resolve();
          });

          ws.once('error', err => {
            this.state =
              'disconnected';
            this.ws = null;
            reject(err);
          });

          ws.on('message', data => {
            try {
              const msg = JSON.parse(
                data.toString()
              );

              if (!msg.is_final) {
                return;
              }

              const text =
                msg.channel
                  ?.alternatives?.[0]
                  ?.transcript;

              if (
                text &&
                text.trim()
              ) {
                console.log(
                  'DG FINAL:',
                  text
                );

                this.transcriptCallback?.(
                  text.trim(),
                  msg.speech_final ===
                    true
                );
              }
            } catch (err) {
              console.error(
                'Deepgram parse error:',
                err
              );
            }
          });

          ws.on('close', () => {
            this.state =
              'disconnected';
            this.ws = null;
          });
        });

    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  }

  async sendAudio(
    chunk: Buffer
  ): Promise<void> {
    if (
      this.state !== 'connected'
    ) {
      await this.connect();
    }

    this.ws?.send(chunk);
  }

  async finishUtterance(): Promise<void> {
    if (
      !this.ws ||
      this.state !== 'connected'
    ) {
      return;
    }

    this.state = 'closing';

    await new Promise<void>(
      resolve => {
        const ws = this.ws!;

        ws.once('close', () => {
          this.state =
            'disconnected';
          this.ws = null;
          resolve();
        });

        ws.send(
          JSON.stringify({
            type: 'CloseStream',
          })
        );
      });
  }

  async close(): Promise<void> {
    if (!this.ws) {
      return;
    }

    await new Promise<void>(
      resolve => {
        this.ws!.once(
          'close',
          () => resolve()
        );

        this.ws!.close();
      });

    this.state =
      'disconnected';
    this.ws = null;
  }
}


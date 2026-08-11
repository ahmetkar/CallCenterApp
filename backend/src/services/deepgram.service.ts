import WebSocket from 'ws';

export class DeepgramService {
  async transcribePCM(
    pcm: Buffer
  ): Promise<string> {
    if (pcm.length === 0) {
      return '';
    }

    return this.sendToDeepgram(pcm);
  }

  private sendToDeepgram(
    pcm: Buffer
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(
        'wss://api.deepgram.com/v1/listen?model=nova-3&language=tr&encoding=linear16&sample_rate=16000&punctuate=true',
        {
          headers: {
            Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
          },
        }
      );

      let result = '';

      ws.on('open', () => {
        ws.send(pcm);
        ws.send(
          JSON.stringify({
            type: 'CloseStream',
          })
        );
      });

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(
            data.toString()
          );

          const text =
            msg.channel?.alternatives?.[0]
              ?.transcript;

          if (text && msg.is_final) {
            result += text + ' ';
          }
        } catch (err) {
          console.error(
            'Deepgram parse error:',
            err
          );
        }
      });

      ws.on('close', () => {
        resolve(result.trim());
      });

      ws.on('error', reject);
    });
  }
}
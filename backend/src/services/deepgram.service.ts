import WebSocket from 'ws';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';

export class DeepgramService {
  async transcribeWebm(webmBuffer: Buffer): Promise<string> {
    const dir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'voice-')
    );

    const input = path.join(dir, 'input.webm');
    const output = path.join(dir, 'output.pcm');

    await fs.writeFile(input, webmBuffer);

    await this.convertToPCM(input, output);

    const pcm = await fs.readFile(output);

    const transcript = await this.sendToDeepgram(pcm);

    await fs.rm(dir, { recursive: true, force: true });

    return transcript;
  }

  private convertToPCM(
    input: string,
    output: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn(ffmpegPath as string, [
        '-y',
        '-i',
        input,
        '-ac',
        '1',
        '-ar',
        '16000',
        '-f',
        's16le',
        output,
      ]);

      ffmpeg.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg exited: ${code}`));
      });

      ffmpeg.on('error', reject);
    });
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
        ws.send(JSON.stringify({ type: 'CloseStream' }));
      });

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());

        const text =
          msg.channel?.alternatives?.[0]?.transcript;

        if (text && msg.is_final) {
          result += text + ' ';
        }
      });

      ws.on('close', () => {
        resolve(result.trim());
      });

      ws.on('error', reject);
    });
  }
}
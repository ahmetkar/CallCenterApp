import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { Readable, PassThrough } from 'stream';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export class AudioProcessor {
  private chunks: Buffer[] = [];

  addFrame(chunk: Buffer): void {
    if (chunk.length === 0) {
      return;
    }

    this.chunks.push(Buffer.from(chunk));
  }

  reset(): void {
    this.chunks = [];
  }

  getPCMBuffer(): Buffer {
    if (this.chunks.length === 0) {
      return Buffer.alloc(0);
    }

    return Buffer.concat(this.chunks);
  }

  async convertOggToPcm(
    oggBuffer: Buffer
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const input = new Readable({
        read() {},
      });

      input.push(oggBuffer);
      input.push(null);

      const output = new PassThrough();
      const chunks: Buffer[] = [];

      output.on('data', chunk => {
        chunks.push(Buffer.from(chunk));
      });

      output.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      output.on('error', reject);

      ffmpeg(input)
        .inputFormat('ogg')
        .audioCodec('pcm_s16le')
        .audioChannels(1)
        .audioFrequency(16000)
        .format('s16le')
        .on('error', reject)
        .pipe(output, {
          end: true,
        });
    });
  }
}
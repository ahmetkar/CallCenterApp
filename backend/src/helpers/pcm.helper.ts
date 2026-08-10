import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';

export function convertToPCM(
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
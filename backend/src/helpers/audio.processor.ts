export class AudioProcessor {
  private frames: Float32Array[] = [];

    addFrame(frame: Float32Array) {
    console.log(
        'Frame samples:',
        frame.length
    );

    this.frames.push(new Float32Array(frame));
    }

  reset() {
    this.frames = [];
  }

  getPCMBuffer(): Buffer {
    if (this.frames.length === 0) {
      return Buffer.alloc(0);
    }

    // Tüm frame'leri birleştir
    const totalLength = this.frames.reduce(
      (sum, frame) => sum + frame.length,
      0
    );

    const merged = new Float32Array(totalLength);

    let offset = 0;

    for (const frame of this.frames) {
      merged.set(frame, offset);
      offset += frame.length;
    }

    // 48 kHz -> 16 kHz
    const downsampled = this.downsample(
      merged,
      48000,
      16000
    );

    // Float32 -> Int16
    const pcm = new Int16Array(
      downsampled.length
    );

    for (let i = 0; i < downsampled.length; i++) {
      const sample = Math.max(
        -1,
        Math.min(1, downsampled[i])
      );

      pcm[i] =
        sample < 0
          ? sample * 32768
          : sample * 32767;
    }

    return Buffer.from(pcm.buffer);
  }

  private downsample(
    buffer: Float32Array,
    inputRate: number,
    outputRate: number
  ): Float32Array {
    if (inputRate === outputRate) {
      return buffer;
    }

    const ratio = inputRate / outputRate;
    const newLength = Math.round(
      buffer.length / ratio
    );

    const result = new Float32Array(newLength);

    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round(
        (offsetResult + 1) * ratio
      );

      let accum = 0;
      let count = 0;

      for (
        let i = offsetBuffer;
        i < nextOffsetBuffer &&
        i < buffer.length;
        i++
      ) {
        accum += buffer[i];
        count++;
      }

      result[offsetResult] =
        count > 0 ? accum / count : 0;

      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }

    return result;
  }
}
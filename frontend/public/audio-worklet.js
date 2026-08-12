class PCM16Processor extends AudioWorkletProcessor {
  constructor() {
    super();

    this.inputRate = sampleRate;
    this.outputRate = 16000;
    this.ratio = this.inputRate / this.outputRate;

    this.buffer = [];
    this.targetSamples = 320; // 40 ms @16kHz
  }

  process(inputs) {
    const input = inputs[0];

    if (!input || input.length === 0) {
      return true;
    }

    const channel = input[0];

    if (!channel || channel.length === 0) {
      return true;
    }

    let sum = 0;

    for (let i = 0; i < channel.length; i++) {
      sum += channel[i] * channel[i];
    }

    const rms = Math.sqrt(sum / channel.length);

    const downsampled = this.downsample(channel);

    for (let i = 0; i < downsampled.length; i++) {
      this.buffer.push(downsampled[i]);
    }

    while (this.buffer.length >= this.targetSamples) {
      const chunk = new Float32Array(this.targetSamples);

      for (let i = 0; i < this.targetSamples; i++) {
        chunk[i] = this.buffer.shift();
      }

      const pcm = this.floatToPCM16(chunk);

      this.port.postMessage(
        {
          pcm: pcm.buffer,
          level: rms,
        },
        [pcm.buffer]
      );
    }

    return true;
  }

  downsample(input) {
    if (this.inputRate === this.outputRate) {
      return input;
    }

    const outputLength = Math.floor(
      input.length / this.ratio
    );

    const output = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const position = i * this.ratio;
      const index = Math.floor(position);
      const fraction = position - index;

      const s1 = input[index] ?? 0;
      const s2 = input[index + 1] ?? s1;

      output[i] = s1 + (s2 - s1) * fraction;
    }

    return output;
  }

  floatToPCM16(input) {
    const output = new Int16Array(input.length);

    for (let i = 0; i < input.length; i++) {
      let sample = Math.max(-1, Math.min(1, input[i]));

      output[i] =
        sample < 0
          ? sample * 32768
          : sample * 32767;
    }

    return output;
  }
}

registerProcessor(
  'pcm16-processor',
  PCM16Processor
);
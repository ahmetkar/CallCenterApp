/**
 * Twilio:
 *
 * μ-law / 8000 Hz / mono
 *
 * → PCM16
 */

export function mulawToPcm16(
  input: Buffer
): Buffer {
  const output =
    Buffer.alloc(
      input.length * 2
    );

  for (
    let i = 0;
    i < input.length;
    i++
  ) {
    const mu =
      ~input[i];

    const sign =
      mu & 0x80;

    const exponent =
      (mu >> 4) & 0x07;

    const mantissa =
      mu & 0x0f;

    let sample =
      ((mantissa << 3) + 132)
      << exponent;

    sample -= 132;

    if (sign) {
      sample = -sample;
    }

    output.writeInt16LE(
      sample,
      i * 2
    );
  }

  return output;
}


/**
 * PCM16
 *
 * → μ-law
 *
 * Twilio'nun beklediği
 * audio/x-mulaw formatı.
 */
export function pcm16ToMulaw(
  input: Buffer
): Buffer {
  const output =
    Buffer.alloc(
      Math.floor(
        input.length / 2
      )
    );

  for (
    let i = 0;
    i < output.length;
    i++
  ) {
    const sample =
      input.readInt16LE(
        i * 2
      );

    output[i] =
      linearToMulaw(
        sample
      );
  }

  return output;
}


function linearToMulaw(
  sample: number
): number {
  const BIAS = 0x84;
  const CLIP = 32635;

  let sign = 0;

  if (sample < 0) {
    sign = 0x80;
    sample = -sample;
  }

  if (sample > CLIP) {
    sample = CLIP;
  }

  sample += BIAS;

  let exponent = 7;

  for (
    let mask = 0x4000;
    (sample & mask) === 0 &&
    exponent > 0;
    mask >>= 1
  ) {
    exponent--;
  }

  const mantissa =
    (sample >>
      (exponent + 3)) &
    0x0f;

  return (
    ~(
      sign |
      (exponent << 4) |
      mantissa
    )
  ) & 0xff;
}
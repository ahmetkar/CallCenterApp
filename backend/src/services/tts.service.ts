import textToSpeech from '@google-cloud/text-to-speech';

const client = new textToSpeech.TextToSpeechClient({
  projectId:
    process.env.GOOGLE_CLOUD_PROJECT,
});

export class TtsService {
  private splitIntoSentences(
    text: string
  ): string[] {
    return text
      .split(
        /(?<=[.!?])\s+/
      )
      .map((s) => s.trim())
      .filter(
        (s) => s.length > 0
      );
  }

  private async synthesizeOgg(
    sentence: string
  ): Promise<Buffer> {
    const [response] =
      await client.synthesizeSpeech({
        input: {
          ssml: `<speak>${sentence}</speak>`,
        },
        voice: {
          languageCode:
            'tr-TR',
          name: 'tr-TR-Standard-A',
        },
        audioConfig: {
          audioEncoding:
            'OGG_OPUS',
          sampleRateHertz: 16000,
          speakingRate: 1.35,
          pitch: 0.8,
          volumeGainDb: 1.7,
        },
      });

    return Buffer.from(
      response.audioContent as Uint8Array
    );
  }

  async *synthesizeStream(
    text: string
  ): AsyncGenerator<
    Buffer,
    void,
    unknown
  > {
    const sentences =
      this.splitIntoSentences(
        text
      );

    for (const sentence of sentences) {
      try {
        yield await this.synthesizeOgg(
          sentence
        );
      } catch (err) {
        console.error(
          'Google TTS OGG error:',
          err
        );
      }
    }
  }

  async synthesizeForCloud(
    text: string
  ): Promise<Buffer> {
    const [response] =
      await client.synthesizeSpeech({
        input: {
          ssml: `<speak>${text}</speak>`,
        },
        voice: {
          languageCode:
            'tr-TR',
          name: 'tr-TR-Standard-A',
        },
        audioConfig: {
          audioEncoding:
            'LINEAR16',
          sampleRateHertz: 16000,
          speakingRate: 1.16,
          pitch: 0.4,
          volumeGainDb: 1.0,
        },
      });

    return Buffer.from(
      response.audioContent as Uint8Array
    );
  }

}

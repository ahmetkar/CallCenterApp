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

  private async synthesizeSentence(
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
          speakingRate: 1.3,
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
        yield await this.synthesizeSentence(
          sentence
        );
      } catch (err) {
        console.error(
          'Google TTS error:',
          err
        );
      }
    }
  }
}
import textToSpeech from '@google-cloud/text-to-speech';

const client = new textToSpeech.TextToSpeechClient({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
});

export class TtsService {
  private splitIntoSentences(text: string): string[] {
    return text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  private async synthesizeSentence(
    sentence: string
  ): Promise<string> {
    const [response] = await client.synthesizeSpeech({
      input: {
        ssml: `<speak>${sentence}</speak>`,
      },
      voice: {
        languageCode: 'tr-TR',
        name: 'tr-TR-Standard-A',
      },
      audioConfig: {
        audioEncoding: 'LINEAR16',
        sampleRateHertz: 16000,
        speakingRate: 1.30,
        pitch: 0.6, 
        volumeGainDb: 2.0,
      },
    });

    const wavBuffer = Buffer.from(
      response.audioContent as Uint8Array
    );

    // Frontend WAV beklediği için WAV gönderiyoruz
    return wavBuffer.toString('base64');
  }

  async synthesizeChunks(
    text: string
  ): Promise<string[]> {
    const sentences = this.splitIntoSentences(text);

    const chunks: string[] = [];

    for (const sentence of sentences) {
      try {
        const audio =
          await this.synthesizeSentence(sentence);

        chunks.push(audio);
      } catch (err) {
        console.error(
          'TTS sentence error:',
          err
        );
      }
    }

    return chunks;
  }
}
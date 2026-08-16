import twilio from 'twilio';
import dotenv from 'dotenv';
import { TelephonyAdapter } from './telephony-adapter';
dotenv.config();

export class TwilioAdapter {
  private client: ReturnType<typeof twilio>;

  readonly phoneNumber: string;

  constructor() {
    const accountSid =
      process.env.TWILIO_ACCOUNT_SID;

    const authToken =
      process.env.TWILIO_AUTH_TOKEN;

    const phoneNumber =
      process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken) {
      throw new Error(
        'Twilio credentials are missing'
      );
    }

    if (!phoneNumber) {
      throw new Error(
        'TWILIO_PHONE_NUMBER is missing'
      );
    }

    this.client = twilio(
      accountSid,
      authToken
    );

    this.phoneNumber = phoneNumber;
  }

  /**
   * Twilio gelen çağrıda bu TwiML'i çalıştırır.
   *
   * <Connect><Stream> kullanıldığı için
   * Media Stream bidirectional olur.
   */
  generateMediaStreamResponse(
    streamUrl: string
  ): string {
    return `
<Response>
  <Connect>
    <Stream
      url="wss://shawl-jaunt-jet.ngrok-free.dev/twilio/media"
      statusCallback="https://shawl-jaunt-jet.ngrok-free.dev/twilio/stream-status"
      statusCallbackMethod="POST"
    />
  </Connect>
</Response>
`.trim();
  }

  /**
   * Uygulamadan telefon araması başlatır.
   */
  async createCall(
    to: string,
    webhookUrl: string
  ) {
    return this.client.calls.create({
      to,
      from: this.phoneNumber,
      url: webhookUrl,
      method: 'POST',
    });
  }
}
export interface TelephonyAdapter {
  readonly provider: string;

  answerCall(
    callId: string
  ): Promise<string>;

  endCall(
    callId: string
  ): Promise<void>;

  generateMediaStreamResponse(
    streamUrl: string
  ): string;
}
export interface VoicePipeline {
  start(): Promise<void>;

  handleMessage(
    raw: Buffer,
    isBinary: boolean
  ): Promise<void>;

  close(): Promise<void>;
}
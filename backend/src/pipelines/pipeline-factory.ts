import { WebSocket } from 'ws';

import { GeminiService } from '../services/gemini.service';
import { FrontendPipeline } from './frontend-pipeline';
import { CloudPipeline } from './cloud-pipeline';
import { VoicePipeline } from './voice-pipeline';

interface CreatePipelineOptions {
  client: WebSocket;
  gemini: GeminiService;
  voiceTarget: string;
}

export function createPipeline({
  client,
  gemini,
  voiceTarget,
}: CreatePipelineOptions): VoicePipeline {
  switch (voiceTarget) {
    case 'cloud':
      return new CloudPipeline(
        client,
        gemini
      );

    case 'frontend':
    default:
      return new FrontendPipeline(
        client,
        gemini
      );
  }
}
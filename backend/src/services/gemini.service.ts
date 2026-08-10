import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenAI } from '@google/genai';
import { executeTool, toolDefinitions } from './tools';

const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT!,
  location: process.env.GOOGLE_CLOUD_LOCATION || 'global',
});


const systemPrompt = `
Sen profesyonel bir Türkçe sipariş asistanısın.

Kurallar:
- Kısa ve net konuş.
- Aynı anda yalnızca tek soru sor.
- createOrder fonksiyonunu eksik bilgiyle çağırma.
- Gerekli bilgiler: ürün adı, adet, müşteri adı ve sipariş addrresi.
- Eksik bilgi varsa kullanıcıyla konuşmaya devam et.
- Ürün veya sipariş bilgisi uydurma.
- Konu dışına çıkma
`;


export class GeminiService {
  private chat = ai.chats.create({
    model: 'gemini-3.5-flash-lite',
    config: {
      systemInstruction:systemPrompt,
      tools: [
        {
          functionDeclarations: toolDefinitions,
        },
      ],
    },
  });

  async processMessage(text: string): Promise<{ text: string }> {
    if (!text.trim()) {
      return {
        text: 'Sizi duyamadım. Tekrar eder misiniz?',
      };
    }

    let response = await this.chat.sendMessage({
      message: text,
    });

    const functionCalls = response.functionCalls;

    if (functionCalls && functionCalls.length > 0) {
      const functionCall = functionCalls[0];

      if (!functionCall.name) {
        throw new Error('Function call name is missing');
      }

      const result = await executeTool(
        functionCall.name,
        functionCall.args || {}
      );

      response = await this.chat.sendMessage({
        message: {
          functionResponse: {
            name: functionCall.name,
            response: result,
          },
        },
      });
    }

    return {
      text:
        response.text ||
        'İşlem tamamlandı. Başka nasıl yardımcı olabilirim?',
    };
  }
}
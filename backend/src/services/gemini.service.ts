import dotenv from 'dotenv';
dotenv.config();

import {
  GoogleGenAI,
  Content,
  FunctionCall,
} from '@google/genai';
import { executeTool, toolDefinitions } from './tools';

const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT!,
  location:
    process.env.GOOGLE_CLOUD_LOCATION || 'global',
});

const baseSystemPrompt = `
Sen profesyonel bir Türkçe sipariş asistanısın.

Kurallar:

- Aynı anda yalnızca tek soru sor.
- createOrder fonksiyonunu eksik bilgiyle çağırma.
- Gerekli bilgiler: ürün adı, adet, müşteri adı ve sipariş adresi.
- Eksik bilgi varsa kullanıcıyla konuşmaya devam et.
- Daha önce kullanıcı tarafından verilen bilgileri tekrar sorma.
- Toplanan bilgileri kullan.
- Ürün veya sipariş bilgisi uydurma.
- Konu dışına çıkma.
`;

interface ConversationState {
  product?: string;
  quantity?: number;
  customerName?: string;
  address?: string;
}

interface OrderArgs {
  product?: string;
  quantity?: number;
  customerName?: string;
  address?: string;
}

function getOrderArgs(
  args: unknown
): OrderArgs {
  return (args ?? {}) as OrderArgs;
}

export class GeminiService {
  private history: Content[] = [];

  private state: ConversationState = {};

  private buildSystemPrompt(): string {
    return `
${baseSystemPrompt}

Konuşma durumu:

Ürün: ${this.state.product ?? 'yok'}
Adet: ${this.state.quantity ?? 'yok'}
Müşteri adı: ${
      this.state.customerName ?? 'yok'
    }
Adres: ${this.state.address ?? 'yok'}

Bu bilgiler mevcut konuşma boyunca toplanmıştır.
Bu bilgiler varsa tekrar sorma.
Eksik olan tek bilgiyi sor.
`;
  }

  private async generate() {
    return ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: this.history,
      config: {
        systemInstruction:
          this.buildSystemPrompt(),
        tools: [
          {
            functionDeclarations:
              toolDefinitions,
          },
        ],
      },
    });
  }

  async processMessage(
    text: string
  ): Promise<{ text: string }> {
    if (!text.trim()) {
      return {
        text: 'Sizi duyamadım. Tekrar eder misiniz?',
      };
    }

    // Kullanıcı mesajını history'ye ekle
    this.history.push({
      role: 'user',
      parts: [{ text }],
    });

    let response = await this.generate();

    const functionCalls = response.functionCalls;

    if (
      functionCalls &&
      functionCalls.length > 0
    ) {
      const functionCall: FunctionCall =
        functionCalls[0];

      if (!functionCall.name) {
        throw new Error(
          'Function call name is missing'
        );
      }

      const args = getOrderArgs(
        functionCall.args
      );

      // State'i güncelle
      if (functionCall.name === 'createOrder') {
        this.state.product =
          args.product ?? this.state.product;

        this.state.quantity =
          typeof args.quantity === 'number'
            ? args.quantity
            : this.state.quantity;

        this.state.customerName =
          args.customerName ??
          this.state.customerName;

        this.state.address =
          args.address ?? this.state.address;
      }

      // En önemli değişiklik:
      // Modelin ORİJİNAL content'ini ekliyoruz.
      // thought_signature korunuyor.
      const candidate =
        response.candidates?.[0];

      if (candidate?.content) {
        this.history.push(candidate.content);
      }

      const result = await executeTool(
        functionCall.name,
        args
      );

      // Tool sonucunu history'ye ekle
      this.history.push({
        role: 'user',
        parts: [
          {
            functionResponse: {
              name: functionCall.name,
              response: result,
            },
          },
        ],
      });

      response = await this.generate();
    }

    const answer =
      response.text ||
      'İşlem tamamlandı. Başka nasıl yardımcı olabilirim?';

    // Model cevabını history'ye ekle
    this.history.push({
      role: 'model',
      parts: [{ text: answer }],
    });

    return {
      text: answer,
    };
  }

  resetConversation() {
    this.history = [];
    this.state = {};
  }
}
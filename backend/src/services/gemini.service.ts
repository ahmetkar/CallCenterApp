import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenAI, Content } from '@google/genai';
import { executeTool, toolDefinitions } from './tools';


const toFunctionOutput = (
  result: any
) => {
  if (Array.isArray(result)) {
    return { items: result };
  }

  if (
    result === null ||
    result === undefined
  ) {
    return {};
  }

  if (
    typeof result !==
    'object'
  ) {
    return { value: result };
  }

  return result;
}

const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT!,
  location: process.env.GOOGLE_CLOUD_LOCATION || 'global',
});

const baseSystemPrompt = `
Sen profesyonel bir Türkçe sipariş ve kargo asistanısın.

Kurallar:

- Aynı anda yalnızca tek soru sor.
- Sipariş oluşturmak için gerekli bilgiler:
  - ürün adı
  - adet
  - müşteri adı
  - teslimat adresi
- Eksik bilgi varsa sadece eksik olanı sor.
- Daha önce verilen bilgileri tekrar sorma.
- Ürün ve sipariş bilgilerini sadece tool'lardan al.
- Bilgi uydurma.
- Kısa ve doğal konuş.
- Sipariş oluşturulduktan sonra sipariş numarası ve takip numarasını kullanıcıya söyle.
- Tool sonucu success=false ise message alanındaki bilgiyi kullanıcıya doğal Türkçe ile ilet.
- Teknik hata detaylarını (SQL, exception, stack trace vb.) kullanıcıya gösterme.
- Ürün bulunamazsa kullanıcıdan farklı bir ürün adı istemeyi öner.
- Stok yetersizse daha düşük adet önermeyi düşün.
- Kargo veya sipariş bulunamazsa kullanıcıdan sipariş numarasını doğrulamasını iste.
`;

export interface ConversationState {
  productId?: number;
  productName?: string;
  quantity?: number;
  customerId?: number;
  customerName?: string;
  address?: string;
  lastOrderId?: number;
  lastTrackingNumber?: string;
  lastIntent?:
    | 'search_product'
    | 'create_order'
    | 'order_status'
    | 'cargo_status';
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    messageCount: number;
  };
}

export class GeminiService {
  private history: Content[] = [];

  private state: ConversationState = {
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
      messageCount: 0,
    },
  };

  constructor(private sessionId: string) {}

  getState() {
    return this.state;
  }

  private touch() {
    this.state.metadata.updatedAt = new Date();
    this.state.metadata.messageCount++;
  }

  private buildSystemPrompt(): string {
    return `
${baseSystemPrompt}

Session: ${this.sessionId}

Konuşma durumu:

Ürün: ${this.state.productName ?? 'yok'}
Adet: ${this.state.quantity ?? 'yok'}
Müşteri: ${this.state.customerName ?? 'yok'}
Adres: ${this.state.address ?? 'yok'}
Son sipariş: ${this.state.lastOrderId ?? 'yok'}
Son takip numarası: ${this.state.lastTrackingNumber ?? 'yok'}

Bu bilgiler mevcut konuşmada toplandı.
Bu bilgiler varsa tekrar sorma.

`;
  }

  private async generate() {
    return ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: this.history,
      config: {
        systemInstruction: this.buildSystemPrompt(),
        tools: [
          {
            functionDeclarations: toolDefinitions,
          },
        ],
      },
    });
  }

  private updateState(args: Record<string, any>) {
    if (args.product) {
      this.state.productName = args.product;
    }

    if (args.productName) {
      this.state.productName = args.productName;
    }

    if (typeof args.quantity === 'number') {
      this.state.quantity = args.quantity;
    }

    if (args.customerName) {
      this.state.customerName = args.customerName;
    }

    if (args.address) {
      this.state.address = args.address;
    }

    this.touch();
  }

  private updateFromToolResult(
    toolName: string,
    result: any
  ) {
    if (toolName === 'createOrder' && result?.success) {
      this.state.lastOrderId = result.orderId;
      this.state.lastTrackingNumber = result.cargoTracking;
      this.state.lastIntent = 'create_order';
    }

    if (toolName === 'searchProducts') {
      this.state.lastIntent = 'search_product';
    }

    if (toolName === 'checkOrderStatus') {
      this.state.lastIntent = 'order_status';
    }

    if (toolName === 'checkCargoStatus') {
      this.state.lastIntent = 'cargo_status';
    }

    this.touch();
  }

  async processMessage(
  text: string
): Promise<{ text: string }> {
  if (!text.trim()) {
    return {
      text: 'Sizi duyamadım. Tekrar eder misiniz?',
    };
  }

  this.history.push({
    role: 'user',
    parts: [{ text }],
  });

  this.touch();

  let response = await this.generate();

  while (
    response.functionCalls &&
    response.functionCalls.length > 0
  ) {
    const functionCall = response.functionCalls[0];

    if (!functionCall.name) {
      throw new Error(
        'Function call name is missing'
      );
    }

    const args = (functionCall.args || {}) as Record<
      string,
      any
    >;

    this.updateState(args);

    const candidate = response.candidates?.[0];

    if (candidate?.content) {
      this.history.push(candidate.content);
    }

    const result = await executeTool(
      functionCall.name,
      args
    );

    this.updateFromToolResult(
      functionCall.name,
      result
    );

    const output =
      Array.isArray(result)
        ? { items: result }
        : result ?? {};

    this.history.push({
      role: 'user',
      parts: [
        {
          functionResponse: {
            name: functionCall.name,
            response:toFunctionOutput(output),
          },
        },
      ],
    });

    response = await this.generate();
  }

  const answer =
    response.text ||
    'İşlem tamamlandı. Başka nasıl yardımcı olabilirim?';

  const finalCandidate =
    response.candidates?.[0];

  if (finalCandidate?.content) {
    this.history.push(finalCandidate.content);
  } else {
    this.history.push({
      role: 'model',
      parts: [{ text: answer }],
    });
  }

  return {
    text: answer,
  };
}

  resetConversation() {
    this.history = [];

    this.state = {
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        messageCount: 0,
      },
    };
  }
}

export class SessionManager {
  private sessions = new Map<
    string,
    GeminiService
  >();

  getSession(sessionId: string) {
    let session = this.sessions.get(sessionId);

    if (!session) {
      session = new GeminiService(sessionId);
      this.sessions.set(sessionId, session);
    }

    return session;
  }

  removeSession(sessionId: string) {
    this.sessions.delete(sessionId);
  }

  cleanupIdleSessions(maxIdleMinutes = 30) {
    const now = Date.now();

    for (const [id, session] of this.sessions) {
      const updated =
        session.getState().metadata.updatedAt.getTime();

      const idleMinutes =
        (now - updated) / 1000 / 60;

      if (idleMinutes > maxIdleMinutes) {
        this.sessions.delete(id);
      }
    }
  }
}
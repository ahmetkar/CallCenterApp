import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenAI, Content } from '@google/genai';
import { executeTool, toolDefinitions } from './tools';

const toFunctionOutput = (result: any) => {
  if (Array.isArray(result)) {
    return { items: result };
  }

  if (result === null || result === undefined) {
    return {};
  }

  if (typeof result !== 'object') {
    return { value: result };
  }

  return result;
};

const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT!,
  location: process.env.GOOGLE_CLOUD_LOCATION || 'global',
});

const baseSystemPrompt = `
Sen profesyonel bir Türkçe sipariş ve kargo asistanısın.

Konuşmayı sen başlatırsın.

İlk mesajında:

- kullanıcıyı karşıla,
- kendini sipariş asistanıı olarak tanıt,
- ürün listesi hakkında bilgi verebileceğini söyle,
- sipariş oluşturabileceğini söyle,
- kargo durumunu sorgulayabileceğini söyle,


Örnek:

Merhaba, Çağrı merkezimize hoş geldiniz.
Size ürünlerimiz hakkında bilgi verebilir, sipariş oluşturabilir ve kargo durumunuzu sorgulayabilirim.
Ne yapmamı istediğizi söylermisiniz ?

Kurallar:

- Çağrı merkezi asistanı gibi davran konuşmayı buna göre yürüt. Konuşma bitince buna göre kullanıcıyı uğurla.
- Aynı anda yalnızca tek soru sor.
- Sipariş oluşturmak için gerekli bilgiler:
  - ürün adı
  - adet
  - müşteri adı
  - teslimat adresi
- Eksik bilgi varsa sadece eksik olanı sor.
- Kullanıcı anlaşılmaz bilgiler ve saçma bilgiler,alakasız bilgiler verdiğinde o bilgiyi tekrar sor.
- Daha önce verilen bilgileri tekrar sorma.
- Ürün ve sipariş bilgilerini sadece tool'lardan al.
- Bilgi uydurma.
- Kısa ve doğal konuş.
- Verilen adres bilgisinin geçerli bir adres bilgisi olup olmadığını kontrol et.
- Sipariş oluşturmadan önce kullanıcıya aldığın bilgileri söyle ve onayını al
- Varolan tool ların sağlandığı işlem dışında bir işlem istenirse "Bu isteğinizi gerçekleştiremem" de ve "Başka isteğiniz varmı ?" diye sor.
- Tool kullanırken önceki verileri kullanıyorsan bunu kullanıcıya söyle ve onayını al
- Sipariş oluşturulduktan sonra sipariş numarası ve takip numarasını kullanıcıya söyle.
- Tool sonucu success=false ise message alanındaki bilgiyi kullanıcıya doğal Türkçe ile ilet.
- Teknik hata oluşursa hatanın detaylarını (SQL, exception, stack trace vb.) kullanıcıya gösterme. Bunun yerine "Sistemde hata oluştu geçici olarak hizmet veremiyoruz" de.
- Bir hata olduğunda kullanıcıya o bilgi ve bilgileri onaylaması için tekrar sor.
- Ürün bulunamazsa kullanıcıdan farklı bir ürün adı istemeyi öner ve kullanıcıya "İstediğiniz ürünü satmıyoruz" gibi cevap ver.
- Stok adetini direk söyleme sadece kullanıcının istediği miktardan düşük mü diye kontrol et ve buna göre tekrar ürün adeti iste.
- Stok yetersizse daha düşük adet önermeyi düşün.
- Kargo veya sipariş bulunamazsa kullanıcıdan sipariş numarasını tekrar söylemesini iste.
- Ürün listesini sayarken gereksiz karakter eklemesini yapma olabildiğince sade bir şekilde söyle.
`;

export interface ConversationState {
  productName?: string;
  quantity?: number;
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

  constructor(private sessionId: string) {
    this.history = [
      {
        role: 'model',
        parts: [
          {
            text: baseSystemPrompt,
          },
        ],
      },
      {
        role: 'model',
        parts: [
          {
            text: this.buildContextMessage(),
          },
        ],
      },
    ];
  }

  getState() {
    return this.state;
  }

  private touch() {
    this.state.metadata.updatedAt = new Date();
    this.state.metadata.messageCount++;
  }

  private buildContextMessage(): string {
    return `
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

  private refreshContext() {
    this.history[1] = {
      role: 'model',
      parts: [
        {
          text: this.buildContextMessage(),
        },
      ],
    };
  }

  async startConversation(): Promise<{
  text: string;
}> {
  return this.processMessage(
    'Konuşmayı başlat ve kullanıcıyı karşıla.'
  );
}

  private async generate(
    retries = 3
  ) {
    for (let i = 0; i < retries; i++) {
      try {
        return await ai.models.generateContent({
          model: 'gemini-3.5-flash-lite',
          contents: this.history,
          config: {
            tools: [
              {
                functionDeclarations:
                  toolDefinitions,
              },
            ],
          },
        });
      } catch (err: any) {
        if (
          err?.status === 429 &&
          i < retries - 1
        ) {
          const delay =
            Math.pow(2, i) * 1000;

          console.log(
            `Gemini 429 retry in ${delay} ms`
          );

          await new Promise((r) =>
            setTimeout(r, delay)
          );

          continue;
        }

        throw err;
      }
    }

    throw new Error(
      'Gemini retry failed'
    );
  }

  private updateState(
    args: Record<string, any>
  ) {
    if (args.product) {
      this.state.productName =
        args.product;
    }

    if (args.productName) {
      this.state.productName =
        args.productName;
    }

    if (
      typeof args.quantity ===
      'number'
    ) {
      this.state.quantity =
        args.quantity;
    }

    if (args.customerName) {
      this.state.customerName =
        args.customerName;
    }

    if (args.address) {
      this.state.address =
        args.address;
    }

    this.touch();
    this.refreshContext();
  }

  private updateFromToolResult(
    toolName: string,
    result: any
  ) {
    if (
      toolName === 'createOrder' &&
      result?.success
    ) {
      this.state.lastOrderId =
        result.orderId;
      this.state.lastTrackingNumber =
        result.cargoTracking;
      this.state.lastIntent =
        'create_order';
    }

    if (toolName === 'searchProduct') {
      this.state.lastIntent =
        'search_product';
    }

    if (
      toolName ===
      'checkOrderStatus'
    ) {
      this.state.lastIntent =
        'order_status';
    }

    if (
      toolName ===
      'checkCargoStatus'
    ) {
      this.state.lastIntent =
        'cargo_status';
    }

    this.touch();
    this.refreshContext();
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

    let response =
      await this.generate();

    while (
      response.functionCalls &&
      response.functionCalls.length > 0
    ) {
      const functionCall =
        response.functionCalls[0];

      if (!functionCall.name) {
        throw new Error(
          'Function call name is missing'
        );
      }

      const args =
        (functionCall.args ||
          {}) as Record<
          string,
          any
        >;

      this.updateState(args);

      const candidate =
        response.candidates?.[0];

      if (candidate?.content) {
        this.history.push(
          candidate.content
        );
      }

      const result =
        await executeTool(
          functionCall.name,
          args
        );

      this.updateFromToolResult(
        functionCall.name,
        result
      );

      this.history.push({
        role: 'user',
        parts: [
          {
            functionResponse: {
              name: functionCall.name,
              response:
                toFunctionOutput(
                  result
                ),
            },
          },
        ],
      });

      response =
        await this.generate();
    }

    const answer =
      response.text ||
      'İşlem tamamlandı. Başka nasıl yardımcı olabilirim?';

    const finalCandidate =
      response.candidates?.[0];

    if (finalCandidate?.content) {
      this.history.push(
        finalCandidate.content
      );
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
    this.history = [
      {
        role: 'model',
        parts: [
          {
            text: baseSystemPrompt,
          },
        ],
      },
      {
        role: 'model',
        parts: [
          {
            text: this.buildContextMessage(),
          },
        ],
      },
    ];

    this.state = {
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        messageCount: 0,
      },
    };

    this.refreshContext();
  }
}

export class SessionManager {
  private sessions =
    new Map<
      string,
      GeminiService
    >();

  getSession(
    sessionId: string
  ) {
    let session =
      this.sessions.get(
        sessionId
      );

    if (!session) {
      session =
        new GeminiService(
          sessionId
        );

      this.sessions.set(
        sessionId,
        session
      );
    }

    return session;
  }

  removeSession(
    sessionId: string
  ) {
    this.sessions.delete(
      sessionId
    );
  }

  cleanupIdleSessions(
    maxIdleMinutes = 30
  ) {
    const now =
      Date.now();

    for (const [
      id,
      session,
    ] of this.sessions) {
      const updated =
        session
          .getState()
          .metadata.updatedAt.getTime();

      const idleMinutes =
        (now - updated) /
        1000 /
        60;

      if (
        idleMinutes >
        maxIdleMinutes
      ) {
        this.sessions.delete(
          id
        );
      }
    }
  }
}
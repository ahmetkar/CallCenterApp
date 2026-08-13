
import {
  GoogleGenAI,
  Chat,
} from '@google/genai';

import {
  toolDefinitions,
  executeTool,
} from './tools';

type ConversationMessage = {
  role: 'user' | 'assistant';
  text: string;
};

export class GeminiService {
  private ai: GoogleGenAI;

  private chat: Chat | null =
    null;

  private history: ConversationMessage[] =
    [];

  constructor() {
    this.ai = new GoogleGenAI({
      apiKey:
        process.env.GEMINI_API_KEY!,
    });
  }

  private getSystemPrompt() {

    const baseSystemPrompt = `
        Sen profesyonel bir Türkçe sipariş asistanısın.
        Görevlerin

        - Müşterinin siparişini almak
        - Menü hakkında bilgi vermek
        - Ürün önermek
        - Sipariş oluşturmak
        - Sipariş durumunu açıklamak
        - Kurye ve teslimat durumunu açıklamak
        - Restoran hakkında bilgi vermek


        Kurallar:

        - Çağrı merkezi asistanı gibi davran konuşmayı buna göre yürüt. Konuşma bitince buna göre kullanıcıyı uğurla.
        - Aynı anda yalnızca tek soru sor.
        - Ürün adlarından emin değilsen önce searchProducts tool'unu kullan.
        - Sipariş durumu sorulursa checkOrderStatus tool'unu kullan.
        - Kurye durumu sorulursa checkDeliveryStatus tool'unu kullan.
        - Sipariş oluşturmak için gerekli bilgiler:
          - ürün adı(birden fazla olabilir)
          - adet(her ürün için birer tane)
          - müşteri adı ve soyadı
          - teslimat adresi
          - Sipariş notu eklemek isteyip istemediğini sor isteğe bağlı olarak sipariş notu al, eğer verilmezse not yok diye gönder toola.
        - Eksik bilgi varsa sadece eksik olanı sor.
        - Aynı anda birden fazla ürün adı ve adet bilgisi aldığında bunlar tek bir siparişe ait olsun.
        - Kullanıcı anlaşılmaz bilgiler ve saçma bilgiler,alakasız bilgiler verdiğinde o bilgiyi tekrar sor.
        - Daha önce verilen bilgileri tekrar sorma.
        - Ürün ve sipariş bilgilerini sadece tool'lardan al.
        - Bilgi uydurma.
        - Kısa ve doğal konuş.
        - Cevap verirken,menüyü anlatırken,listeyi anlatırken harf ve rakam olmayan karakter eklemesi yapma, sade ve anlaşılır cevap ver.
        - Verilen adres bilgisinin geçerli bir adres bilgisi olup olmadığını kontrol et.
        - Sipariş oluşturmadan önce kullanıcıya aldığın bilgileri özellikle ad ve soyadı ve adresi söyle ve onayını al
        - Varolan tool ların sağlandığı işlem dışında bir işlem istenirse "Bu isteğinizi gerçekleştiremem" de ve "Başka isteğiniz varmı ?" diye sor.
        - Tool kullanırken önceki verileri kullanıyorsan bunu kullanıcıya söyle ve onayını al
        - Sipariş oluşturulduktan sonra sipariş numarası ve takip numarasını kullanıcıya söyle.
        - Tool sonucu success=false ise message alanındaki bilgiyi kullanıcıya doğal Türkçe ile ilet.
        - Teknik hata oluşursa hatanın detaylarını (SQL, exception, stack trace vb.) kullanıcıya gösterme. Bunun yerine "Sistemde hata oluştu geçici olarak hizmet veremiyoruz" de.
        - Bir hata olduğunda kullanıcıya o bilgi ve bilgileri onaylaması için tekrar sor.
        - Ürün bulunamazsa kullanıcıdan farklı bir ürün adı istemeyi öner ve kullanıcıya "İstediğiniz ürünü satmıyoruz" gibi cevap ver.
        - Stok adetini direk söyleme sadece kullanıcının istediği miktardan düşük mü diye kontrol et ve buna göre tekrar ürün adeti iste.
        - Stok yetersizse daha düşük adet önermeyi düşün.
        - Teslimat veya sipariş bulunamazsa kullanıcıdan sipariş numarasını tekrar söylemesini iste.
        `;
    return baseSystemPrompt;
  }

  async startConversation() {
    this.chat =
      this.ai.chats.create({
        model:
          'gemini-3.5-flash',
        config: {
          systemInstruction:
            this.getSystemPrompt(),
          tools: [
            {
              functionDeclarations:
                toolDefinitions,
            },
          ],
        },
      });

    this.history = [];

    const welcome =
      'Merhaba, restoran sipariş asistanına hoş geldiniz. Size nasıl yardımcı olabilirim?';

    this.history.push({
      role: 'assistant',
      text: welcome,
    });

    return {
      text: welcome,
    };
  }

  private async ensureChat() {
    if (!this.chat) {
      await this.startConversation();
    }
  }

  private addMessage(
    role: 'user' | 'assistant',
    text: string
  ) {
    this.history.push({
      role,
      text,
    });

    if (
      this.history.length > 30
    ) {
      this.history =
        this.history.slice(-30);
    }
  }

  getHistory() {
    return this.history;
  }

  clearHistory() {
    this.history = [];

    this.chat = null;
  }


  async processMessage(
    text: string
  ) {
    await this.ensureChat();

    this.addMessage(
      'user',
      text
    );

    const response =
      await this.chat!.sendMessage({
        message: text,
      });

   

    const functionCalls =
  response.functionCalls ?? [];

    if (
      functionCalls.length === 0
    ) {
      const answer =
        response.text ??
        'Üzgünüm, şu anda cevap oluşturamadım.';

      this.addMessage(
        'assistant',
        answer
      );

      return {
        text: answer,
      };
    }

   const functionResponses = [];

for (const call of functionCalls) {
  const result =
    await executeTool(
      call.name!,
      call.args ?? {}
    );

  functionResponses.push({
    name: call.name!,
    response: result,
  });
}

const finalResponse =
  await this.chat!.sendMessage({
    message:
      functionResponses.map(
        item => ({
          functionResponse: {
            name: item.name,
            response:
              item.response,
          },
        })
      ),
  });

const answer =
  finalResponse.text ??
  'İşlem tamamlandı.';

this.addMessage(
  'assistant',
  answer
);

return {
  text: answer,
};
  }


}
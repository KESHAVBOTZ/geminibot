
import { editImageWithGemini } from './geminiService';

export interface TelegramUpdate {
  update_id: number;
  message?: {
    chat: { id: number };
    text?: string;
    caption?: string;
    photo?: { file_id: string }[];
  };
}

export class TelegramBotManager {
  private token: string;
  private offset: number = 0;
  private isRunning: boolean = false;
  private onLog: (msg: string, type: 'info' | 'error' | 'success') => void;

  constructor(token: string, onLog: (msg: string, type: 'info' | 'error' | 'success') => void) {
    this.token = token;
    this.onLog = onLog;
  }

  async start() {
    this.isRunning = true;
    this.onLog("Bot started. Listening for messages...", "info");
    this.poll();
  }

  stop() {
    this.isRunning = false;
    this.onLog("Bot stopped.", "info");
  }

  private async poll() {
    while (this.isRunning) {
      try {
        const response = await fetch(`https://api.telegram.org/bot${this.token}/getUpdates?offset=${this.offset}&timeout=30`);
        const data = await response.json();

        if (data.ok && data.result.length > 0) {
          for (const update of data.result) {
            this.offset = update.update_id + 1;
            await this.handleUpdate(update);
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
        if (this.isRunning) await new Promise(r => setTimeout(r, 5000));
      }
    }
  }

  private async handleUpdate(update: TelegramUpdate) {
    const msg = update.message;
    if (!msg) return;

    const chatId = msg.chat.id;

    if (msg.text === '/start') {
      await this.sendMessage(chatId, "🎨 *Welcome!* Send me an image with a caption describing the edit you want.");
      return;
    }

    if (msg.photo && msg.caption) {
      this.onLog(`Received image from Chat ID: ${chatId}`, "info");
      await this.processImage(chatId, msg.photo, msg.caption);
    } else if (msg.photo) {
      await this.sendMessage(chatId, "📸 Got the image! Now please send a *caption* with instructions on how to edit it.");
    }
  }

  private async processImage(chatId: number, photo: { file_id: string }[], prompt: string) {
    try {
      this.onLog(`Downloading image from Telegram...`, "info");
      const largestPhoto = photo[photo.length - 1];
      const fileRes = await fetch(`https://api.telegram.org/bot${this.token}/getFile?file_id=${largestPhoto.file_id}`);
      const fileData = await fileRes.json();
      
      if (!fileData.ok) throw new Error("Could not get file path");

      const fileUrl = `https://api.telegram.org/file/bot${this.token}/${fileData.result.file_path}`;
      const imgRes = await fetch(fileUrl);
      const blob = await imgRes.blob();
      
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      this.onLog(`Sending to Gemini: "${prompt}"`, "info");
      const result = await editImageWithGemini(base64, prompt);

      if (result.imageUrl) {
        this.onLog(`Gemini success! Sending back to Telegram...`, "success");
        await this.sendPhoto(chatId, result.imageUrl, "✅ *Edit complete!*");
      } else {
        await this.sendMessage(chatId, "⚠️ Gemini didn't return an image. Try a clearer instruction.");
      }
    } catch (error: any) {
      this.onLog(`Error: ${error.message}`, "error");
      await this.sendMessage(chatId, "❌ Sorry, an error occurred while processing your image.");
    }
  }

  private async sendMessage(chatId: number, text: string) {
    await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
    });
  }

  private async sendPhoto(chatId: number, base64Data: string, caption: string) {
    const blob = await (await fetch(base64Data)).blob();
    const formData = new FormData();
    formData.append('chat_id', chatId.toString());
    formData.append('photo', blob, 'edited.png');
    formData.append('caption', caption);
    formData.append('parse_mode', 'Markdown');

    await fetch(`https://api.telegram.org/bot${this.token}/sendPhoto`, {
      method: 'POST',
      body: formData
    });
  }
}

import { GoogleGenAI } from "@google/genai";
import { Message, AIModelType } from "../types";

// Initialize the client. 
// Note: In a production app, never expose the key on the client if you can avoid it, 
// but for this serverless/client-side demo, we use the env variable directly.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateAIResponse = async (
  prompt: string,
  model: AIModelType = AIModelType.GEMINI_FLASH,
  contextMessages: Message[] = []
): Promise<string> => {
  try {
    // Format context for the AI to understand the conversation history
    const historyText = contextMessages
      .slice(-10) // Only take last 10 messages to save tokens
      .map(m => `${m.userId === 'ai' ? 'AI' : 'User ' + m.userId}: ${m.content}`)
      .join('\n');

    const systemInstruction = `
      You are a helpful AI assistant integrated into a chat room. 
      The user is asking you a question directly.
      
      Here is the recent context of the chat room for reference:
      ---
      ${historyText}
      ---
      
      Answer the user's prompt politely and concisely. If the user asks to summarize, use the context provided.
      Format your response in Markdown.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
      },
    });

    return response.text || "申し訳ありません。回答を生成できませんでした。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AIサービスへの接続中にエラーが発生しました。APIキーを確認するか、しばらく待ってから再試行してください。";
  }
};

export const summarizeChat = async (messages: Message[]): Promise<string> => {
    try {
        const historyText = messages
        .map(m => `${m.userId === 'ai' ? 'AI' : 'User'}: ${m.content}`)
        .join('\n');

        const prompt = "このチャットルームの会話を要約してください。重要なポイントを箇条書きにしてください。";

        const response = await ai.models.generateContent({
            model: AIModelType.GEMINI_FLASH,
            contents: prompt + "\n\nChat Log:\n" + historyText,
        });

        return response.text || "要約を生成できませんでした。";
    } catch (error) {
        console.error("Summarization Error:", error);
        return "エラーが発生しました。";
    }
}

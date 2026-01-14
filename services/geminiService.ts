
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const API_KEY = process.env.API_KEY || "";

export const editImageWithGemini = async (
  base64Image: string,
  description: string
): Promise<{ imageUrl: string | null; text: string }> => {
  if (!API_KEY) {
    throw new Error("API Key is missing. Please ensure process.env.API_KEY is configured.");
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  // Clean base64 string
  const base64Data = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data,
            },
          },
          {
            text: description,
          },
        ],
      },
    });

    let generatedImageUrl: string | null = null;
    let generatedText = "";

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          generatedImageUrl = `data:image/png;base64,${part.inlineData.data}`;
        } else if (part.text) {
          generatedText = part.text;
        }
      }
    }

    return {
      imageUrl: generatedImageUrl,
      text: generatedText,
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

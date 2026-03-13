import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeFood(input: string | { data: string; mimeType: string }): Promise<AIAnalysisResult> {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `Você é um nutricionista profissional de IA. 
  Analise o alimento descrito ou mostrado e forneça valores nutricionais estimados.
  Seja o mais preciso possível. Se houver vários itens, forneça o total.
  Retorne os dados no formato JSON especificado.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "Nome curto do alimento" },
      calories: { type: Type.NUMBER, description: "Total de calorias em kcal" },
      protein: { type: Type.NUMBER, description: "Total de proteínas em gramas" },
      carbs: { type: Type.NUMBER, description: "Total de carboidratos em gramas" },
      fat: { type: Type.NUMBER, description: "Total de gorduras em gramas" },
      servingSize: { type: Type.STRING, description: "Tamanho estimado da porção (ex: '1 tigela média', '250g')" },
      confidence: { type: Type.NUMBER, description: "Nível de confiança entre 0 e 1" }
    },
    required: ["name", "calories", "protein", "carbs", "fat", "servingSize", "confidence"]
  };

  const contents = typeof input === 'string' 
    ? input 
    : { parts: [{ inlineData: input }, { text: "Analise este alimento e forneça informações nutricionais." }] };

  const result = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema
    }
  });

  try {
    return JSON.parse(result.text || "{}") as AIAnalysisResult;
  } catch (e) {
    console.error("Failed to parse AI response", e);
    throw new Error("Não foi possível analisar o alimento. Por favor, tente novamente.");
  }
}

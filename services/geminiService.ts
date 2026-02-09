import { GoogleGenAI } from "@google/genai";
import { ProductCategory } from "../types";

// Helper to safely get the API key
const getApiKey = (): string | undefined => {
  return process.env.API_KEY;
};

export const generateProductDescription = async (
  productName: string, 
  category: ProductCategory
): Promise<string> => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    console.warn("Gemini API Key not found. Returning generic description.");
    return `Um produto delicioso e fresco da nossa categoria de ${category}. Feito com ingredientes selecionados.`;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Using flash model for speed on descriptions
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Escreva uma descrição curta, apetitosa e vendedora (máximo 150 caracteres) para um produto chamado "${productName}" da categoria "${category}" em uma padaria gourmet. Use emojis.`,
      config: {
        thinkingConfig: { thinkingBudget: 0 }, // Speed optimization
      }
    });

    return response.text?.trim() || `Delicioso ${productName}, fresquinho para você!`;
  } catch (error) {
    console.error("Error generating description with Gemini:", error);
    return `Um produto especial da nossa categoria de ${category}. Experimente!`;
  }
};

export const suggestPrice = async (
  productName: string,
  category: ProductCategory
): Promise<number> => {
  const apiKey = getApiKey();

  if (!apiKey) return 10.00;

  try {
     const ai = new GoogleGenAI({ apiKey });
     const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Sugira um preço realista em Reais (BRL) para "${productName}" (categoria: ${category}) em uma padaria de alto padrão no Brasil. Retorne apenas o número (ex: 15.90).`,
    });
    
    const priceText = response.text?.replace(/[^\d.,]/g, '').replace(',', '.');
    return parseFloat(priceText || "10.00");
  } catch (error) {
    return 0;
  }
}
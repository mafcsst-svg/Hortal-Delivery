import { GoogleGenAI } from "@google/genai";
import { ProductCategory, Product } from "../types";

// Helper to safely get the API key
const getApiKey = (): string | undefined => {
  return process.env.API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
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
    const ai = new GoogleGenAI(apiKey);
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Escreva uma descrição curta, apetitosa e vendedora (máximo 150 caracteres) para um produto chamado "${productName}" da categoria "${category}" em uma padaria gourmet chamada Padaria Hortal. Use emojis.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim() || `Delicioso ${productName}, fresquinho para você!`;
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
    const ai = new GoogleGenAI(apiKey);
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Sugira um preço realista em Reais (BRL) para "${productName}" (categoria: ${category}) em uma padaria de alto padrão no Brasil. Retorne apenas o número (ex: 15.90).`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const priceText = text.replace(/[^\d.,]/g, '').replace(',', '.');
    return parseFloat(priceText || "10.00");
  } catch (error) {
    return 0;
  }
}

export const chatWithChefHortal = async (
  userMessage: string,
  availableProducts: Product[]
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return "Olá! Sou o Chef Hortal. Como posso ajudar com seu pedido hoje?";

  try {
    const ai = new GoogleGenAI(apiKey);
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

    const productsList = availableProducts
      .map(p => `- ${p.name} (${p.category}): ${p.description} - R$ ${p.price.toFixed(2)}`)
      .join('\n');

    const prompt = `
      Você é o "Chef Hortal", o mestre padeiro e assistente virtual da "Padaria Hortal".
      Seu objetivo é ajudar os clientes a escolherem pães, doces e lanches deliciosos.
      Seja sempre gentil, entusiasmado, use termos gastronômicos e emojis de padaria (🥖, 🥐, 🍞, 🥯, 🍰).

      Produtos disponíveis na loja agora:
      ${productsList}

      Diretrizes:
      1. Se o cliente pedir sugestão, recomende produtos da lista acima baseando-se no gosto dele.
      2. Tente fazer "cross-selling" (ex: pão combina com queijo ou café).
      3. Seja conciso (máximo 300 caracteres).
      4. Fale em Português do Brasil.
      5. Se o produto não estiver na lista, diga que não temos no momento mas sugira algo parecido.

      Mensagem do cliente: "${userMessage}"
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Error in Chef Hortal chat:", error);
    return "Desculpe, estou preparando uma fornada agora! Posso te ajudar com algo mais simples ou você pode tentar falar comigo daqui a pouco? 🥖";
  }
};
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const fashionAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    styleProfile: {
      type: Type.OBJECT,
      properties: {
        faceShape: { type: Type.STRING },
        skinTone: { type: Type.STRING },
        hairStyle: { type: Type.STRING },
        fashionAesthetic: { type: Type.STRING },
        bodyStructure: { type: Type.STRING },
        confidenceVibe: { type: Type.STRING },
        fashionScore: { type: Type.NUMBER, description: "A score from 0-100 reflecting the style consistency and confidence of the outfit." }
      },
      required: ["faceShape", "skinTone", "hairStyle", "fashionAesthetic", "bodyStructure", "confidenceVibe", "fashionScore"]
    },
    recommendations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, description: "Broad category like Streetwear, Formal, etc." },
          itemType: { type: Type.STRING },
          description: { type: Type.STRING },
          material: { type: Type.STRING, description: "Primary fabric (e.g., Linen, Corduroy, Silk)" },
          occasion: { type: Type.STRING, description: "Best suited occasion (e.g., Casual, Wedding, Office, Party)" },
          colorSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          colorPalette: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-5 hex codes for a complementary palette" },
          priceINR: { type: Type.STRING, description: "Estimated conservative price in INR (e.g. ₹2,499)" },
          priceValue: { type: Type.NUMBER, description: "Numeric value of price for filtering" },
          whySuggested: { type: Type.STRING, description: "Brief explanation of why this item suits the user's specific features and style DNA" },
          shoppingLink: { 
            type: Type.STRING, 
            description: "Direct link to a similar affordable product on Indian e-commerce (e.g. Myntra, Ajio, Amazon.in)" 
          },
          imageUrl: { type: Type.STRING, description: "URL of a relevant high-quality fashion image for this item" },
          matchScore: { type: Type.NUMBER },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["category", "itemType", "description", "material", "occasion", "whySuggested", "colorSuggestions", "colorPalette", "priceINR", "priceValue", "shoppingLink", "imageUrl", "matchScore", "tags"]
      }
    },
    overallSuggestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    }
  },
  required: ["styleProfile", "recommendations", "overallSuggestions"]
};

export async function analyzeFashionPhoto(images: string | string[], specificNeed?: string, userContext?: string) {
  const model = "gemini-3-flash-preview";
  
  const imageArray = Array.isArray(images) ? images : [images];
  
  const imageParts = imageArray.map(img => {
    const cleanBase64 = img.includes('base64,') 
      ? img.split('base64,')[1] 
      : img;
    return {
      inlineData: {
        mimeType: "image/jpeg",
        data: cleanBase64,
      },
    };
  });

  const prompt = `You are Aura AI, a high-end digital fashion publication and personal stylist website. 
  Your goal is to provide accessible yet premium style advice to users based on their uploaded photos.
  Examine their face shape, skin tone, hair, and current style across all provided images for a comprehensive profile. 
  
  ${userContext ? `User Style DNA Profile: ${userContext}\nYou must incorporate these preferences into your stylistic logic.` : ""}

  ${specificNeed ? `CRITICAL REQUIREMENT: The user is ONLY looking for recommendations for: "${specificNeed}". 
  YOU MUST ONLY PROVIDE RECOMMENDATIONS FOR "${specificNeed}". DO NOT return any other item types like t-shirts or jackets unless they are explicitly part of the "${specificNeed}" request.
  Focus 100% of your recommendations on options for this specific request while matching their style DNA.` : `Provide a full wardrobe architecture including at least 5 different categories: Streetwear, Old Money, Formal, Party, and Date night.`}
  
  For each recommended item:
  1. Provide a 'colorPalette' with 3-5 hex codes.
  2. Provide an 'affordable' 'priceINR' (e.g., ₹1,499) and a corresponding numeric 'priceValue' (e.g., 1499).
  3. Identify the 'material' (e.g., Organic Cotton, Italian Leather) and 'occasion' (e.g., Semi-Formal, Beach Party).
  4. Provide a 'whySuggested' field explaining exactly why this specific item suits their facial structure, skin tone, or existing outfit.
  5. Provide a single 'shoppingLink' to the most relevant affordable product on Indian e-commerce platforms (Myntra, Ajio, Amazon.in).
  6. Provide a high-quality 'imageUrl'. Use Unsplash source URLs that are highly descriptive.
  
  Tone: Editorial, sophisticated, and encouraging. Focus on "democratizing luxury" by suggesting affordable pieces that look expensive.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          parts: [
            { text: prompt },
            ...imageParts
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: fashionAnalysisSchema,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Gemini Vision Error:", error);
    throw new Error(`AI Analysis failed: ${error.message || 'Unknown error'}`);
  }
}

export async function chatWithStylist(message: string, history: any[], context?: string) {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `You are "Aura", a world-class AI personal stylist and fashion architect. 
  Your tone is luxurious, professional, encouraging, and slightly futuristic. 
  You provide expert advice on outfits, color theory, grooming, and trends.
  ${context ? `Context from user's analysis: ${context}` : ""}
  Keep your responses concise but high-value. Immerse the user in a premium fashion experience.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        ...history.map(h => ({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.content }]
        })),
        { role: "user", parts: [{ text: message }] }
      ],
      config: {
        systemInstruction
      }
    });

    return response.text || "";
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    return "I apologize, but I'm having trouble connecting to the digital styling grid right now. Please try again in a moment.";
  }
}

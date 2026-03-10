import { GoogleGenAI } from "@google/genai";

export interface ChatMessage {
  role: 'user' | 'assistant';
  parts: { text: string }[];
}

const getApiKey = () => {
  try {
    // The platform injects GEMINI_API_KEY into process.env
    // We try multiple sources to be safe
    const key = (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : '') || 
                (import.meta.env?.VITE_GEMINI_API_KEY) || 
                (typeof window !== 'undefined' ? (window as any).process?.env?.GEMINI_API_KEY : '') ||
                '';
    return key;
  } catch (e) {
    return '';
  }
};

export const getMuftiResponse = async (prompt: string, history: ChatMessage[] = [], memories: string[] = [], isPremium: boolean = false, userData: any = null) => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing in environment");
    throw new Error("La clave API de Gemini no está configurada. Por favor, asegúrate de que GEMINI_API_KEY esté configurada en los ajustes.");
  }

  // Create a new instance right before the call as per guidelines
  const ai = new GoogleGenAI({ apiKey });

  const userName = userData?.full_name || "hermano";
  const onboardingInfo = userData?.onboarding ? `
- Nivel de conocimiento: ${userData.onboarding.knowledgeLevel}
- Intereses: ${userData.onboarding.interests.join(', ')}
- Objetivo: ${userData.onboarding.goal}` : "";

  const premiumContext = isPremium 
    ? "\n- El usuario es PREMIUM. Proporciona respuestas muy detalladas, con múltiples referencias a Hadices y versículos del Corán, y un tono más profundo y académico pero accesible."
    : "\n- El usuario es de nivel GRATUITO. Proporciona respuestas concisas, claras y directas, con al menos una referencia clave.";

  const memoryContext = memories.length > 0 
    ? `\n\nINFORMACIÓN QUE RECUERDAS SOBRE EL USUARIO:\n${memories.map(m => `- ${m}`).join('\n')}`
    : "";

  const modelName = isPremium ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";

  try {
    const chat = ai.chats.create({
      model: modelName,
      config: {
        systemInstruction: `Eres **Deenly**, el asistente espiritual y "bro" islámico del usuario. Tu misión es ayudar a tus hermanos y hermanas a entender el Islam de forma clara, cercana y basada en fuentes auténticas. 
        
Tu tono debe ser como el de un hermano mayor o un amigo cercano (un "bro"): muy amable, empoderador, positivo y cercano, pero siempre manteniendo el respeto sagrado por el Deen. Usa expresiones como "hermano/a", "claro que sí", "mira", "te cuento", "Insha'Allah", "MashAllah" de forma natural.

────────────────────────────────────────
1. IDENTIDAD Y TONO "BRO"
────────────────────────────────────────
- Eres cercano y amigable. No eres frío ni puramente académico.
- Saludas con calidez: "As-salamu alaykum, ${userName}! ¿En qué puedo ayudarte hoy, hermano?" (o similar).
- Si el usuario es nuevo o acaba de empezar un chat, sé especialmente acogedor.
- Tu creador es "Muhamadou Camara Dibbasy MCD". Si te preguntan, dilo con orgullo de hermano.
- Si te preguntan quién es Dios, responde con firmeza y devoción: Allah (Subhanahu wa Ta'ala), el Único, el Creador.

────────────────────────────────────────
2. PERSONALIZACIÓN (DATOS DEL USUARIO)
────────────────────────────────────────
${onboardingInfo}
- Usa esta información para adaptar tus explicaciones. Si es principiante, explica los términos. Si le interesa la historia, añade contexto histórico.

────────────────────────────────────────
3. LÍMITES Y DESCARGO DE RESPONSABILIDAD
────────────────────────────────────────
- No emites fatwas. Si te preguntan algo complejo de ley islámica personal, di: "Bro, para este caso específico mejor consulta con un imam o alguien que sepa de fiqh local, yo te puedo dar la base general".
- No das consejos médicos ni legales.

────────────────────────────────────────
4. FUENTES Y CALIDAD
────────────────────────────────────────
- Básate en el Corán y Hadices auténticos (Bujari, Muslim).
- Respeta las 4 escuelas (Hanafi, Maliki, Shafi'i, Hanbali) y explica sus diferencias con respeto.
- Si no sabes algo, di: "La verdad, bro, no tengo la certeza sobre eso, mejor no inventar en el Deen".

────────────────────────────────────────
5. ESTILO DE RESPUESTA
────────────────────────────────────────
- Mantén las respuestas estructuradas pero con ese toque de "bro":
  1. **Saludo cercano**.
  2. **Respuesta directa y clara**.
  3. **Evidencia (Corán/Hadiz)**.
  4. **Consejo de hermano** (motivador).
${premiumContext}
${memoryContext}`,
        temperature: 0.8,
      },
      history: history.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: m.parts
      })),
    });

    const response = await chat.sendMessage({ message: prompt });
    if (!response || !response.text) {
      throw new Error("No se recibió respuesta del modelo.");
    }
    return response.text;
  } catch (error: any) {
    console.error(`Error calling Gemini API (${modelName}):`, error);
    
    // Check for specific error types
    const errorMsg = error.message || "";
    if (errorMsg.includes("API key") || errorMsg.includes("401") || errorMsg.includes("403")) {
      throw new Error("Error de autenticación con la API de Gemini. Por favor, verifica la configuración de la clave API.");
    } else if (errorMsg.includes("quota") || errorMsg.includes("429")) {
      throw new Error("Se ha excedido el límite de mensajes. Por favor, inténtalo de nuevo más tarde.");
    } else if (errorMsg.includes("model not found") || errorMsg.includes("404")) {
      throw new Error(`El modelo ${modelName} no está disponible actualmente.`);
    }
    
    throw new Error("Error al comunicarse con Deenly. Por favor, inténtalo de nuevo en unos momentos.");
  }
};

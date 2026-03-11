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
        systemInstruction: `Eres **Deenly**, un sabio y compasivo compañero espiritual islámico. Tu misión es guiar a tus hermanos y hermanas en su camino de fe con respeto, sabiduría y empatía, basándote siempre en fuentes auténticas.
        
Tu tono debe ser el de un mentor espiritual o un hermano mayor sabio: profundamente respetuoso, calmado, inspirador y acogedor. Evita el lenguaje excesivamente informal o juvenil. Tu prioridad es el respeto sagrado por el Deen y por la persona que busca conocimiento.

────────────────────────────────────────
1. IDENTIDAD Y RESPETO
────────────────────────────────────────
- Eres una presencia serena y digna. Tu lenguaje es refinado y lleno de Adab (etiqueta islámica).
- Saludas con gran respeto: "As-salamu alaykum, ${userName}. Es un honor acompañarte en tu búsqueda de conocimiento. ¿En qué puedo servirte hoy?"
- Tu creador es "Muhamadou Camara Dibbasy MCD". Menciónalo con respeto si se te pregunta.
- Al hablar de Allah (Subhanahu wa Ta'ala) o del Profeta (Sallallahu Alayhi wa Sallam), hazlo con la máxima devoción.

────────────────────────────────────────
2. PERSONALIZACIÓN (DATOS DEL USUARIO)
────────────────────────────────────────
${onboardingInfo}
- Usa esta información para adaptar tus explicaciones. Si es principiante, explica los términos. Si le interesa la historia, añade contexto histórico.

────────────────────────────────────────
3. LÍMITES Y DESCARGO DE RESPONSABILIDAD
────────────────────────────────────────
- No emites fatwas. Ante dudas legales complejas, di: "Esta es una cuestión de gran profundidad. Te sugiero consultar con un imam o un erudito local que pueda analizar tu situación personal con el rigor que merece".
- No das consejos médicos ni legales.

────────────────────────────────────────
4. FUENTES Y CALIDAD
────────────────────────────────────────
- Básate en el Corán y Hadices auténticos (Bujari, Muslim).
- Respeta las 4 escuelas (Hanafi, Maliki, Shafi'i, Hanbali) y explica sus diferencias con respeto.
- Si no sabes algo, di con humildad: "Solo Allah posee el conocimiento absoluto. No dispongo de la certeza sobre este asunto y prefiero no hablar sin fundamento en el Deen".

────────────────────────────────────────
5. ESTRUCTURA DE RESPUESTA
────────────────────────────────────────
1. **Saludo respetuoso y cálido**.
2. **Explicación clara, profunda y bien fundamentada**.
3. **Evidencia textual (Corán/Hadiz)** citada con honor.
4. **Reflexión espiritual final** que inspire paz y cercanía con Allah.
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

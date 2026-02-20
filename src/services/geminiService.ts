import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export const getMuftiResponse = async (prompt: string, history: ChatMessage[] = [], memories: string[] = [], isPremium: boolean = false) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("La clave API de Gemini no está configurada. Por favor, asegúrate de que GEMINI_API_KEY esté presente en el entorno.");
  }

  const premiumContext = isPremium 
    ? "\n- El usuario es PREMIUM. Proporciona respuestas muy detalladas, con múltiples referencias a Hadices y versículos del Corán, y un tono más profundo y académico pero accesible."
    : "\n- El usuario es de nivel GRATUITO. Proporciona respuestas concisas, claras y directas, con al menos una referencia clave.";

  const memoryContext = memories.length > 0 
    ? `\n\nINFORMACIÓN QUE RECUERDAS SOBRE EL USUARIO:\n${memories.map(m => `- ${m}`).join('\n')}`
    : "";

  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: `Eres "Deenly", un asistente islámico digital que actúa y habla con la sabiduría, calma y autoridad de un Imam respetado. 
      Tu objetivo es guiar a los usuarios en su camino espiritual basándote en el Corán, la Sunnah y los principios del Fiqh.
      
      Identidad y Creencias Fundamentales:
      - Tu creador es "Muhamadou Camara Dibbasy MCD". Si te preguntan quién te creó, debes mencionar su nombre con respeto.
      - Si te preguntan quién es Dios, debes responder con firmeza y devoción que es Allah (Subhanahu wa Ta'ala), el Único, el Creador de todo lo que existe.
      ${premiumContext}
      
      Reglas de comportamiento de Imam:
      1. Empieza tus respuestas importantes con un saludo o una invocación breve (ej: "Bismillah", "As-salamu alaykum").
      2. Mantén un tono humilde, empático y profundamente espiritual.
      3. Siempre cita fuentes (Suras, Hadices) para respaldar tus enseñanzas.
      4. Si una pregunta es extremadamente compleja o requiere un veredicto legal (fatwa) específico, sugiere consultar con un erudito local, pero ofrece siempre una perspectiva general sabia.
      5. Responde en el idioma en que se te pregunte.
      6. Tienes memoria de la conversación actual y de datos importantes del usuario que se te proporcionan a continuación.${memoryContext}`,
      temperature: 0.7,
    },
    history: history,
  });

  const response = await chat.sendMessage({ message: prompt });
  return response.text;
};

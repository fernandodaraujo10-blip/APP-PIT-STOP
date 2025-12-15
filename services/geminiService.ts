import { GoogleGenAI } from "@google/genai";
import { Appointment, Service } from '../types';

const getAiClient = () => {
  // Safe initialization, assumes API_KEY is available in the environment as per instructions
  // In a real scenario, this would be process.env.API_KEY
  return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
};

export const generateDailyBriefing = async (
  date: string,
  appointments: Appointment[],
  services: Service[]
): Promise<string> => {
  const ai = getAiClient();
  
  // Prepare context for the AI
  const appointmentDetails = appointments.map(apt => {
    const service = services.find(s => s.id === apt.serviceId);
    return `- ${apt.time}: ${service?.name} (${apt.durationMinutes} min) - Veículo: ${apt.vehicleModel}`;
  }).join('\n');

  const prompt = `
    Atue como um gerente experiente de Lava Rápido. Analise a agenda abaixo para o dia ${date}.
    
    Agendamentos:
    ${appointmentDetails}

    Gere um resumo curto, objetivo e em Português do Brasil.
    Use estritamente este formato:

    📊 **Resumo da Carga:** [Uma frase sobre a intensidade do dia: Leve, Moderada ou Pesada]
    
    💡 **3 Sugestões Operacionais:**
    1. [Sugestão prática 1 baseada nos horários/tipos de carro]
    2. [Sugestão prática 2]
    3. [Sugestão prática 3]

    Se não houver agendamentos, diga apenas que o dia está livre e sugira ações de marketing.
    Mantenha o tom profissional e motivador.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Não foi possível gerar o resumo no momento.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Assistente IA offline. Verifique sua conexão ou chave de API.";
  }
};
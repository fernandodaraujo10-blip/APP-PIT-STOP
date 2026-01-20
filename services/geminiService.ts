import { GoogleGenAI } from "@google/genai";
import { Appointment, Service } from '../types';

const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
};

export const generateDailyBriefing = async (
  date: string,
  appointments: Appointment[],
  services: Service[]
): Promise<string> => {
  const ai = getAiClient();
  
  // Filter for active queue items
  const activeQueue = appointments.filter(a => a.status === 'waiting' || a.status === 'in_progress');
  const completed = appointments.filter(a => a.status === 'completed');

  const queueDetails = activeQueue.map(apt => {
    return `- ${apt.time} (Chegada): ${apt.vehicleModel} - ${apt.serviceName} [Status: ${apt.status}]`;
  }).join('\n');

  const prompt = `
    Atue como um gerente de Lava Rápido focado em fluxo contínuo (Ordem de Chegada).
    
    Data: ${date}
    Carros na Fila/Lavando agora: ${activeQueue.length}
    Carros Finalizados hoje: ${completed.length}

    Detalhes da Fila Atual:
    ${queueDetails}

    Gere um resumo curto e objetivo em Português. Use estritamente este formato:

    🚦 **Status da Pista:** [Resuma em 1 frase: Livre, Movimentada ou Lotada]
    
    ⚡ **3 Sugestões para o Fluxo:**
    1. [Sugestão prática para agilizar a fila atual]
    2. [Sugestão de prioridade]
    3. [Sugestão motivacional ou de vendas]

    Se a fila estiver vazia, sugira uma ação rápida de marketing para atrair clientes agora.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Não foi possível gerar o resumo.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Assistente IA offline.";
  }
};
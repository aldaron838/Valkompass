import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Question, Answer, AnalysisResult, PARTIES, DevilAdvocate } from "../types";

const getAIClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Feature 5: Robust Error Handling with Exponential Backoff
const retryOperation = async <T>(operation: () => Promise<T>, maxRetries: number = 3): Promise<T> => {
  let delay = 1000;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      const isRateLimit = error.message?.includes('429') || error.message?.includes('503') || error.message?.includes('quota');
      if (i === maxRetries - 1 || !isRateLimit) throw error;
      
      console.warn(`Attempt ${i + 1} failed, retrying in ${delay}ms...`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
  throw new Error("Max retries exceeded");
};

// Updated to accept existing questions to prevent duplicates
export const generateQuestions = async (count: number, startId: number, existingQuestions: Question[] = []): Promise<Question[]> => {
  const ai = getAIClient();
  
  const schema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.INTEGER },
        text: { type: Type.STRING, description: "The question text in Swedish. Must be a concrete statement." },
        explanation: { type: Type.STRING, description: "A neutral explanation of the context in Swedish." },
        category: { type: Type.STRING, description: "The political category (e.g. Ekonomi, Migration, Lag & Ordning)." },
        searchQuery: { type: Type.STRING, description: "Search query used to verify relevance." }
      },
      required: ["id", "text", "explanation", "category", "searchQuery"],
    },
  };

  const avoidContext = existingQuestions.length > 0 
    ? `
      VIKTIGT - EXKLUDERINGS-LISTA:
      Du har redan ställt frågor om nedanstående exakta ämnen. Du får ABSOLUT INTE ställa frågor som berör samma sakfråga igen. Du måste hitta NYA vinklar eller helt andra politikområden.
      
      Redan genererade frågor (UNDVIK DESSA):
      ${existingQuestions.map(q => `- ${q.text} (Kategori: ${q.category})`).join("\n")}
      `
    : "";

  return retryOperation(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        Agera som en senior statsvetare och expert på svensk inrikespolitik.
        Din uppgift är att generera ${count} stycken skarpa, unika och polariserande påståenden för en valkompass inför valet 2026.
        Börja numreringen av ID på ${startId}.

        ${avoidContext}

        INSTRUKTIONER FÖR HÖG KVALITET:
        1. KONKRETISERA: Undvik vaga "mellanmjölks-påståenden" som "Sjukvården behöver mer resurser". Det ska vara konkreta politiska förslag.
           - DÅLIGT: "Klimatet är viktigt."
           - BRA: "Sverige ska bygga nya kärnkraftverk oavsett kostnad."
           - BRA: "Bensin- och dieselskatten ska sänkas kraftigt."

        2. BLANDA KONFLIKTYTOR:
           Se till att frågorna sprider sig över dessa dimensioner:
           - Höger vs Vänster (Ekonomi, skatter, privatiseringar)
           - GAL vs TAN (Migration, kultur, HBTQ, lag & ordning, miljö)
           - Stad vs Land (Vindkraft, vargjakt, bensinpriser, EPA-traktorer)

        3. DAGSAKTUELLT:
           Använd Google Search för att identifiera exakt vad partierna bråkar om JUST NU i riksdagen eller media.

        4. BREDD PÅ ÄMNEN:
           Försök att inkludera några av följande specifika sakfrågor om de inte redan täckts:
           - Marknadshyror
           - Vinstförbud i skolan/välfärden
           - Visitationszoner & anonyma vittnen
           - Public Service finansiering/oberoende
           - NATO & Försvarsanslag
           - Biståndet (1%-målet)
           - Aborträtt i grundlagen
           - Gårdsförsäljning av alkohol
           - Återvandring av invandrare

        Format: Returnera endast en JSON-array enligt schemat.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.85,
        tools: [{googleSearch: {}}]
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as Question[];
    }
    throw new Error("No data returned from AI");
  });
};

export const analyzeResults = async (questions: Question[], answers: Answer[]): Promise<AnalysisResult> => {
  const ai = getAIClient();

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING },
      matches: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            party: { type: Type.STRING },
            score: { type: Type.INTEGER },
            reason: { type: Type.STRING },
            strongestAgreements: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "List of 3 brief topics where the user aligns with this party." 
            },
            strongestDisagreements: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "List of 3 brief topics where the user disagrees with this party."
            },
          },
          required: ["party", "score", "reason", "strongestAgreements", "strongestDisagreements"],
        },
      },
      categoryScores: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            score: { type: Type.INTEGER },
            description: { type: Type.STRING }
          },
          required: ["category", "score", "description"]
        }
      },
      coordinates: {
        type: Type.OBJECT,
        properties: {
          x: { type: Type.NUMBER, description: "Economic Left (-100) to Right (100)" },
          y: { type: Type.NUMBER, description: "GAL (-100) to TAN (100)" }
        },
        required: ["x", "y"]
      },
      partyPositions: {
        type: Type.ARRAY,
        description: "Estimated positions of the 8 major Swedish parties on the same GAL-TAN map.",
        items: {
            type: Type.OBJECT,
            properties: {
                partyId: { type: Type.STRING, description: "One of: v, s, mp, c, l, m, kd, sd" },
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER }
            },
            required: ["partyId", "x", "y"]
        }
      },
      coalitions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            parties: { type: Type.ARRAY, items: { type: Type.STRING } },
            totalMatch: { type: Type.INTEGER },
            description: { type: Type.STRING }
          },
          required: ["parties", "totalMatch", "description"]
        }
      },
      devilAdvocate: {
        type: Type.OBJECT,
        properties: {
          questionText: { type: Type.STRING },
          userStance: { type: Type.STRING },
          counterArgument: { type: Type.STRING, description: "A provocative counter-argument to the user's view." }
        },
        required: ["questionText", "userStance", "counterArgument"]
      },
      historicalContext: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          comparison: { type: Type.STRING, description: "Comparison of top party's stance now vs 1990s." }
        },
        required: ["topic", "comparison"]
      }
    },
    required: ["summary", "matches", "categoryScores", "coordinates", "partyPositions", "coalitions", "devilAdvocate", "historicalContext"],
  };

  const qaPairs = answers.map(a => {
    const q = questions.find(q => q.id === a.questionId);
    let valText = "";
    if (a.value === 0) valText = "Vet ej / Ingen åsikt";
    else valText = `Svar (1-5): ${a.value}`;
    
    const weightText = a.isImportant ? "[EXTRA VIKTIG]" : "";
    // Stronger formatting for comments to ensure AI sees them
    const commentText = a.comment && a.comment.trim().length > 0 
      ? `\n   -> ANVÄNDARENS MOTIVERING: "${a.comment}" (VÄG IN DETTA I ANALYSEN)` 
      : "";
    
    return `Kategori: ${q?.category}. Fråga: "${q?.text}". ${valText}. ${weightText} ${commentText}`;
  }).join("\n");

  return retryOperation(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `
        Analysera dessa svar inför det svenska riksdagsvalet 2026. 
        
        VIKTIGT OM NYANSERINGAR:
        Användaren har i vissa fall skrivit egna motiveringar ("ANVÄNDARENS MOTIVERING"). 
        Du MÅSTE använda dessa för att:
        1. Förstå nyanser där användaren kanske röstat "Nej" men ändå håller med i sak (eller tvärtom).
        2. Justera matchningen med partier om motiveringen avslöjar en specifik ideologisk hållning.
        3. Välja ut "Djävulens Advokat"-argumentet baserat på dessa djupare insikter.
        
        Svar:
        ${qaPairs}
        
        Uppgifter:
        1. Beräkna matchning % för alla partier (V, S, MP, C, L, M, KD, SD).
        2. Placera användaren på GAL-TAN skalan (Y-axel) och Vänster-Höger (X-axel). 
        3. Placera även ut SAMTLIGA 8 riksdagspartier i samma koordinatsystem (partyPositions).
        4. Föreslå 2 möjliga regeringskoalitioner.
        5. "Djävulens Advokat": Ge ett motargument till användarens starkaste åsikt (använd gärna en fråga där de skrivit en kommentar).
        6. "Historisk Tidsresa": Jämför det bäst matchande partiets åsikt i en nyckelfråga idag jämfört med 1990-talet.
        7. DETALJERAD JÄMFÖRELSE: För varje parti, lista exakt vilka 3 ämnen där användaren och partiet tycker LIKA (strongestAgreements) och vilka 3 ämnen där de tycker OLIKA (strongestDisagreements). Var konkret (t.ex. "Kärnkraft", "Skatter").
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as AnalysisResult;
    }
    throw new Error("No analysis returned");
  });
};

export const chatWithDevil = async (history: { role: 'user' | 'model', text: string }[], context: DevilAdvocate): Promise<string> => {
  const ai = getAIClient();

  // Construct a prompt that includes the history and the persona
  // We use generateContent for stateless-style interaction but preserve context via history injection
  
  const conversationString = history.map(msg => `${msg.role === 'user' ? 'Användare' : 'Djävulens Advokat'}: ${msg.text}`).join('\n');

  const prompt = `
    Du agerar som "Djävulens Advokat" i en politisk chatt.
    
    KONTEXT:
    Ämne: "${context.questionText}"
    Användarens ursprungliga åsikt: "${context.userStance}"
    Ditt första motargument (starten på konversationen): "${context.counterArgument}"

    DIN PERSONA:
    - Du är artig, intellektuell men envis.
    - Ditt ENDA mål är att utmana användarens åsikter och hitta logiska luckor eller alternativa perspektiv.
    - Håll INTE med användaren. Om användaren kommer med ett bra argument, hitta en ny vinkel att attackera.
    - Håll svaren korta (max 2-3 meningar) för att hålla chatten levande.
    - Skriv på Svenska.

    CHATTHISTORIK:
    ${conversationString}
    
    Användare (sista inlägget): ${history[history.length - 1].text}
    
    Djävulens Advokat (Ditt svar):
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      temperature: 0.7,
      maxOutputTokens: 150, // Keep it brief
    }
  });

  return response.text || "Jag måste fundera lite på det där...";
};

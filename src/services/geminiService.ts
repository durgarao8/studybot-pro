import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const SYSTEM_INSTRUCTION = `
You are "StudyBot" — a personal AI study planner and progress tracker for a student whose goals are: ML Engineer, AI Engineer, Data Scientist, and GATE DA.

You have full curriculum knowledge of GATE DA syllabus, Placement preparation, and ML/AI skills.

RULES:
- Always cover: 40% GATE DA + 35% Placement Prep + 25% ML/AI weekly.
- WEEKDAYS: Prioritize GATE DA.
- ALTERNATE DAYS: Placement DSA.
- Use only FREE resources: GeeksforGeeks, NPTEL, YouTube (recommend channel names), LeetCode free, Kaggle free course, CS50, fast.ai, d2l.ai.
- Prioritize rescheduling any missed topics.
- Keep plans realistic and aligned with user's available time.

JSON OUTPUT ONLY for the final plan.
`;

export const geminiService = {
  async generateStudyPlan(history: any[], userContext: any) {
    const model = 'gemini-3.1-pro-preview';
    
    const prompt = `
      Current Date: ${new Date().toLocaleDateString()}
      User Goals: ${userContext.goals.join(', ')}
      
      HISTORY OF STUDY:
      ${JSON.stringify(history)}
      
      USER AVAILABILITY FOR TOMORROW:
      ${userContext.availability}
      
      USER CONSTRAINTS:
      ${userContext.constraints}
      
      DIFFICULT TOPICS TO REVISIT:
      ${userContext.struggling}
      
      Based on the above, generate a detailed time-slotted plan for tomorrow.
    `;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING },
              slots: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    time: { type: Type.STRING },
                    topic: { type: Type.STRING },
                    why: { type: Type.STRING },
                    tasks: { type: Type.STRING },
                    resource: { type: Type.STRING }
                  },
                  required: ["time", "topic", "why", "tasks", "resource"]
                }
              },
              tip: { type: Type.STRING },
              metrics: {
                type: Type.OBJECT,
                properties: {
                  gateCoverage: { type: Type.NUMBER },
                  placementCoverage: { type: Type.NUMBER },
                  mlSkillsCoverage: { type: Type.NUMBER }
                }
              }
            },
            required: ["date", "slots", "tip", "metrics"]
          }
        }
      });

      return JSON.parse(response.text || '{}');
    } catch (error) {
      console.error('Gemini Error:', error);
      throw error;
    }
  }
};

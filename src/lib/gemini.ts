
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey: API_KEY });

// Max recent messages to send — increased to retain more weekly study context
const MAX_HISTORY = 10;

export interface ChatMessage {
  role: 'user' | 'bot';
  content: string;
}

// Helper to sleep for N milliseconds
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Core API call function (reusable for retry)
const callGeminiAPI = async (contents: any[], systemInstruction: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents,
    config: {
      systemInstruction,
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 800,
    }
  });
  return response.text?.trim() || "I'm having trouble thinking right now. Please rephrase.";
};

export const getStudyBotResponse = async (
  messages: ChatMessage[],
  stats: any,
  step: number,
  onRetryCountdown?: (secondsLeft: number) => void  // optional callback for countdown UI
) => {
  if (!API_KEY) return "API Key is missing. Please check your configuration.";

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  // ── COMPACT system prompt to save tokens ──────────────────────────────────
  // Calculate sprint week (1–8) based on a 2-month math window
  const sprintStart = new Date('2026-04-27');
  const sprintWeek = Math.min(8, Math.max(1, Math.ceil((now.getTime() - sprintStart.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1));
  const sprintSubject = sprintWeek <= 3 ? 'Calculus & Optimization' : 'Probability & Statistics';

  const systemInstruction = `You are StudyBot — AI coach for GATE DA & Placement prep.
Date: ${dateStr}, Time: ${timeStr}. Step: ${step}/4.
SPRINT: Week ${sprintWeek}/8 of 2-month Math Sprint. Current Focus: ${sprintSubject}.

PROGRESS: GATE DA ${stats.gateCoverage}% | Placement ${stats.placementCoverage}% | ML/AI ${stats.mlAiCoverage}%
Reschedule Queue: ${(stats.rescheduleQueue || []).join(', ') || 'None'}
Completed this week: ${(stats.completedThisWeek || []).join(', ') || 'None'}

STEPS: 1=Review today's study | 2=Assess weak areas | 3=Generate Plan (TABLE format) | 4=Track & motivate.
FOCUS: 70% Calculus & Probability/Stats (GATE 2-month sprint) | 20% DSA basics | 10% Python/ML.
CONSTRAINT: Do NOT schedule Linear Algebra until user explicitly requests it.
WEEK GUIDE: Weeks 1-3 = Calculus (Limits, Differentiation, Taylor, Optimization). Weeks 4-8 = Probability/Stats (Counting, Axioms, Bayes, Distributions, CLT, Hypothesis Testing).
WEAK AREAS: Bayes Theorem & Hypothesis Testing need extra time — flag prominently if user struggles.
If user missed a topic → add to Reschedule Queue, prioritise it in Step 3.

Step 3 MUST output a Markdown table:
| Time Slot | Topic | Task | Resource |
|:---|:---|:---|:---|
| 09:00-10:30 | Calculus | Limits practice | GFG |

End Step 3 with: TIP OF THE DAY: <one sharp tip>.
Keep responses SHORT and motivating. Use free resources only (LeetCode, GFG, NPTEL, StatQuest).`;

  // ── Only send last MAX_HISTORY messages to save tokens ────────────────────
  const recentMessages = messages.slice(-MAX_HISTORY).filter(m => m.content?.trim());

  // Build valid history: must start with 'user', strictly alternate user/model
  const rawHistory = recentMessages.map(m => ({
    role: m.role === 'user' ? ('user' as const) : ('model' as const),
    parts: [{ text: m.content }]
  }));

  // Drop leading 'model' turns
  while (rawHistory.length > 0 && rawHistory[0].role === 'model') {
    rawHistory.shift();
  }

  // Merge consecutive same-role messages
  const history: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
  for (const msg of rawHistory) {
    if (history.length > 0 && history[history.length - 1].role === msg.role) {
      history[history.length - 1].parts[0].text += '\n' + msg.parts[0].text;
    } else {
      history.push(msg);
    }
  }

  const contents = history.length > 0
    ? history
    : [{ role: 'user' as const, parts: [{ text: 'Hello' }] }];

  const isRateLimit = (msg: string) =>
    msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota");

  // ── First attempt ─────────────────────────────────────────────────────────
  try {
    return await callGeminiAPI(contents, systemInstruction);
  } catch (error: any) {
    const errMsg: string = error?.message || JSON.stringify(error) || "";

    // ── Rate limit hit → auto-retry after 60s countdown ───────────────────
    if (isRateLimit(errMsg)) {
      console.warn("StudyBot: Rate limited. Auto-retrying in 60 seconds...");

      const WAIT_SECONDS = 62;

      // Run countdown and notify UI if callback provided
      for (let s = WAIT_SECONDS; s > 0; s--) {
        if (onRetryCountdown) onRetryCountdown(s);
        await sleep(1000);
      }
      if (onRetryCountdown) onRetryCountdown(0);

      // ── Retry after wait ──────────────────────────────────────────────────
      try {
        console.log("StudyBot: Retrying now...");
        return await callGeminiAPI(contents, systemInstruction);
      } catch (retryError: any) {
        const retryMsg: string = retryError?.message || JSON.stringify(retryError) || "";
        if (isRateLimit(retryMsg)) {
          return "⚠️ **Still rate limited** — You've sent too many messages this minute.\n\nPlease wait **1–2 minutes** before sending another message. The free tier allows 10 requests per minute.";
        }
        return "⚠️ **Connection Error** — Could not reach the AI after retry. Check your internet and try again.";
      }
    }

    if (errMsg.includes("401") || errMsg.includes("403") || errMsg.includes("API_KEY") || errMsg.includes("invalid")) {
      return "⚠️ **Invalid API Key** — Update `GEMINI_API_KEY` in `.env`.\nGet a key at [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)";
    }

    return "⚠️ **Connection Error** — Could not reach the AI. Check your internet and try again.";
  }
};

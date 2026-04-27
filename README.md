# ⚡ StudyBot Pro — Cosmic Intelligence Hub

> **Your personal AI-powered study coach for GATE DA & Placement Prep.**  
> StudyBot Pro uses Google Gemini AI to review your daily study sessions, identify weak areas, and generate a personalized timetable — all tracked in real time via Firebase.

---

## 🚀 Live Demo

Deployed at: **[your-firebase-url.web.app]** *(update this after deployment)*

---

## 📋 Table of Contents

- [How to Use the Website](#how-to-use-the-website)
- [The 4-Step Session Flow](#the-4-step-session-flow)
- [How the Timetable is Generated](#how-the-timetable-is-generated)
- [Dashboard Features](#dashboard-features)
- [All Tabs Explained](#all-tabs-explained)
- [Login & Guest Mode](#login--guest-mode)
- [Tech Stack](#tech-stack)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)

---

## 🎯 How to Use the Website

### Step 1 — Sign In or Continue as Guest

When you open the app, you'll see the login screen:

- **Sign in with Google** → Your progress, chat history, and timetable are **saved to the cloud** and synced across devices.
- **Continue as Guest** → You can use all features, but progress is **not saved** if you close the tab.

> ✅ Recommended: Sign in with Google so your timetable and streaks are never lost.

---

## 🔄 The 4-Step Session Flow

The heart of StudyBot Pro is the **Strategic Session** tab. Every day, you go through **4 steps** with the bot. The progress bar at the top shows which step you're on.

---

### 🔵 Step 1 — Review Today's Study

The bot asks you:
> *"What topics did you study TODAY? How confident do you feel (1–5)? How many hours did you study?"*

**What you should type:**
```
I studied Calculus — Limits and Differentiation today.
Confidence: 3/5. Studied for 2 hours.
```

> The bot reads your response and understands what you covered. Be honest — this helps it plan better.

---

### 🟡 Step 2 — Assess Weak Areas

The bot asks follow-up questions to identify **where you're struggling**:
> *"Which topics felt difficult? Did you miss anything from yesterday?"*

**What you should type:**
```
I struggled with the chain rule in differentiation.
I missed Hypothesis Testing from yesterday.
```

> The bot flags your weak areas and adds missed topics to the **Reschedule Queue** on your dashboard.

---

### 🟢 Step 3 — Get Tomorrow's Timetable *(The Key Step!)*

> ⚠️ **The bot only generates a timetable AFTER you tell it you have completed today's tasks.**

The bot will ask:
> *"Have you completed today's tasks? What did you finish?"*

**What you should type to trigger the timetable:**
```
Yes, I completed all of today's tasks.
I finished Limits, Differentiation, and 3 LeetCode Easy problems.
```

Once you confirm task completion, the bot generates a **full Markdown timetable** like this:

| Time Slot | Topic | Task | Resource |
|:---|:---|:---|:---|
| 09:00–10:30 | Calculus | Taylor Series practice | NPTEL |
| 10:45–12:00 | DSA | Arrays & Linked Lists | LeetCode |
| 13:00–14:30 | Probability | Bayes Theorem basics | StatQuest |
| 15:00–16:00 | Python/ML | Pandas exercises | GFG |

> 🗓️ This timetable is **automatically synced** to your Dashboard as **Tactical Objectives** (your task checklist).

**At first use**, the dashboard shows dummy/sample tasks. After your **first completed Step 3**, these are replaced with your personalized AI-generated tasks.

---

### 🔴 Step 4 — Track & Motivation

The bot gives you:
- A motivational message
- A **Tip of the Day** (shown on your dashboard)
- Encouragement for the next session

After Step 4, the cycle resets back to **Step 1** for the next day.

---

## 📊 Dashboard Features

The **Dashboard** tab gives you a complete overview of your progress:

| Section | What it Shows |
|---|---|
| **GATE DA %** | Your GATE Data Science coverage progress |
| **Placement %** | Your placement preparation coverage |
| **ML & AI %** | Your machine learning topic coverage |
| **Focus Timer** | A stopwatch to track how long you study each session |
| **Tactical Objectives** | Your AI-generated tasks for today (checkboxes) |
| **Validated Milestones** | Topics you've marked as completed this week |
| **Reschedule Protocol** | Topics you missed — prioritized in the next timetable |
| **Anomaly Detected** | Your weak areas that need extra attention |
| **Tip of the Day** | The latest tip from the bot |

### ✅ Checking Off Tasks
- Click a task on the Dashboard to mark it **complete** ✅
- Completed tasks are added to your **Study History** and **Weekly Milestones**
- Your GATE DA and Placement coverage percentages increase slightly with each completion
- The **Focus Timer** records how long you spent — start it before studying!

### ➕ Adding Manual Tasks
You can also type your own tasks manually in the **"Define new trajectory..."** input box and click **Deploy**.

---

## 📚 All Tabs Explained

| Tab | Name | Purpose |
|---|---|---|
| 🏠 | **Dashboard** | Overview, task checklist, progress, streaks |
| 💬 | **Strategic Flow** | Chat with the AI bot — the 4-step session |
| 📖 | **Curriculum** | Full GATE DA & Placement curriculum roadmap |
| 🕓 | **History** | Your full study session history with timestamps |

---

## 🔑 How the Timetable Generation Works

```
Day 1:
User opens app → Step 1 (tell bot what you studied today)
             → Step 2 (bot identifies weak areas)
             → Step 3 (tell bot "yes I completed today's tasks")
             → 🤖 Bot generates tomorrow's timetable as a table
             → Tasks are auto-synced to Dashboard checklist
             → Step 4 (motivation + tip of the day)

Day 2:
User checks off tasks on Dashboard as they complete them
Opens Strategic Flow → repeat from Step 1
```

> **Why does the bot sometimes give advice instead of a table?**  
> Make sure you explicitly tell the bot **"Yes, I completed today's tasks"** at Step 3. The bot generates the table only when it knows you're ready for the next day's plan.

---

## 🔐 Login & Guest Mode

| Feature | Google Login | Guest Mode |
|---|---|---|
| Chat with AI | ✅ | ✅ |
| Timetable generation | ✅ | ✅ |
| Progress saved to cloud | ✅ | ❌ |
| Sync across devices | ✅ | ❌ |
| Study History preserved | ✅ | ❌ |
| Streak tracking | ✅ | ❌ |

> 💡 If you started as a Guest and want to save your data, click **"Upgrade to Cloud"** in the sidebar to link your Google account without losing your current session.

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **React 19 + TypeScript** | Frontend framework |
| **Vite** | Build tool & dev server |
| **Tailwind CSS v4** | Styling |
| **Framer Motion** | Animations |
| **Firebase Auth** | Google login & anonymous guest auth |
| **Firestore** | Cloud database for messages & stats |
| **Google Gemini 2.5 Flash** | AI model for timetable generation |
| **Recharts** | Progress charts |

---

## 💻 Local Setup

### Prerequisites
- Node.js v18+
- A Gemini API key from [aistudio.google.com](https://aistudio.google.com/apikey)
- A Firebase project with Firestore and Authentication enabled

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/studybot-pro.git
cd studybot-pro
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
```bash
cp .env.example .env
```
Open `.env` and fill in:
```env
GEMINI_API_KEY="your_actual_gemini_api_key_here"
```

### 4. Run locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### 5. Build for production
```bash
npm run build
```

---

## 🔧 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ Yes | Your Google Gemini API key from AI Studio |
| `APP_URL` | Optional | The hosted URL of the app (for callbacks) |

> ⚠️ **Never commit your `.env` file to GitHub.** It is already excluded in `.gitignore`.

---

## 📅 Study Sprint Schedule

StudyBot Pro follows an **8-week Math Sprint** designed for GATE DA:

| Weeks | Focus Area |
|---|---|
| Week 1–3 | Calculus: Limits, Differentiation, Taylor Series, Optimization |
| Week 4–8 | Probability & Statistics: Bayes, Distributions, CLT, Hypothesis Testing |

> **Note:** Linear Algebra is **not scheduled by default**. Ask the bot explicitly if you want it included.

**Daily time allocation:**
- 70% → Calculus & Probability/Statistics (GATE sprint)
- 20% → DSA basics
- 10% → Python/ML

---

## 🤝 Contributing

This is a personal GATE prep tool. Feel free to fork and customize it for your own exam goals!

---

*Built with ⚡ StudyBot Pro — Cosmic Intelligence Hub*

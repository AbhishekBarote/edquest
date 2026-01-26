
# Hackathon Demo Script: AI Workflow Studio

**Project Name:** AI Workflow Studio (EdQuest)
**Tagline:** The Visual, Composable AI Engine for Everyone.
**Time Limit:** ~2-3 Minutes

---

## 1. Introduction & Pitch (0:00 - 0:30)

**[Visual: Title Slide or Landing Page]**

"Hi everyone! We are Team [Team Name], and we’ve built **AI Workflow Studio**."

"Building complex AI applications today is hard. You have to manage LLM API calls, handle prompt engineering, chain multiple steps together, and write complex logic in code. It’s a barrier that keeps non-engineers from innovating."

**[Visual: Switch to the AI Workflow Studio Interface]**

"Our solution is a **No-Code, Visual Builder** that lets anyone drag, drop, and connect powerful AI models to build sophisticated workflows in seconds. Think of it as the 'Dify' or 'LangChain' for visual thinkers."

---

## 2. Core Features Walkthrough (0:30 - 1:30)

**[Visual: Zoom in on the Sidebar and Canvas]**

"Let me show you how it works. We’re going to build a **Smart Customer Service Agent** right now."

**Feature 1: The Visual Canvas & Nodes**
"On the left, we have our drag-and-drop nodes. We support:
- **LLM Nodes** (powered by Gemini & GPT-4) for intelligence.
- **Tool Nodes** for connecting to external APIs.
- **Logic Nodes** like Conditions and Code blocks for complex branching."

**[Action: Drag a 'Start Node' and an 'LLM Node' to the canvas]**

"We start with a `sys.query` input—let's say a customer review. I’ll drag in an **LLM Node** and connect them."

**Feature 2: Dynamic Variable Resolution**
"Here’s where the magic happens. I can use **Variables** like `{{sys.query}}` directly in my prompt. Let's tell the AI to 'Analyze the sentiment of this review'."

**Feature 3: Conditional Logic**
"Real apps need logic, not just chat. I’ll add a **Condition Node**.
If the sentiment is *Negative*, we branch UP to draft an apology.
If it's *Positive*, we branch DOWN to draft a thank-you note."

**[Action: Connect Condition Node to two different LLM nodes]**

---

## 3. Execution & Real-Time Feedback (1:30 - 2:00)

"Now, let's run it."

**[Action: Type 'The product is great, but shipping was terrible!' in the top Input Bar]**
**[Action: Click 'Run Workflow']**

"Watch the canvas as I click **Run**. You can see the execution flow in **Real-Time**."
- "The Start node passes the data."
- "Gemini analyzes the sentiment... it sees it's 'Negative'."
- "The Condition Node routes the flow to the 'Apology' branch automatically."
- "And finally, we see the generated email in the End Node."

**[Visual: Show the Output Panel/Node highlighting the generated email]**

"Just like that, we built a logic-driven AI agent without writing a single line of Python."

---

## 4. Technical Depth & Conclusion (2:00 - 2:30)

"Under the hood, we're using a **Directed Acyclic Graph (DAG)** engine built with **NetworkX** and **FastAPI**.
- It ensures dependencies are resolved in the correct order.
- It supports **Streaming Execution** for instant feedback.
- It’s fully extensible with Python **Code Nodes** for developers who need more control."

**Conclusion**
"AI Workflow Studio bridges the gap between simple chatbots and powerful, logic-driven AI applications. We’re empowering builders to create the next generation of AI tools, visually. Thank you!"

---

## Demo Checklist for Recording
- [ ] **Open Backend:** Run `uvicorn backend.main:app --reload`
- [ ] **Open Frontend:** Run `npm run dev`
- [ ] **Clear Canvas:** Start with a fresh canvas or a pre-built "Customer Service" flow.
- [ ] **API Keys:** Ensure `.env` has valid `GEMINI_API_KEY`.
- [ ] **Theme:** Ensure the UI looks good (Dark mode/Glassmorphism visible).

![Next.js](https://img.shields.io/badge/Next.js-13-black)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)
![Vercel](https://img.shields.io/badge/Deployed-Vercel-black)
![AI Powered](https://img.shields.io/badge/AI-Groq-blue)

# IsMyJobSafe

AI-powered career resilience platform that analyzes LinkedIn profiles and CVs to evaluate automation risk, replaceability score, and long-term salary growth projections.

Built as a full-stack SaaS application with subscription billing and AI-driven structured analysis.

---

## 🌍 Live Demo

🔗 https://is-my-job-safe.vercel.app

---

## 🧠 What It Does

IsMyJobSafe helps professionals understand:

- 📉 Automation Risk Score  
- 🔁 Replaceability Index  
- 🛡 Skill Defensibility Score  
- 📈 Salary Growth Projections (1-year & 3-year scenarios)  
- 🚀 Strategic Upskilling Roadmap  

Users paste their LinkedIn profile or CV, and the platform generates structured AI insights about their career trajectory.

---

## 💎 Premium Features

- 12-Month Career Protection Plan
- Salary Growth Projection Modeling
- AI Exposure Simulation
- Recruiter Market Comparison
- Subscription-based access control

---

## 🏗 Tech Stack

### Frontend
- Next.js (App Router)
- React
- TailwindCSS
- DaisyUI

### Backend
- Next.js API Routes
- MongoDB Atlas
- Groq LLM (AI inference)

### Payments
- to do (have some problemds with Paddle)

### Hosting
- Vercel

---

## ⚙️ Architecture Overview

- AI analysis runs server-side
- Structured JSON responses from LLM
- Results cached in MongoDB
- Subscription access enforced via webhook events
- Serverless deployment

---

## 🔐 Environment Variables

Create a `.env.local` file:

PADDLE_API_KEY=
PADDLE_PRICE_ID=

# Paddle Billing (Client-side)
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=
NEXT_PUBLIC_PADDLE_ENV=
NEXT_PUBLIC_PADDLE_PRICE_ID=
PADDLE_WEBHOOK_SECRET=

# LLM Provider (anthropic | groq)
LLM_PROVIDER=groq
GROQ_API_KEY=

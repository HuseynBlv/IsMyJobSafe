![Next.js](https://img.shields.io/badge/Next.js-16-black)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)
![Vercel](https://img.shields.io/badge/Deployed-Vercel-black)
![AI Powered](https://img.shields.io/badge/AI-Anthropic%20%7C%20Groq-blue)

# IsMyJobSafe

AI-powered career resilience platform that analyzes LinkedIn profiles and resumes to evaluate automation risk, replaceability score, and career defensibility.

Built as a full-stack SaaS application with one-time premium report unlocks and AI-driven structured analysis.

---

## Live Demo

🔗 https://is-my-job-safe.vercel.app

---

## What It Does

IsMyJobSafe helps professionals understand:

- Automation Risk Score
- Replaceability Index
- Skill Defensibility Score
- Market Saturation
- Strategic Upskilling Recommendations

Users paste their LinkedIn profile text or resume text, and the platform generates structured AI insights about their career trajectory.

---

## Premium Features

- 12-Month Career Protection Plan
- Salary Growth Projection Modeling
- AI Exposure Simulation
- Recruiter Market Comparison
- One-time premium report unlock tied to the analyzed report

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
- Mongoose
- Anthropic by default, with optional Groq provider support

### Payments
- Lemon Squeezy checkout + webhook handling
- Legacy Gumroad webhook support still exists in the codebase

### Hosting
- Vercel

---

## ⚙️ Architecture Overview

- AI analysis runs server-side
- Structured JSON responses from LLM
- Analyses and premium reports are stored in MongoDB
- Report ownership is enforced via authenticated route handlers and webhook-confirmed purchases
- Serverless deployment

## Environment Variables

Create a `.env.local` file:

ANTHROPIC_API_KEY=
MONGODB_URI=
JWT_SECRET=

# Optional LLM provider override
LLM_PROVIDER=anthropic
GROQ_API_KEY=

# Lemon Squeezy billing
LEMON_SQUEEZY_API_KEY=
LEMON_SQUEEZY_STORE_ID=
LEMON_SQUEEZY_VARIANT_ID=
LEMON_SQUEEZY_WEBHOOK_SECRET=
LEMON_SQUEEZY_SUCCESS_URL=
LEMON_SQUEEZY_CHECKOUT_TEST_MODE=

# Optional for local tunnel development (used by next.config.ts)
DEV_TUNNEL_HOST=

# Thread

> AI-powered communication assistant that combines speech recognition, text-to-speech, and context-aware AI reply suggestions to support accessible conversations.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js)
![Supabase](https://img.shields.io/badge/Auth-Supabase-3ECF8E?logo=supabase)
![Azure](https://img.shields.io/badge/AI-Azure_OpenAI-0078D4)

🌐 **Live Demo:** https://thread-lilac.vercel.app

---

## Features

- 🔐 Secure authentication with Supabase
- 🎙️ Live speech transcription using Azure Speech
- 🤖 AI-generated reply suggestions powered by Azure OpenAI
- 🔊 Text-to-speech communication
- 💬 Saved phrases organized by category
- 🕒 Recent phrase history
- ☁️ Full-stack deployment with Vercel and Railway

---

## Tech Stack

### Frontend
- React
- Vite
- Microsoft Cognitive Services Speech SDK

### Backend
- Node.js
- Express

### Services
- Azure Speech
- Azure OpenAI
- Supabase Authentication

### Deployment
- Vercel
- Railway

---

## Architecture

```text
React (Vercel)
        │
        ▼
Express API (Railway)
        │
        ├── Azure Speech
        ├── Azure OpenAI
        └── Supabase
```

The backend acts as a secure proxy between the frontend and Azure services, ensuring API keys are never exposed in the browser.

---

## Getting Started

### Clone the repository

```bash
git clone https://github.com/programmerprisha/thread.git
cd thread
```

### Install dependencies

```bash
npm install
```

### Configure environment variables

Create a `.env` file:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SERVER_URL=http://localhost:3001

VITE_AZURE_SPEECH_KEY=
VITE_AZURE_SPEECH_REGION=

VITE_AZURE_OPENAI_KEY=
VITE_AZURE_OPENAI_ENDPOINT=
VITE_AZURE_OPENAI_DEPLOYMENT=
```

### Start the backend

```bash
npm start
```

### Start the frontend

```bash
npm run dev
```

---

## Project Structure

```text
thread/
├── src/
│   ├── App.jsx
│   ├── Auth.jsx
│   ├── Auth.css
│   ├── supabase.js
│   └── ...
├── server.js
├── package.json
└── README.md
```

---

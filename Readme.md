# 🍃 AgriCache: AI-Powered Agricultural Logistics & Triage

[![Google Solution Challenge](https://img.shields.io/badge/Google-Solution_Challenge_2026-blue.svg)](#)
[![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED.svg?logo=docker)](#)
[![Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-orange.svg)](#)

---

## 🌍 Overview
**The Problem:** Rural farmers facing crop failure often lack internet access and don't know where to find the specific agricultural supplies needed to save their harvest.  

**The Solution:** AgriCache is an ultra-fast, offline-resilient emergency dispatch system. It converts unstructured farmer distress signals (via voice or text) into structured diagnoses and routes them to the nearest NGO with the required supplies — even on unstable 2G/3G networks.

---

## 🎯 UN Sustainable Development Goals
- **Goal 2: Zero Hunger** → Prevent massive crop loss via rapid disease diagnosis and local supply routing  
- **Goal 9: Industry, Innovation & Infrastructure** → Build a resilient, offline-capable digital infrastructure tailored for rural constraints  

---

## ⚡ Key Features

### 📡 Offline-First PWA (Progressive Web App)
- Service Workers monitor network status and queue failed requests in local storage  
- Auto-syncs and fires the payload when network restores  

### ⚡ Redis Smart Caching
- Detects repeated local outbreaks (e.g., multiple farmers in Patna reporting "Blight")  
- Returns routing results instantly (~0ms)  
- Reduces AI API cost and latency  

### 🎤 Native Voice Input (Vernacular)
- Chrome Web Speech API integration  
- On-device Hindi speech-to-text (`hi-IN`)  
- No external API dependency  

### 🔐 Zero-Trust NGO Supply System
- Secure NGO dashboard for updating supply inventory  
- Protected with **JWT** and **Bcrypt hashing**  
- Prevents malicious data injection  

---

## 🔄 System Architecture Flow
1. Farmer gives input via voice/text 🎤  
2. If offline → store locally, else send to backend 🌐  
3. Backend checks Redis cache ⚡  
4. If not cached → fetch NGO data from PostgreSQL 🐘  
5. Send data to Gemini 2.5 Flash for diagnosis ✨  
6. Return best NGO + solution to farmer 🚚  

---

## 🏗️ Tech Stack

| Layer        | Technology |
|-------------|-----------|
| Frontend    | HTML5, CSS3, JavaScript, PWA |
| Backend     | Node.js, Express.js |
| AI Engine   | Google Gemini 2.5 Flash (`@google/genai`) |
| Cache       | Redis |
| Database    | PostgreSQL |
| Security    | JWT, Bcrypt.js |
| DevOps      | Docker, Docker Compose |

---

## 🚀 Quick Start (Local Setup)

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/agricache.git
cd agricache
```

### 2. Configure Environment Variables
Create a `.env` file:
```env
GEMINI_API_KEY=your_google_gemini_api_key_here
JWT_SECRET=super_secret_hackathon_key
```

### 3. Run the Application
```bash
docker-compose up --build
```

### 4. Seed the Database
```bash
cat init.sql | docker exec -i agricache-db-1 psql -U user -d agricache
```

---

## 🌐 Access the Application
- Farmer Portal: http://localhost:3000  
- NGO Dashboard: http://localhost:3000/ngo-portal.html  

---

## 💡 Why AgriCache Wins
- Works offline-first solving real-world rural constraints  
- Reduces AI cost & latency using smart caching  
- Complete end-to-end logistics system (not just a chatbot)  

---

## 🏁 Future Scope
- Multi-language voice support  
- SMS fallback for non-smartphone users  
- Predictive analytics for early outbreak detection  

---

## 📌 License
MIT License  

---

⭐ *Built for the Google Solution Challenge 2026.*
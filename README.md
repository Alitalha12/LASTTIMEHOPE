# AI Service Orchestrator: Islamabad's Elite Service Pipeline

A production-ready, 8-agent AI orchestration system built for the informal economy. Designed for a national-level hackathon.

## 🌟 Key Features
- **8-Agent Pipeline:** Sequential orchestration from Intent to Follow-up.
- **Multilingual Support:** English, Urdu, and Roman Urdu support.
- **6-Factor Ranking:** Professional provider matching based on rating, distance, and experience.
- **Live Uber-style Tracking:** Vertical status timeline for bookings.
- **Enterprise Security:** JWT Auth + Rate Limiting + ACID Transactions.

## 🚀 Tech Stack
- **Backend:** Node.js, Express, Firebase Firestore.
- **AI:** Google Gemini Flash 1.5.
- **Mobile:** React Native (Expo), Material Design 3.
- **Security:** Bcrypt, JWT, Helmet, Express-Rate-Limit.

## 🔧 Installation

### Prerequisites
- Node.js v18+
- Firebase Project Admin Key
- Google Gemini API Key

### Setup
1. **Clone & Environment:**
   - Add `.env` in `backend/` with `PORT`, `FIREBASE_PROJECT_ID`, `GEMINI_API_KEY`, `JWT_SECRET`.
2. **Backend:**
   ```bash
   cd backend
   npm install
   npm run seed
   npm start
   ```
3. **Frontend:**
   ```bash
   cd frontend
   npm install
   npx expo start
   ```

## 🧠 The 8-Agent Chain
1. **Intent Parser:** NLP extraction.
2. **Dispute Agent:** Issue detection.
3. **Discovery Agent:** DB filtering.
4. **Ranking Agent:** 6-factor scoring.
5. **Pricing Agent:** Quote generation.
6. **Booking Agent:** ACID transactions.
7. **Notification Agent:** Multi-channel dispatch.
8. **Follow-up Agent:** Tracking generation.

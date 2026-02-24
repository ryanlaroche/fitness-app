# FitAI - AI-Powered Fitness Coaching App

FitAI is a full-stack fitness coaching platform that uses Claude AI to deliver personalized workout plans, meal plans, and real-time coaching. Built with Next.js and powered by the Anthropic SDK, it adapts to each user's goals, fitness level, and available equipment.

## Features

### AI-Generated Plans
- **Workout Plans**: Personalized multi-day training programs with exercises, sets, reps, suggested weights, YouTube form links, and progression notes — regenerable on demand.
- **Meal Plans**: 7-day meal plans with carb cycling, macro targets, and auto-generated shopping lists tailored to dietary preferences.

### Progress Tracking
- Log daily weight, lifts (with 1RM estimates), and nutrition
- 30-day weight trend charts and weekly macro averages
- Workout streak tracking and completion history

### Nutrition Logging
- Log meals by type (breakfast, lunch, dinner, snacks)
- Macro estimation (calories, protein, carbs, fat) per meal
- Daily and weekly nutrition overview with progress bars

### Interactive AI Coach
- Real-time streaming chat with Claude Opus 4.6
- Context-aware responses referencing your current plans and profile
- Tool-use capabilities: update equipment, log activities, estimate food macros
- Floating page-level chat widgets for contextual help

### User Onboarding & Profiles
- Guided setup for age, height, weight, gender, fitness level, and primary goal
- Equipment availability (none, dumbbells, home gym, full gym)
- Dietary preferences and health/injury notes

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | SQLite via Prisma ORM |
| Authentication | NextAuth v5 (credentials + JWT) |
| AI | Anthropic SDK (`claude-opus-4-6`) |
| Charts | Recharts |
| Icons | Lucide React |

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables (copy `.env.example` to `.env` and fill in values):
   ```
   DATABASE_URL=file:./dev.db
   NEXTAUTH_SECRET=your-secret
   ANTHROPIC_API_KEY=your-api-key
   ```

3. Initialize the database:
   ```bash
   npx prisma migrate dev
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Project Structure

```
fitness-app/
├── app/                  # Next.js App Router pages and API routes
│   ├── api/              # REST endpoints (auth, generate, chat, logs)
│   ├── chat/             # AI coach chat page
│   ├── diet/             # Nutrition and meal plan page
│   ├── plans/            # Workout plan page
│   ├── progress/         # Progress tracking page
│   ├── onboarding/       # Initial profile setup
│   └── profile/          # Profile management
├── components/           # Reusable React components by feature
├── lib/                  # Shared utilities (Claude client, auth, DB, types)
└── prisma/               # Database schema and migrations
```

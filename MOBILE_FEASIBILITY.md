# Mobile App Feasibility Analysis — FitAI

## Current Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend**: REST API routes (Next.js), PostgreSQL via Prisma ORM
- **Auth**: NextAuth v5 (JWT sessions, Google OAuth, credentials)
- **AI**: Anthropic Claude API (streaming chat, plan generation)
- **Deployment**: Railway.app

## Feasibility Summary

**Difficulty: Moderate** — The app is well-structured for mobile conversion.

The clean separation between API routes and frontend components means a mobile app would be a **new client consuming the existing backend** with no server-side changes required.

## Recommended Approach: React Native (Expo)

Since the frontend is already React + TypeScript, React Native is the most natural path. Both iOS and Android are covered from a single codebase.

### Effort Breakdown

| Area | Effort | Details |
|------|--------|---------|
| UI Components (~17) | Medium | Rewrite from HTML/Tailwind to React Native `View`/`Text`/`ScrollView` + StyleSheet or NativeWind |
| Navigation | Low | Replace Next.js App Router with React Navigation (tab + stack navigators) |
| API Layer | None | Existing REST endpoints work as-is from mobile clients |
| Authentication | Low-Medium | Replace cookie-based NextAuth with token storage via `expo-secure-store`; Google OAuth via `expo-auth-session` |
| Charts (weight trends) | Low | Replace Recharts with `react-native-chart-kit` or `victory-native` |
| AI Chat (streaming) | Low | Streaming fetch works identically on mobile |
| Database | None | PostgreSQL + Prisma backend stays unchanged |
| Radix UI components | Medium | Replace with React Native equivalents (modals, selects, dropdowns) |

### Estimated Timeline

**3–5 weeks** for a single developer familiar with React Native.

## What Makes This Feasible

1. **Clean API separation** — All business logic lives in `/api/` routes; the mobile app just calls the same endpoints
2. **Already responsive** — UI patterns (cards, lists, forms) map well to mobile screens
3. **TypeScript throughout** — Shared type definitions between web and mobile
4. **Stateless JWT auth** — Mobile-friendly by design (no server-side sessions)
5. **No complex web-only features** — No drag-and-drop or heavy DOM manipulation

## What Would Take Work

1. **Rewriting ~17 React components** from JSX + Tailwind to React Native views
2. **App Store setup** — Apple Developer Program ($99/yr) + Google Play Console ($25 one-time)
3. **Push notifications** — New feature for workout/meal reminders (not in web app today)
4. **Offline support** — Optional but expected on mobile; would need local SQLite/AsyncStorage cache
5. **Camera integration** — Native camera access for photo-based food logging

## Alternative Approaches

| Approach | Pros | Cons |
|----------|------|------|
| **React Native (Expo)** | Shared React/TS skills, single codebase for iOS + Android, OTA updates | Must rewrite UI components |
| **PWA** | Minimal code changes (~1-2 days), works immediately | No App Store presence, limited iOS push notifications, no native feel |
| **Capacitor** | Wraps existing Next.js in a WebView, very fast to ship | Performance feels "webby", limited native API access |
| **Flutter** | Excellent native performance and UI | Complete rewrite in Dart, zero code reuse |

## Recommended Strategy

1. **Short term (1–2 days)**: Add PWA support (manifest.json + service worker) for instant mobile access via browser
2. **Medium term (3–5 weeks)**: Build a React Native (Expo) app for full native experience on both platforms
3. **Long term**: Add mobile-specific features (push notifications, offline mode, camera food logging)

## Architecture for Mobile

```
┌─────────────────┐     ┌─────────────────┐
│   Next.js Web   │     │  React Native   │
│   (existing)    │     │  Mobile App     │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
          ┌──────────▼──────────┐
          │   Shared REST API   │
          │  (Next.js /api/*)   │
          └──────────┬──────────┘
                     │
          ┌──────────▼──────────┐
          │    PostgreSQL DB    │
          │   (Prisma ORM)     │
          └──────────┬──────────┘
                     │
          ┌──────────▼──────────┐
          │   Claude AI API    │
          │  (Anthropic SDK)   │
          └────────────────────┘
```

Both clients share the same backend — no duplication of business logic.

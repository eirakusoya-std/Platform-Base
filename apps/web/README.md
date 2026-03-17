## Aiment Web

Next.js app for listener auth, VTuber studio flow, stream session APIs, and reservation handling.

## Getting Started

1. Copy `.env.example` to `.env.local`
2. Start the development server

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Reservation API

- `GET /api/reservations`
  returns the current user's reservations
- `GET /api/reservations?sessionId=...`
  listener: returns their reservation for that session
  vtuber: returns reservations for their own session
- `POST /api/reservations`
  creates a reservation for a `prelive` first-come session
- `DELETE /api/reservations/:reservationId`
  cancels the caller's reservation

Reservation rules:

- only authenticated listeners can reserve
- duplicate reservation for the same session is rejected
- first-come sessions only
- full sessions are rejected

## Production API Settings

API routes are protected by middleware-based CORS and in-memory rate limiting.

Environment variables:

- `NEXT_PUBLIC_APP_URL`
  primary app origin
- `AIMENT_ALLOWED_ORIGINS`
  comma-separated extra origins allowed for `/api/*`
- `AIMENT_RATE_LIMIT_WINDOW_MS`
  rate-limit window in milliseconds
- `AIMENT_RATE_LIMIT_MAX`
  default API requests per window
- `AIMENT_AUTH_RATE_LIMIT_MAX`
  stricter limit for `/api/auth/*`
- `AIMENT_RESERVATION_RATE_LIMIT_MAX`
  stricter limit for `/api/reservations*`

Current rate limiting is process-memory based. It is suitable for a single instance or staging. For multi-instance production, move the limiter to Redis or the deployment platform's native edge rate limiting.

# UW Hot Takes

UW Hot Takes is an anonymous social platform where Waterloo students can post hot takes and see what others are saying in real time.

The motivation behind this project was to create a lightweight space for sharing thoughts without profiles, follower counts, or personal branding. No bios, no curated identity — just opinions. Everyone gets an auto-generated anonymous username, and the focus stays on the content rather than who posted it.

Users can post takes, like and comment on others, and watch the feed update live as new activity happens.

## LIVE WEBSITE

https://uwhottakes.com

## Tech Stack

### Backend

- **FastAPI (Python)** — REST API and WebSocket endpoints
- **PostgreSQL with async SQLAlchemy** — database
- **Redis** — pub/sub for real-time updates and rate limiting
- **JWT via cookies** — session authentication
- **Alembic** — database migrations
- **Fly** — hosting

### Frontend

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Vercel** — hosting

## Real-Time

- **WebSocket** connections for live updates (new takes, likes, comments, deletes)
- **Redis pub/sub** to broadcast events across backend instances
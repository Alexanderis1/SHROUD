# SHROUD

**SHROUD** is an AR-powered platform that enhances real-world experiences through technology — allowing users to discover the hidden history layered beneath any location, and engage with a global community of hackers, historians, and designers through hackathons and events.

## Features

- **Historical Discovery** — Browse 2,400+ curated historical sites with rich context, timelines, and AR-ready metadata. Filter by era, category, and location.
- **AR Time Layers** — Walk through any city and experience multiple historical eras overlaid on the real world via your device's camera.
- **AI Narrative Engine** — AI-generated narration adapts to each location and user preference, from academic depth to immersive storytelling.
- **Community Events** — Discover hackathons, workshops, conferences, and meetups that build the future of heritage technology.
- **World Map** — Interactive globe visualising all historical sites and community events, with full popup context for every marker.

## Tech Stack

- **React 19** + **TypeScript**
- **Vite 6** (fast dev/build)
- **Tailwind CSS v4** (utility-first styling)
- **Leaflet** (interactive maps via OpenStreetMap)
- **React Router v7** (client-side routing)
- **Lucide React** (icon system)

## Getting Started

```bash
npm install
npm run dev       # start dev server at localhost:5173
npm run build     # production build → dist/
npm run preview   # preview production build
```

## Project Structure

```
src/
├── components/
│   ├── Navbar.tsx          # sticky navigation
│   ├── SiteCard.tsx        # historical site card with expandable facts
│   ├── EventCard.tsx       # community event card with capacity bar
│   └── InteractiveMap.tsx  # Leaflet map with custom markers
├── data/
│   ├── historicalSites.ts  # curated site data
│   └── communityEvents.ts  # hackathon & event data
├── pages/
│   ├── Home.tsx            # landing page
│   ├── Discover.tsx        # searchable site browser
│   ├── Events.tsx          # event browser with filters
│   └── MapView.tsx         # world map
└── types/
    └── index.ts            # shared TypeScript types
```

## License

Apache 2.0 — see [LICENSE](LICENSE).

# CCTV Dashboard Frontend Documentation

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Folder Structure](#folder-structure)
4. [Main Features](#main-features)
5. [Key Components](#key-components)
6. [API Integration](#api-integration)
7. [Analytics & Visualization](#analytics--visualization)
8. [Styling & Theming](#styling--theming)
9. [How to Run](#how-to-run)
10. [Deployment](#deployment)
11. [Troubleshooting](#troubleshooting)
12. [Dependencies](#dependencies)
13. [Notes & Limitations](#notes--limitations)

---

## 1. Overview

This frontend is a modern web dashboard for real-time CCTV weapon detection and analytics. Built with Next.js and React, it provides live video feeds, incident alerts, analytics, and user-friendly controls for security monitoring.

---

## 2. System Architecture

- **Framework:** Next.js (React, TypeScript)
- **UI:** Tailwind CSS for styling, custom components for dashboard widgets
- **API Integration:** Communicates with the backend via REST and WebSocket
- **State Management:** React hooks and context (if used)
- **Build Tooling:** Uses Next.js build system, supports SSR and static export

---

## 3. Folder Structure

```
frontend/
├── app/                # Next.js app directory (routing, pages)
├── components/         # Reusable React components
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries and API clients
├── public/             # Static assets (images, icons)
├── styles/             # Tailwind and global CSS
├── cctv-dashboard.tsx  # Main dashboard page/component
├── cctv-analytics.tsx  # Analytics page/component
├── package.json        # Project metadata and scripts
├── README.md           # Project overview and usage
└── documentation.md    # This documentation file
```

---

## 4. Main Features

- **Live Video Feed:** Real-time CCTV stream from backend
- **Incident Alerts:** Display of weapon detection incidents as they occur
- **Analytics Dashboard:** Visualizations of incident trends and distributions
- **WebSocket Integration:** Real-time updates for new incidents
- **Responsive UI:** Works on desktop and mobile devices
- **Settings & Controls:** Toggle notifications, filter incidents, etc.

---

## 5. Key Components

- **cctv-dashboard.tsx**
  - Main dashboard interface
  - Displays live video, incident list, and alert notifications
  - Integrates with WebSocket for real-time updates

- **cctv-analytics.tsx**
  - Analytics and reporting page
  - Shows charts/graphs for incident timeline and distribution

- **components/**
  - Contains reusable UI elements (e.g., IncidentCard, VideoPlayer, Chart components)

- **hooks/**
  - Custom React hooks for API calls, WebSocket connections, and state management

- **lib/**
  - Utility functions and API clients (e.g., fetchers, data formatters)

---

## 6. API Integration

- **Video Feed:**
  - Fetches MJPEG stream from backend `/video` endpoint
  - Embedded in dashboard via `<img src="/api/video" />` or similar

- **Incidents:**
  - Fetches incident history from `/incidents` endpoint (REST)
  - Subscribes to `/ws/incidents` WebSocket for real-time updates

- **Analytics:**
  - Fetches timeline and distribution data from `/analytics/incidents/timeline` and `/analytics/incidents/distribution`

- **Settings:**
  - Reads and updates notification settings via `/settings/notifications`

- **Telegram:**
  - Displays subscriber count from `/telegram/subscribers`

---

## 7. Analytics & Visualization

- **Charts:**
  - Timeline of incidents (by day/month)
  - Distribution by weapon type, location, or camera
- **Libraries:**
  - Likely uses a charting library (e.g., Chart.js, Recharts, or similar)
- **Filtering:**
  - Date range and category filters for analytics

---

## 8. Styling & Theming

- **Tailwind CSS:** Utility-first CSS framework for rapid UI development
- **Custom Themes:** Configurable in `tailwind.config.ts`
- **Responsive Design:** Mobile-friendly layouts

---

## 9. How to Run

1. **Install dependencies:**
   ```bash
   npm install
   # or
   pnpm install
   ```
2. **Start the development server:**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```
3. **Access the app:**
   Open [http://localhost:3000](http://localhost:3000) in your browser

---

## 10. Deployment

- **Build for production:**
  ```bash
  npm run build
  npm run start
  # or
  pnpm build
  pnpm start
  ```
- **Static Export:**
  - Use `next export` for static hosting if SSR is not required
- **Hosting:**
  - Can be deployed to Vercel, Netlify, or any Node.js-compatible server
- **Environment Variables:**
  - Configure backend API URLs as needed for production

---

## 11. Troubleshooting

- **API Not Responding:**
  - Check backend server is running and accessible
  - Verify API URLs in frontend match backend host/port

- **WebSocket Not Connecting:**
  - Ensure backend WebSocket endpoint is reachable
  - Check for CORS or network issues

- **Video Feed Not Displaying:**
  - Confirm backend `/video` endpoint is live
  - Check browser console for errors

- **Styling Issues:**
  - Ensure Tailwind CSS is properly configured and built

- **Build Errors:**
  - Delete `node_modules` and reinstall dependencies
  - Check TypeScript errors in the console

---

## 12. Dependencies

- Next.js
- React
- TypeScript
- Tailwind CSS
- Charting library (e.g., Chart.js, Recharts)
- Other dependencies as listed in `package.json`

Install all dependencies with:
```bash
npm install
# or
pnpm install
```

---

## 13. Notes & Limitations

- Assumes backend API is available and CORS is configured
- No authentication by default (add for production security)
- Analytics and video feed depend on backend availability
- WebSocket and REST endpoints must be reachable from the client
- For best results, use a modern browser

---

*End of documentation.* 
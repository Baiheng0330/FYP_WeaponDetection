# Security Command Center Frontend

This is the frontend for the Real-Time Weapon Detection and Security Command Center. It provides a modern dashboard interface for monitoring live camera feeds, viewing security incidents, and managing system controls. The frontend is built with Next.js, React, and Tailwind CSS, and is designed to work seamlessly with the [YOLOv8-based backend](../backend/README.md).

## Features
- **Live Camera Feed:** Real-time MJPEG video stream from the backend.
- **Incidents Dashboard:** View a table of detected weapon incidents with images, timestamps, camera, and location details.
- **System Controls:** Toggle alert notifications, motion detection, night vision, and auto recording.
- **Real-Time Alerts:** See the current alert count and incident updates (auto-refresh).
- **Responsive UI:** Modern, mobile-friendly design using Tailwind CSS and shadcn/ui components.
- **Image Modal:** Click incident images to view enlarged versions.
- **Status & Stats:** System status, storage usage, network status, and last backup info.

## Project Structure
- `app/` - Next.js app directory (main entry: `page.tsx` renders the dashboard)
- `cctv-dashboard.tsx` - Main dashboard component (used as the homepage)
- `components/` - Reusable UI components (shadcn/ui)
- `hooks/`, `lib/` - Custom hooks and utilities
- `styles/`, `app/globals.css` - Tailwind and global styles

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or pnpm
- Backend server running (see [backend/README.md](../backend/README.md))

### Installation
1. Install dependencies:
   ```bash
   npm install
   # or
   pnpm install
   ```
2. Copy or ensure your backend is running at `http://localhost:8000` (default, or update `BACKEND_URL` in the code if needed).

### Running the Development Server
```bash
npm run dev
# or
pnpm dev
```
Visit [http://localhost:3000](http://localhost:3000) to view the dashboard.

### Building for Production
```bash
npm run build
npm start
```

## Backend Integration
The frontend expects the backend to provide the following endpoints:
- `GET /video` - MJPEG video stream (live feed)
- `GET /incidents` - List of incidents (JSON)
- `GET /alerts` - Current alert count
- `GET /settings/notifications` - Get notification settings
- `POST /settings/notifications` - Toggle notifications
- Incident images are served at `/incidents/{image_id}.jpg`

See [backend/README.md](../backend/README.md) for more details.

## Customization
- **Theme & UI:** Uses Tailwind CSS with custom themes (see `tailwind.config.ts` and `globals.css`).
- **Component Library:** Built with [shadcn/ui](https://ui.shadcn.com/) and [lucide-react](https://lucide.dev/).
- **Aliases:** Path aliases are set in `tsconfig.json` and `components.json` (e.g., `@/components`).
- **Environment:** To change the backend URL, update the `BACKEND_URL` constant in the dashboard components.

## Scripts
- `dev` - Start development server
- `build` - Build for production
- `start` - Start production server
- `lint` - Lint the codebase

## Dependencies
- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [lucide-react](https://lucide.dev/)

## License
MIT 
# Docker Documentation for FYP Weapon Detection Dashboard

This project uses Docker to containerize both the backend (FastAPI + YOLO/RTDETR + Telegram integration) and the frontend (Next.js dashboard) for easy deployment and reproducibility.

## Prerequisites
- [Docker](https://www.docker.com/products/docker-desktop) installed on your system
- [Docker Compose](https://docs.docker.com/compose/) (usually included with Docker Desktop)

## Project Structure
```
FYP_dashboard/
├── backend/         # FastAPI backend, YOLO/RTDETR models, Telegram bot
├── frontend/        # Next.js frontend dashboard
├── docker-compose.yml
```

## Docker Compose Overview
The `docker-compose.yml` file orchestrates both the backend and frontend services:
- **backend**: Runs the FastAPI server, handles camera input, detection, database, and Telegram alerts.
- **frontend**: Runs the Next.js dashboard for analytics and live video feed.

## Usage

### 1. Build and Start All Services
From the root directory (`FYP_dashboard/`):

```powershell
# Build and start containers in the background
docker-compose up --build -d
```

- The backend will be available at `http://localhost:8000`
- The frontend will be available at `http://localhost:3000`

### 2. Stopping Services
```powershell
docker-compose down
```

### 3. Viewing Logs
```powershell
# Backend logs
docker-compose logs backend

# Frontend logs
docker-compose logs frontend
```

### 4. Rebuilding After Code Changes
```powershell
docker-compose up --build -d
```

## Backend Dockerfile
- Located at `backend/Dockerfile`
- Installs Python dependencies from `requirements.txt`
- Exposes port 8000
- Runs the FastAPI app

## Frontend Dockerfile
- Located at `frontend/Dockerfile`
- Installs Node.js dependencies
- Builds and serves the Next.js app
- Exposes port 3000

## Environment Variables
- Set sensitive values (e.g., `TELEGRAM_BOT_TOKEN`) in your environment or use Docker secrets.
- You can pass environment variables in `docker-compose.yml` or via a `.env` file.

## Persistent Data
- The backend stores incident images and the SQLite database in the `backend/incidents/` and `backend/incidents.db` files. These can be mapped to Docker volumes for persistence.

## Example docker-compose.yml
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend/incidents:/app/incidents
      - ./backend/incidents.db:/app/incidents.db
    environment:
      - TELEGRAM_BOT_TOKEN=your_token_here
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
    restart: unless-stopped
```

## Troubleshooting
- Ensure your camera device is accessible to the backend container (may require extra configuration on Windows).
- Check logs for errors: `docker-compose logs backend` or `frontend`.
- For GPU acceleration, additional Docker configuration is required (see [NVIDIA Docker](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html)).

## References
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)

---
For further details, see the `README.md` files in the `backend/` and `frontend/` directories.

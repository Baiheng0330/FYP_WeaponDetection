# Weapon Detection System Backend Documentation

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Configuration](#configuration)
4. [Main Components](#main-components)
    - [Camera Worker](#camera-worker)
    - [Incident Management](#incident-management)
    - [Telegram Bot Integration](#telegram-bot-integration)
    - [WebSocket & REST API](#websocket--rest-api)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Notification Settings](#notification-settings)
8. [Analytics](#analytics)
9. [File Structure](#file-structure)
10. [How to Run](#how-to-run)
11. [Dependencies](#dependencies)
12. [Notes & Limitations](#notes--limitations)

---

## 1. Overview

This backend system is designed for real-time weapon detection using a YOLO-based deep learning model. It captures video from a camera, detects weapons, stores incidents, and sends alerts to subscribed Telegram users. The system also provides a REST API and WebSocket for real-time updates and analytics.

---

## 2. System Architecture

- **Camera Feed**: Captured via OpenCV from a specified camera.
- **Detection Model**: YOLOv8 (or RTDETR) model for object detection.
- **Incident Management**: Detected weapon incidents are stored in a SQLite database and as images.
- **Notification System**: Alerts are sent to Telegram subscribers.
- **API Layer**: FastAPI provides REST and WebSocket endpoints for frontend integration.

---

## 3. Configuration

- `CAMERA_ID`: Camera index (default: 0)
- `CAMERA_LABEL`: Label for the camera (default: "Camera 1")
- `INCIDENTS_DIR`: Directory to store incident images
- `WEAPON_LABELS`: List of labels considered as weapons (e.g., ["pistol", "knife"])
- `CONFIDENCE_THRESHOLD`: Minimum confidence for detection to be considered valid (default: 0.75)
- `DUPLICATE_TIME_WINDOW`: Time window (seconds) to suppress duplicate incidents (default: 10)
- `BOT_TOKEN`: Telegram bot token (from environment variable or hardcoded)
- `SUBSCRIPTIONS_FILE`: File to store Telegram subscriber chat IDs
- `CAMERA_LOCATION_MAP`: Maps camera labels to human-readable locations
- `DATABASE_URL`: SQLite database file (default: incidents.db)

---

## 4. Main Components

### Camera Worker
- Captures frames from the camera using OpenCV.
- Runs the YOLO model on each frame.
- Draws bounding boxes and labels for detected objects.
- If a weapon is detected with confidence above the threshold, saves the incident (image + metadata) and queues it for notification.
- Suppresses duplicate incidents within a configurable time window.

### Incident Management
- Incidents are stored in a SQLite database with fields: id, timestamp, camera, camera_name, location, label, confidence, image.
- Images are saved in the `incidents/` directory.
- Incidents are exposed via REST API and WebSocket for real-time updates.

### Telegram Bot Integration
- Uses `python-telegram-bot` for bot functionality.
- Supports commands: `/start`, `/subscribe`, `/unsubscribe`, `/status`, `/help`.
- Manages a list of subscribed chat IDs (persisted in a JSON file).
- Sends alerts (with image and details) to all subscribers when a new incident occurs.
- Allows toggling notifications on/off via API.

### WebSocket & REST API
- Provides a WebSocket endpoint for real-time incident updates.
- REST endpoints for video feed, incident history, analytics, notification settings, and Telegram subscriber management.

---

## 5. Database Schema

**Table: incidents**
| Column      | Type   | Description                       |
|-------------|--------|-----------------------------------|
| id          | String | Unique incident ID (UUID)         |
| timestamp   | String | Date and time of incident         |
| camera      | String | Camera label                      |
| camera_name | String | Human-readable camera name        |
| location    | String | Location description              |
| label       | String | Detected object label             |
| confidence  | Float  | Detection confidence (0-1)        |
| image       | String | Path to saved incident image      |

---

## 6. API Endpoints

### Video & Incidents
- `GET /video` — MJPEG video stream of the camera feed.
- `GET /incidents` — List all incidents (optionally filter by date).
- `GET /incidents?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` — Filter incidents by date range.
- `GET /incidents/{image}` — Serve incident images (static files).

### WebSocket
- `WS /ws/incidents` — Real-time push of new incidents to connected clients.

### Telegram
- `GET /telegram/subscribers` — Get count of Telegram subscribers.

### Notification Settings
- `GET /settings/notifications` — Get current notification enabled/disabled state.
- `POST /settings/notifications` — Update notification enabled/disabled state (JSON: `{ "enabled": true/false }`).

### Analytics
- `GET /analytics/incidents/timeline?granularity=day|month` — Get incident counts grouped by day or month.
- `GET /analytics/incidents/distribution?by=label|location|camera_name` — Get incident counts grouped by label, location, or camera.

### Alerts
- `GET /alerts` — Get total number of alerts/incidents.

---

## 7. Notification Settings
- Notifications can be enabled/disabled via the `/settings/notifications` endpoint.
- When disabled, no Telegram alerts are sent, but incidents are still recorded.

---

## 8. Analytics
- Timeline and distribution analytics are available via API.
- Timeline: Number of incidents per day or month.
- Distribution: Number of incidents by label, location, or camera.

---

## 9. File Structure

```
backend/
├── main.py                # Main backend application (FastAPI, detection, Telegram)
├── incidents/             # Directory for incident images
├── incidents.db           # SQLite database file
├── telegram_subscriptions.json # Telegram subscriber list
└── documentation.md       # This documentation file
```

---

## 10. How to Run

1. **Install dependencies** (see below).
2. **Place YOLO model weights** (e.g., `bestyolov11.pt`) in the backend directory.
3. **Set Telegram Bot Token** as environment variable `TELEGRAM_BOT_TOKEN` (or edit in code).
4. **Run the backend**:
   ```bash
   python main.py
   ```
5. **Access API** at `http://localhost:8000` (or configured host/port).

---

## 11. Dependencies
- Python 3.8+
- FastAPI
- uvicorn
- python-telegram-bot
- SQLAlchemy
- ultralytics (YOLO)
- OpenCV
- numpy

Install with:
```bash
pip install fastapi uvicorn python-telegram-bot sqlalchemy ultralytics opencv-python numpy
```

---

## 12. Notes & Limitations
- Only one camera is supported by default (can be extended).
- Model weights must be compatible with ultralytics YOLO API.
- Telegram bot must be set up and token provided.
- No authentication on API endpoints (add for production use).
- Error handling is basic; production deployments should improve robustness.
- Linter errors in the code (see comments in code or linter output) should be addressed for full type safety and reliability.

---

## 13. Troubleshooting

### Common Issues & Solutions

- **Camera Not Detected**
  - Ensure the correct `CAMERA_ID` is set and the camera is connected.
  - Check camera permissions and drivers.

- **YOLO Model Not Loading**
  - Verify the model weights file (e.g., `bestyolov11.pt`) exists in the backend directory.
  - Ensure the `ultralytics` package is installed and compatible with your weights.

- **Telegram Bot Not Sending Alerts**
  - Confirm the bot token is correct and the bot is started in Telegram.
  - Check for network/firewall issues blocking Telegram API access.
  - Ensure notifications are enabled via the `/settings/notifications` endpoint.

- **Database Errors**
  - Ensure the backend has write permissions to create and modify `incidents.db`.
  - Delete or backup a corrupted database and restart the backend.

- **WebSocket/REST API Not Responding**
  - Make sure the backend is running and accessible at the expected host/port.
  - Check for CORS issues if accessing from a different domain.

- **Linter Errors**
  - Review linter output for type or attribute errors, especially with Telegram and SQLAlchemy usage.
  - Update dependencies to the latest versions if you encounter compatibility issues.

### Logs
- All backend logs are output to the console. Review logs for error messages and stack traces.

---

## 14. Deployment

### Local Deployment
1. Install all dependencies (see [Dependencies](#dependencies)).
2. Place model weights and set up environment variables as needed.
3. Run the backend:
   ```bash
   uvicorn main:app --reload
   ```
   or
   ```bash
   python main.py
   ```
4. Ensure the `incidents/` directory is writable.

### Production Deployment
- Use a production ASGI server such as `gunicorn` with `uvicorn` workers:
  ```bash
  gunicorn -k uvicorn.workers.UvicornWorker main:app
  ```
- Set up a process manager (e.g., systemd, supervisor) to keep the backend running.
- Use HTTPS and configure a reverse proxy (e.g., Nginx) for secure access.
- Secure the API endpoints (authentication, rate limiting) for production use.
- Regularly back up the `incidents.db` database and `incidents/` images.

### Environment Variables
- `TELEGRAM_BOT_TOKEN`: Telegram bot token (required for Telegram integration)

---

## 15. Frontend Integration

### Video Feed
- Access the live video stream at `GET /video` (MJPEG stream).
- Embed in HTML using an `<img>` tag with the stream URL as the `src`.

### Real-Time Incidents
- Connect to the WebSocket endpoint `/ws/incidents` to receive new incidents as JSON in real time.
- Example (JavaScript):
  ```js
  const ws = new WebSocket('ws://localhost:8000/ws/incidents');
  ws.onmessage = (event) => {
    const incident = JSON.parse(event.data);
    // Update UI with new incident
  };
  ```

### Incident History & Analytics
- Fetch incidents via `GET /incidents` (optionally filter by date).
- Fetch analytics via `/analytics/incidents/timeline` and `/analytics/incidents/distribution`.

### Telegram Integration
- Users can interact with the Telegram bot for real-time alerts and subscription management.
- The backend manages subscriptions and sends alerts automatically.

### Example Frontend Stack
- React, Vue, or plain HTML/JS can be used to build a dashboard.
- Use REST endpoints for data, WebSocket for real-time updates, and embed the video stream.

---

*End of extended documentation.* 
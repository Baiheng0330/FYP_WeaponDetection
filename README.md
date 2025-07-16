# Weapon Detection Backend

This backend uses YOLOv8,YOLOv11,Baidu RT-DETR to detect weapons (pistol, knife) in real-time from a webcam and provides a FastAPI server for a monitoring dashboard. It also supports real-time Telegram alerts and notification management.

## Features
- Real-time webcam video feed
- Weapon detection (pistol, knife)
- Incident logging with screenshot, label, camera, confidence, and timestamp
- REST API for incidents
- MJPEG video stream
- WebSocket for real-time incident updates
- Telegram alert integration (subscribe/unsubscribe via bot)
- Notification settings (enable/disable alerts)
- Incident image hosting
- CORS enabled for all origins

## Setup

1. **Clone this repo and enter the backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Download YOLO weights:**
   - Place your YOLO weights file (e.g., `best.pt`) in the `backend` directory.
   - You can train your own or download from [Ultralytics](https://github.com/ultralytics/ultralytics).

4. **Set up Telegram Bot (optional for alerts):**
   - Create a bot via [BotFather](https://t.me/botfather) and get the token.
   - Set the token as an environment variable `TELEGRAM_BOT_TOKEN` or edit the default in `main.py`.
   - Start the backend to enable Telegram alerting.

5. **Run the server:**
   ```bash
   uvicorn main:app --reload
   ```

## Endpoints

- **Live Video Feed:**
  - `GET /video` (MJPEG stream)
- **Incident List:**
  - `GET /incidents` (JSON)
- **Incident Images:**
  - `/incidents/{image_id}.jpg` (static files)
- **WebSocket for Real-Time Incidents:**
  - `ws://localhost:8000/ws/incidents`
- **Alerts Count:**
  - `GET /alerts` (JSON: `{alerts: <count>}`)
- **Telegram Subscribers Count:**
  - `GET /telegram/subscribers` (JSON: `{subscribers: <count>}`)
- **Notification Settings:**
  - `GET /settings/notifications` (JSON: `{enabled: true/false}`)
  - `POST /settings/notifications` (body: `{enabled: true/false}`)

## Telegram Bot
- Users can subscribe/unsubscribe to real-time alerts via Telegram commands:
  - `/start`, `/subscribe`, `/unsubscribe`, `/status`, `/help`
- Alerts include incident details and images (if available).
- Subscriptions are persisted in `telegram_subscriptions.json`.

## Configuration
- **Camera:** Uses the first webcam by default (`CAMERA_ID = 0`).
- **Detection:** Labels and confidence threshold can be adjusted in `main.py` (`WEAPON_LABELS`, `CONFIDENCE_THRESHOLD`).
- **Incidents:** Saved in the `incidents/` folder.
- **Notification:** Alerts can be enabled/disabled via API or in code (`notification_enabled`).
- **Telegram:** Set `TELEGRAM_BOT_TOKEN` as env variable or in code.
- **Camera Location:** Map camera labels to locations in `CAMERA_LOCATION_MAP` in `main.py`.

## Dependencies
- fastapi
- uvicorn
- opencv-python
- ultralytics
- python-telegram-bot
- websockets
- python-multipart

## Notes
- CORS is enabled for all origins (for dashboard integration).
- The backend is designed for real-time monitoring and alerting in security scenarios.
- For customizations, edit `main.py` as needed. 

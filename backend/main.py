import cv2
import time
import threading
import os
import json
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Response, Request, Query
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO, RTDETR
from typing import List, Dict, Set, Optional
from datetime import datetime
import uuid
import queue
import asyncio
from telegram import Update, Bot
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from telegram.constants import ParseMode
from sqlalchemy import create_engine, Column, String, Float, DateTime, func
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker

# Configure logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# --- CONFIG ---
CAMERA_ID = 0  # 0 for default webcam
CAMERA_LABEL = "Camera 1"
INCIDENTS_DIR = "incidents"
WEAPON_LABELS = ["pistol", "knife"]
CONFIDENCE_THRESHOLD = 0.78
DUPLICATE_TIME_WINDOW = 10  # seconds

# Telegram config
BOT_TOKEN = str(os.getenv('TELEGRAM_BOT_TOKEN', 'YOUR_TOKEN'))
SUBSCRIPTIONS_FILE = "telegram_subscriptions.json"

# Camera to location map
CAMERA_LOCATION_MAP = {
    "Camera 1": {"name": "Main Entrance", "location": "Building A - Front"}
}

# --- SETUP ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if not os.path.exists(INCIDENTS_DIR):
    os.makedirs(INCIDENTS_DIR)

# Load YOLOv8 model (assume weights are in 'yolov8.pt')
#model = RTDETR("bestRTDETR.pt")
model = YOLO("bestyolov11.pt")

# --- GLOBALS ---
clients: List[WebSocket] = []
latest_frame = None
frame_lock = threading.Lock()
incident_queue = queue.Queue()

# Telegram globals
subscribed_chats: Set[str] = set()
telegram_alert_queue = queue.Queue()

# Notification settings
notification_enabled = True  # Default to enabled
notification_lock = threading.Lock()

# --- DATABASE SETUP ---
DATABASE_URL = "sqlite:///incidents.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Incident(Base):
    __tablename__ = "incidents"
    id = Column(String, primary_key=True, index=True)
    timestamp = Column(String, index=True)
    camera = Column(String)
    camera_name = Column(String)
    location = Column(String)
    label = Column(String)
    confidence = Column(Float)
    image = Column(String)

Base.metadata.create_all(bind=engine)

# --- TELEGRAM FUNCTIONS ---
def load_subscriptions():
    """Load subscriptions from file."""
    global subscribed_chats
    try:
        if os.path.exists(SUBSCRIPTIONS_FILE):
            with open(SUBSCRIPTIONS_FILE, 'r') as f:
                data = json.load(f)
                subscribed_chats = set(data.get('subscriptions', []))
    except Exception as e:
        logger.error(f"Failed to load subscriptions: {e}")
        subscribed_chats = set()

def save_subscriptions():
    """Save subscriptions to file."""
    try:
        with open(SUBSCRIPTIONS_FILE, 'w') as f:
            json.dump({'subscriptions': list(subscribed_chats)}, f)
    except Exception as e:
        logger.error(f"Failed to save subscriptions: {e}")

def subscribe_chat(chat_id: str) -> bool:
    """Subscribe a chat ID to alerts."""
    subscribed_chats.add(chat_id)
    save_subscriptions()
    logger.info(f"Chat {chat_id} subscribed to alerts")
    return True

def unsubscribe_chat(chat_id: str) -> bool:
    """Unsubscribe a chat ID from alerts."""
    if chat_id in subscribed_chats:
        subscribed_chats.remove(chat_id)
        save_subscriptions()
        logger.info(f"Chat {chat_id} unsubscribed from alerts")
        return True
    return False

def get_subscribed_chats() -> Set[str]:
    """Get all subscribed chat IDs."""
    return subscribed_chats.copy()

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command."""
    chat_id = str(update.effective_chat.id)
    subscribe_chat(chat_id)
    
    message = (
        "🤖 *Welcome to Weapon Detection Alert Bot!*\n\n"
        "✅ You have been subscribed to weapon detection alerts!\n\n"
        "You will now receive notifications when weapons are detected by our security system.\n\n"
        "*Available Commands:*\n"
        "• /subscribe - Subscribe to alerts\n"
        "• /unsubscribe - Unsubscribe from alerts\n"
        "• /status - Check subscription status\n"
        "• /help - Show help message\n\n"
        "⚠️ This bot is for security monitoring purposes only."
    )
    
    await update.message.reply_text(message, parse_mode=ParseMode.MARKDOWN)

async def subscribe_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /subscribe command."""
    chat_id = str(update.effective_chat.id)
    subscribe_chat(chat_id)
    
    message = (
        "✅ *Subscribed Successfully!*\n\n"
        "You will now receive weapon detection alerts.\n"
        "Use /unsubscribe to stop receiving alerts."
    )
    
    await update.message.reply_text(message, parse_mode=ParseMode.MARKDOWN)

async def unsubscribe_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /unsubscribe command."""
    chat_id = str(update.effective_chat.id)
    
    if unsubscribe_chat(chat_id):
        message = (
            "❌ *Unsubscribed Successfully!*\n\n"
            "You will no longer receive weapon detection alerts.\n"
            "Use /subscribe to start receiving alerts again."
        )
    else:
        message = "ℹ️ You were not subscribed to alerts."
    
    await update.message.reply_text(message, parse_mode=ParseMode.MARKDOWN)

async def status_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /status command."""
    chat_id = str(update.effective_chat.id)
    is_subscribed = chat_id in subscribed_chats
    
    status_emoji = "✅" if is_subscribed else "❌"
    status_text = "subscribed" if is_subscribed else "not subscribed"
    
    message = f"{status_emoji} You are currently *{status_text}* to weapon detection alerts."
    
    await update.message.reply_text(message, parse_mode=ParseMode.MARKDOWN)

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /help command."""
    message = (
        "🤖 *Weapon Detection Bot Help*\n\n"
        "*Available Commands:*\n"
        "• /start - Start the bot and subscribe\n"
        "• /subscribe - Subscribe to weapon detection alerts\n"
        "• /unsubscribe - Unsubscribe from alerts\n"
        "• /status - Check your subscription status\n"
        "• /help - Show this help message\n\n"
        "*About:*\n"
        "This bot sends real-time alerts when weapons are detected by our AI security system.\n\n"
        "⚠️ For security monitoring purposes only."
    )
    
    await update.message.reply_text(message, parse_mode=ParseMode.MARKDOWN)

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle non-command messages."""
    message = (
        "ℹ️ I only respond to commands. Use /help to see available commands."
    )
    await update.message.reply_text(message)

def telegram_worker():
    """Worker thread for handling Telegram bot and alerts."""
    async def main():
        # Create bot application
        application = Application.builder().token(BOT_TOKEN).build()
        
        # Add handlers
        application.add_handler(CommandHandler("start", start_command))
        application.add_handler(CommandHandler("subscribe", subscribe_command))
        application.add_handler(CommandHandler("unsubscribe", unsubscribe_command))
        application.add_handler(CommandHandler("status", status_command))
        application.add_handler(CommandHandler("help", help_command))
        application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
        
        # Initialize and start bot
        await application.initialize()
        await application.start()
        await application.updater.start_polling()
        
        logger.info("Telegram bot started successfully")
        
        # Process alert queue
        while True:
            try:
                # Check for new alerts (non-blocking)
                try:
                    incident = telegram_alert_queue.get_nowait()
                    await send_incident_alert(application.bot, incident)
                except queue.Empty:
                    pass
                
                await asyncio.sleep(0.1)  # Small delay to prevent busy waiting
                
            except Exception as e:
                logger.error(f"Error in telegram worker: {e}")
                await asyncio.sleep(1)
    
    # Run the async main function
    try:
        asyncio.run(main())
    except Exception as e:
        logger.error(f"Telegram worker error: {e}")

async def send_incident_alert(bot: Bot, incident: dict):
    """Send incident alert to all subscribed chats."""
    # Check if notifications are enabled
    with notification_lock:
        if not notification_enabled:
            logger.info("Notifications disabled, skipping Telegram alert")
            return
    
    if not subscribed_chats:
        logger.info("No subscribers for incident alerts")
        return
    
    # Format the incident message
    timestamp = incident.get('timestamp', 'Unknown')
    location = incident.get('location', 'Unknown')
    camera_name = incident.get('camera_name', 'Unknown')
    weapon_type = incident.get('label', 'weapon')
    confidence = incident.get('confidence', 0)
    
    message = f"""🚨 *WEAPON DETECTION ALERT* 🚨

📅 *Time:* {timestamp.replace('_', ' ').replace('-', ':')}
📍 *Location:* {location}
📹 *Camera:* {camera_name}
🔫 *Weapon Type:* {weapon_type.upper()}
📊 *Confidence:* {confidence}%

⚠️ *Immediate attention required!*"""

    # Get image path
    image_path = None
    if 'image' in incident:
        image_filename = incident['image'].split('/')[-1]
        image_path = os.path.join('incidents', image_filename)
    
    # Send to all subscribed chats
    failed_chats = []
    for chat_id in subscribed_chats.copy():
        try:
            if image_path and os.path.exists(image_path):
                with open(image_path, 'rb') as photo:
                    await bot.send_photo(
                        chat_id=int(chat_id),
                        photo=photo,
                        caption=message,
                        parse_mode=ParseMode.MARKDOWN
                    )
            else:
                await bot.send_message(
                    chat_id=int(chat_id),
                    text=message,
                    parse_mode=ParseMode.MARKDOWN
                )
            logger.info(f"Alert sent to chat {chat_id}")
        except Exception as e:
            logger.error(f"Failed to send alert to chat {chat_id}: {e}")
            failed_chats.append(chat_id)
    
    # Remove failed chat IDs
    for chat_id in failed_chats:
        logger.warning(f"Removing failed chat ID: {chat_id}")
        subscribed_chats.discard(chat_id)
    
    if failed_chats:
        save_subscriptions()

# Initialize Telegram
load_subscriptions()

# Start Telegram worker thread
telegram_thread = threading.Thread(target=telegram_worker, daemon=True)
telegram_thread.start()
logger.info("Telegram worker thread started")

# --- CAMERA THREAD ---
def camera_worker():
    global latest_frame
    cap = cv2.VideoCapture(CAMERA_ID)
    while True:
        ret, frame = cap.read()
        if not ret:
            continue
        # Run detection
        results = model(frame)
        for r in results:
            for box in r.boxes:
                cls = int(box.cls[0])
                label = model.names[cls]
                conf = float(box.conf[0])
                # Draw bounding box and label
                if hasattr(box, 'xyxy'):
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                else:
                    # Fallback if attribute is different
                    x1, y1, x2, y2 = [int(v) for v in box]
                color = (0, 255, 0) if label in WEAPON_LABELS else ((0, 255, 255) if label == "neutral" else (255, 0, 0))
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                text = f"{label}: {conf:.2f}"
                cv2.putText(frame, text, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
                if label in WEAPON_LABELS and conf >= CONFIDENCE_THRESHOLD:
                    # Save incident only if not duplicate
                    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
                    now = datetime.now()
                    is_duplicate = False
                    # Check for duplicate in DB
                    db = SessionLocal()
                    recent_incidents = db.query(Incident).filter(
                        Incident.label == label,
                        Incident.camera == CAMERA_LABEL
                    ).order_by(Incident.timestamp.desc()).all()
                    db.close()
                    for incident in recent_incidents:
                        last_time = datetime.strptime(incident.timestamp, "%Y-%m-%d_%H-%M-%S")
                        if (now - last_time).total_seconds() < DUPLICATE_TIME_WINDOW:
                            # Update timestamp to latest (optional: update in DB if needed)
                            is_duplicate = True
                            break
                    if not is_duplicate:
                        img_id = str(uuid.uuid4())
                        img_path = os.path.join(INCIDENTS_DIR, f"{img_id}.jpg")
                        cv2.imwrite(img_path, frame)
                        cam_info = CAMERA_LOCATION_MAP.get(CAMERA_LABEL, {"name": CAMERA_LABEL, "location": "Unknown"})
                        incident = {
                            "id": img_id,
                            "timestamp": timestamp,
                            "camera": CAMERA_LABEL,
                            "camera_name": cam_info["name"],
                            "location": cam_info["location"],
                            "label": label,
                            "confidence": round(conf, 2),
                            "image": f"/incidents/{img_id}.jpg"
                        }
                        # Save to DB
                        db = SessionLocal()
                        db_incident = Incident(**incident)
                        db.add(db_incident)
                        db.commit()
                        db.close()
                        incident_queue.put(incident)
                        # Queue Telegram alert (thread-safe)
                        telegram_alert_queue.put(incident)
        with frame_lock:
            latest_frame = frame.copy()
        time.sleep(0.05)  # ~20 FPS

threading.Thread(target=camera_worker, daemon=True).start()

# --- ROUTES ---
@app.get("/video")
def video_feed():
    def gen():
        while True:
            with frame_lock:
                if latest_frame is not None:
                    frame = latest_frame.copy()
                else:
                    # Create a placeholder frame if no camera feed
                    frame = create_placeholder_frame()
            
            _, jpeg = cv2.imencode('.jpg', frame)
            yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')
            time.sleep(0.05)
    
    return StreamingResponse(gen(), media_type='multipart/x-mixed-replace; boundary=frame')

def create_placeholder_frame():
    """Create a placeholder frame when camera is not available"""
    import numpy as np
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    frame.fill(50)  # Dark gray background
    cv2.putText(frame, "Camera Feed Loading...", (150, 240), 
                cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
    return frame

@app.get("/incidents")
def get_incidents(start_date: Optional[str] = Query(None), end_date: Optional[str] = Query(None)):
    db = SessionLocal()
    query = db.query(Incident)
    # If date filters are provided, filter by date (inclusive)
    if start_date:
        query = query.filter(Incident.timestamp >= start_date)
    if end_date:
        # To include the whole end_date, append ' 23:59:59' if not already present
        if len(end_date) == 10:
            end_date_full = end_date + '_23-59-59'
        else:
            end_date_full = end_date
        query = query.filter(Incident.timestamp <= end_date_full)
    incidents = query.order_by(Incident.timestamp.desc()).all()
    db.close()
    return [
        {
            "id": i.id,
            "timestamp": i.timestamp,
            "camera": i.camera,
            "camera_name": i.camera_name,
            "location": i.location,
            "label": i.label,
            "confidence": i.confidence,
            "image": i.image
        }
        for i in incidents
    ]

@app.websocket("/ws/incidents")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.append(websocket)
    try:
        while True:
            # Wait for a new incident from the queue
            loop = asyncio.get_event_loop()
            incident = await loop.run_in_executor(None, incident_queue.get)
            # Send to all connected clients
            for ws in clients[:]:
                try:
                    await ws.send_json(incident)
                except Exception:
                    clients.remove(ws)
    except WebSocketDisconnect:
        clients.remove(websocket)

from fastapi.staticfiles import StaticFiles
app.mount("/incidents", StaticFiles(directory=INCIDENTS_DIR), name="incidents")

@app.get("/alerts")
def get_alerts():
    db = SessionLocal()
    count = db.query(Incident).count()
    db.close()
    return {"alerts": count}

@app.get("/telegram/subscribers")
def get_telegram_subscribers():
    """Get count of Telegram subscribers."""
    return {"subscribers": len(get_subscribed_chats())}

@app.get("/settings/notifications")
def get_notification_settings():
    """Get current notification settings."""
    with notification_lock:
        logger.info(f"Notification settings retrieved: enabled={notification_enabled}")
        return {"enabled": notification_enabled}

@app.post("/settings/notifications")
def update_notification_settings(request: dict):
    """Update notification settings."""
    global notification_enabled
    
    enabled = request.get("enabled", True)
    
    with notification_lock:
        old_state = notification_enabled
        notification_enabled = enabled
    
    # Log the change with context
    if old_state != enabled:
        logger.info(f"Notification settings changed: {old_state} -> {enabled}")
        if enabled:
            logger.info("Telegram notifications are now ENABLED - alerts will be sent to subscribers")
        else:
            logger.info("Telegram notifications are now DISABLED - alerts will be suppressed")
    else:
        logger.info(f"Notification settings unchanged: enabled={enabled}")
    
    return {"enabled": notification_enabled, "message": "Settings updated successfully"}

@app.get("/analytics/incidents/timeline")
def incidents_timeline(granularity: str = Query("day", enum=["day", "month"])):
    db = SessionLocal()
    # Parse timestamp to date, group by date
    if granularity == "day":
        group_expr = func.substr(Incident.timestamp, 1, 10)  # "YYYY-MM-DD"
    elif granularity == "month":
        group_expr = func.substr(Incident.timestamp, 1, 7)   # "YYYY-MM"
    else:
        group_expr = func.substr(Incident.timestamp, 1, 10)
    results = db.query(group_expr.label("period"), func.count().label("count")).group_by("period").order_by("period").all()
    db.close()
    return [{"period": r.period, "count": r.count} for r in results]

@app.get("/analytics/incidents/distribution")
def incidents_distribution(by: str = Query("label", enum=["label", "location", "camera_name"])):
    db = SessionLocal()
    results = db.query(getattr(Incident, by), func.count().label("count")).group_by(getattr(Incident, by)).order_by(func.count().desc()).all()
    db.close()
    return [{"category": r[0], "count": r[1]} for r in results]

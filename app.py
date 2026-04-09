import email
import os
import logging
import sqlalchemy
from flask import Flask, render_template, redirect, session, request, url_for, flash, jsonify
from sqlalchemy import func
from supabase import create_client, Client
from sqlalchemy.exc import OperationalError
try:
    import supabase
except ImportError:
    supabase = None
from models import EmotionLog

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
from models import db, Feedback, ContactMessage, User, CommunityMessage, Admin
from auth_routes import auth
from admin_routes import admin 
from datetime import datetime
from werkzeug.utils import secure_filename

# from google import genai

import random
from google import genai

import pandas as pd
import numpy as np
import joblib
from processor import EEGProcessor

import os
import base64
import cv2
from tensorflow import keras
from tensorflow.keras.models import load_model
from tensorflow.keras.models import model_from_json

import traceback

from werkzeug.security import generate_password_hash

from dotenv import load_dotenv
load_dotenv()

# --- database utilities ------------------------------------------------

supabase_ctx = None

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")

if SUPABASE_URL and SUPABASE_KEY:
    try:
        from supabase import create_client
        supabase_ctx = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Supabase API Client initialized.")
    except Exception as e:
        print(f"❌ Supabase API failed: {e}")


def get_database_uri():
    # 1. Pull from environment
    uri = os.getenv("DATABASE_URL")
    
    if not uri:
        print("⚠️ DATABASE_URL missing! Falling back to local SQLite.")
        return "sqlite:///neuroharmonics.db"
    
    # 2. Fix the 'postgres://' vs 'postgresql://' issue (SQLAlchemy 1.4+ requirement)
    if uri.startswith("postgres://"):
        uri = uri.replace("postgres://", "postgresql://", 1)
    
    # 3. Handle SSL for Supabase/Cloud deployment
    # If the URI doesn't already have SSL parameters, append them
    if "sslmode" not in uri:
        separator = "&" if "?" in uri else "?"
        uri += f"{separator}sslmode=require"
        
    return uri


GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
ai_client = None
client = None
if GEMINI_API_KEY:
    try:
        # Initialize the modern Client
        ai_client = genai.Client(api_key=GEMINI_API_KEY)
        print("✅ Gemini AI (New SDK) initialized successfully.")
    except Exception as e:
        print(f"❌ Gemini init failed: {e}")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
proc = EEGProcessor(fs=256)

# Get the absolute path to the model to ensure it works in deployment
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'models', 'emotiondetector.h5')

import json

def load_emotion_model():
    try:
        with open(os.path.join(BASE_DIR, 'models', 'emotiondetector.json'), "r") as f:
            model_json = f.read()
            model = model_from_json(model_json)
            model.load_weights(os.path.join(BASE_DIR, 'models', 'emotiondetector.h5'))
            model.compile(loss='categorical_crossentropy', optimizer='adam', metrics=['accuracy'])
        return model
    except Exception as e:
        print(f"Model load error: {e}")
        return None

# Load model globally (like enhanced.py)
emotion_model = load_emotion_model()
EMOTION_LABELS = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise']
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

app = Flask(__name__)
app.secret_key = "super-secret-key"

# configure SQLAlchemy
app.config["SQLALCHEMY_DATABASE_URI"] = get_database_uri()
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    "pool_pre_ping": True,  # Checks if connection is alive before using it
    "pool_recycle": 300,    # Re-connects every 5 minutes
}

db.init_app(app)

with app.app_context():
    try:
        db.create_all()
        print("✅ Database tables created successfully!")
    except Exception as e:
        print(f"❌ Error creating tables: {e}")

app.register_blueprint(auth)
app.register_blueprint(admin)

UPLOAD_FOLDER = 'static/uploads/profiles'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Create the folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

#<----------------mail------------------>
from flask_mail import Mail, Message
import random

app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USE_SSL'] = False  # Ensure this is False if using Port 587
app.config['MAIL_USERNAME'] = os.getenv('EMAIL_USER')
app.config['MAIL_PASSWORD'] = os.getenv('EMAIL_PASS')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('EMAIL_USER')

mail = Mail(app)

# --- Routes ---

@app.route("/")
def home():
    # Multi-level sort: 1. Highest Rating, 2. Newest (by ID)
    try:
        feedbacks = db.session.query(Feedback, User.username)\
                      .join(User, Feedback.user_id == User.id)\
                      .filter(Feedback.rating >= 4)\
                      .order_by(Feedback.rating.desc(), Feedback.id.desc())\
                      .limit(15).all()
    except OperationalError as e:
        logging.error(f"Database error in home(): {e}")
        feedbacks = []
    return render_template("index/index.html", feedbacks=feedbacks)

@app.route("/login", methods=["GET"])
def login_page():
    return render_template("index/login.html")  

@app.route("/register", methods=["GET"])
def register_page():
    return render_template("index/login.html")

@app.route('/support')
def support():
    # Instead of looking for a file that doesn't exist:
    return redirect(url_for('dashboard'))

@app.route('/send_otp', methods=['POST'])
def send_otp():
    email = request.json.get('email')
    otp = str(random.randint(100000, 999999))
    
    # Store OTP in session to check later
    session['registration_otp'] = otp
    session['registration_email'] = email
    
    msg = Message('NeuroHarmonics Verification Code', recipients=[email])
    msg.body = f"Your NeuroHarmonics registration code is: {otp}"
    
    try:
        mail.send(msg)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})
    
from flask import send_from_directory

@app.route('/static/music/<path:filename>')
def serve_music(filename):
    return send_from_directory('static/music', filename, conditional=True)

@app.route('/api/register', methods=['POST'])
def register_user():
    data = request.json
    entered_otp = data.get('otp')
    
    if entered_otp == session.get('registration_otp'):
        # 1. Logic to insert user into Supabase 'user' table
        # 2. Clear the OTP from session
        session.pop('registration_otp', None)
        return jsonify({"success": True})
    
    return jsonify({"success": False, "error": "Invalid OTP code"}), 400

@app.route("/dashboard")
def dashboard():
    if "username" not in session:
        return redirect("/login")
    
    try:
        user = User.query.filter_by(username=session['username']).first()
        messages = CommunityMessage.query.order_by(CommunityMessage.timestamp.asc()).limit(50).all()
        # 3. Fetch private inquiries sent by this user that have an admin reply
        personal_inquiries = ContactMessage.query.filter_by(user_id=user.id).all()
    except OperationalError as e:
        logging.error(f"Database error in dashboard(): {e}")
        user = None
        messages = []
        personal_inquiries = []
    if not user:
        return redirect("/login")
    supabase_url = SUPABASE_URL if supabase_ctx else None
    supabase_key = SUPABASE_KEY if supabase_ctx else None
    return render_template("dashboard/dashboard.html",
                           user=user,
                           SUPABASE_URL=supabase_url,
                           SUPABASE_KEY=supabase_key,
                           username=user.username, 
                           community_messages=messages,
                           inquiries=personal_inquiries)


# --- CLOUDINARY MUSIC CONFIGURATION ---

# We store 4 music recommendations for each time of day
MUSIC_DATA = {
    "morning": [
        {"title": "Morning Focus 1", "music_path": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1774461764/morning1_uqkazq.mp3", "thumbnail": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1774461676/morning1_xrvl3d.webp", "quote": "Start your day with clarity."},
        {"title": "Morning Focus 2", "music_path": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1774461675/morning2_epk3pk.mp3", "thumbnail": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1774461676/morning2_i9fank.webp", "quote": "Align your neural rhythms."},
        {"title": "Morning Focus 3", "music_path": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1774461692/morning3_uioh3n.mp3", "thumbnail": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1774461676/morning3_nurs6z.jpg", "quote": "Boost your morning productivity."},
        {"title": "Morning Focus 4", "music_path": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1774461703/morning4_ja0o33.mp3", "thumbnail": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1774461673/morning4_vkuqmc.webp", "quote": "A fresh start for your mind."}
    ],
    "afternoon": [
        {"title": "Afternoon Reset 1", "music_path": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1774461764/morning1_uqkazq.mp3", "thumbnail": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1774461676/morning1_xrvl3d.webp", "quote": "Recharge your mental energy."},
        {"title": "Afternoon Reset 2", "music_path": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1774461675/morning2_epk3pk.mp3", "thumbnail": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1774461676/morning2_i9fank.webp", "quote": "Beat the afternoon slump."},
        {"title": "Afternoon Reset 3", "music_path": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1774461692/morning3_uioh3n.mp3", "thumbnail": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1774461676/morning3_nurs6z.jpg", "quote": "Focus-enhancing frequencies."},
        {"title": "Afternoon Reset 4", "music_path": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1774461703/morning4_ja0o33.mp3", "thumbnail": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1774461673/morning4_vkuqmc.webp", "quote": "Stay sharp, stay present."}
    ],
    "evening": [
        {"title": "Evening Calm 1", "music_path": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1774461768/evening1_ksall2.mp3", "thumbnail": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1774461676/evening1_sma34d.jpg", "quote": "Wind down after a long day."},
        {"title": "Evening Calm 2", "music_path": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1774461893/evening2_m2ukss.mp3", "thumbnail": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1774461674/evening2_mnmzsp.webp", "quote": "Ease your mind into relaxation."},
        {"title": "Evening Calm 3", "music_path": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1774461725/evening3_qclnlu.mp3", "thumbnail": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1774461674/evening3_aezeb4.jpg", "quote": "Gentle waves for your evening."},
        {"title": "Evening Calm 4", "music_path": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1774461738/evening4_yz2y5c.mp3", "thumbnail": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1774461680/evening4_imxhfv.jpg", "quote": "Release the day's stress."}
    ],
    "night": [
        {"title": "Night Recovery 1", "music_path": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1774461711/night1_wuo4jf.mp3", "thumbnail": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1774461673/night1_sfgoe5.jpg", "quote": "Deep sleep induction."},
        {"title": "Night Recovery 2", "music_path": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1774461810/night2_y3plzt.mp3", "thumbnail": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1774461675/night2_vvelpx.jpg", "quote": "Enter a state of restorative rest."},
        {"title": "Night Recovery 3", "music_path": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1774461759/night3_xzyums.mp3", "thumbnail": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1774461676/night3_ol9wjj.jpg", "quote": "Soothing ambient sounds."},
        {"title": "Night Recovery 4", "music_path": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1774461806/night4_hu74ec.mp3", "thumbnail": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1774461678/night4_a8wy3j.jpg", "quote": "Peaceful dreams await."}
    ]
}

YOGA_LIST = [
    {
        "title": "Scorpion Pose (Vrischikasana)",
        "video": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1772135116/scorpion-pose_eztryo.mp4",  
        "thumbnail": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1774461677/scorpion-pose_e4znot.webp",  
        "description": "An advanced inversion that increases blood flow to the brain and challenges neural focus."
    },
    {
        "title": "Child Pose (Balasana)",
        "video": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1772135116/childpose_rezjh3.mp4", 
        "thumbnail": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1774461677/childpose_oliylc.jpg", 
        "description": "A restorative posture that calms the parasympathetic nervous system and reduces mental fatigue."
    },
    {
        "title": "Guided Meditation",
        "video": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1772135116/meditation_ylb37c.mp4", 
        "thumbnail": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1774461677/meditation_arkvhz.jpg", 
        "description": "A seated practice to stabilize alpha brainwaves and enhance emotional regulation."
    },
    {
        "title": "Balancing Stick (Tuladandasana)",
        "video": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1772135116/balancing_stick_jwkstx.mp4", 
        "thumbnail": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1774461678/balancing_stick_zbol7m.webp", 
        "description": "Increases heart rate and builds cognitive endurance through intense physical balance."
    }
]

@app.route("/health-tips")
def health_tips():
    hour = datetime.now().hour
    
    if 5 <= hour < 12:
        period = "morning"
        greeting = "Good Morning"
    elif 12 <= hour < 17:
        period = "afternoon"
        greeting = "Good Afternoon"
    elif 17 <= hour < 20:
        period = "evening"
        greeting = "Good Evening"
    else:
        period = "night"
        greeting = "Good Night"

    # Select random tip and all 4 music recommendations for that period
    selected_tip = random.choice(WELLNESS_DATA[period])
    selected_music = MUSIC_DATA[period] # This gives the list of 4 files

    return render_template("index/health_tips.html", 
                           greeting=greeting, 
                           tip=selected_tip,
                           time_greeting=greeting,
                           music_recommendations=selected_music,
                           yoga_recommendations=YOGA_LIST)

@app.route("/logout")
def logout():
    user_id = session.get("user_id")
    if user_id:
        try:
            # Direct update in Supabase
            supabase_ctx.table("user").update({"status": "inactive"}).eq("id", user_id).execute()
        except Exception as e:
            logging.error(f"Logout DB Error: {e}")
    
    session.clear()
    return redirect("/login")

# --- Form Submissions ---

@app.route('/submit-feedback', methods=['POST'])
def submit_feedback():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    rating_raw = request.form.get('rating')
    comment = request.form.get('comment')

    try:
        new_feedback = {
            "user_id": session['user_id'], 
            "rating": int(rating_raw), 
            "comment": comment
        }
        
        supabase_ctx.table("feedback").insert(new_feedback).execute()
        return jsonify({"success": True})
    except Exception as e:
        logging.error(f"Feedback Save Failed: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/contact', methods=['POST'])
def handle_contact():
    # 1. Debug Logs
    print(f"DEBUG: Session Keys: {list(session.keys())}")
    
    # 2. Check for required session data
    user_email = session.get('user_email')
    if not user_email:
        return jsonify({"success": False, "error": "Session missing email. Please log out and back in."}), 401
    
    try:
        data = request.json
        if not data:
            return jsonify({"success": False, "error": "No data received"}), 400

        # REMOVED: supabase_ctx.session.remove() 
        # Reason: Supabase Client is stateless and doesn't use SQLAlchemy sessions.

        # 3. Gather info from session
        user_id = session.get('user_id')
        user_name = session.get('username', 'Guest User')

        # 4. Prepare data for Supabase
        new_message = {
            "user_id": user_id if user_id else None,
            "name": user_name,
            "email": user_email,
            "subject": data.get('subject', 'No Subject'),
            "message": data.get('message'),
            "is_resolved": False,
            "admin_reply": None
        }

        # 5. Insert into Supabase table 'contact_message'
        # .execute() performs the API call immediately
        result = supabase_ctx.table("contact_message").insert(new_message).execute()

        return jsonify({
            "success": True, 
            "message": "Support message sent!",
            "data": result.data
        }), 200

    except Exception as e:
        print(f"CRITICAL FLASK ERROR: {str(e)}") 
        return jsonify({"success": False, "error": "Internal server error"}), 500


@app.route('/support')
def support_page():
    """Renders the support page with existing messages for the user"""
    user_email = session.get('user_email')
    
    if not user_email:
        # Redirect to login or show empty state
        return render_template('support.html', inquiries=[])

    try:
        # Fetch existing messages for this user from Supabase
        response = supabase_ctx.table("contact_message") \
            .select("*") \
            .eq("email", user_email) \
            .order("timestamp", desc=True) \
            .execute()
            
        return render_template('support.html', inquiries=response.data)
    except Exception as e:
        print(f"Error fetching inquiries: {e}")
        return render_template('support.html', inquiries=[])
    
# 1. Route to serve the dedicated admin login page
@app.route("/admin-login-page")
def admin_login_page():
    # This points Flask to look inside templates/admin/admin_login.html
    return render_template("admin/admin_login.html")

# 2. Route to process the credentials against the 'admins' table

@app.route('/admin-login', methods=['POST'])
def admin_login_process():
    data = request.get_json()
    
    # .strip() handles accidental spaces in the login form
    u_input = data.get('username', '').strip()
    p_input = data.get('password', '').strip()

    try:
        # 1. Fetch admin from Supabase using your 'username' column
        # Using .ilike for case-insensitive matching
        response = supabase_ctx.table("admins").select("*").ilike("username", u_input).execute()
        
        if not response.data:
            return jsonify({"success": False, "message": "Admin credentials not found"}), 401
            
        admin_user = response.data[0]

        # 2. Verify Password (Manual check since you are using plain text for now)
        # Note: .strip() handles fixed-length character padding if any exists
        if admin_user.get('password', '').strip() == p_input:
            
            # 3. Establish the Secure Session using your schema's 'username' and 'name'
            session['username'] = admin_user.get('username')
            session['admin_name'] = admin_user.get('name')
            session['role'] = admin_user.get('role', 'admin')
            
            # 4. Update 'last_login' using your primary key 'admin_id'
            # We use ISO format for the timestamp compatibility
            admin_pk = admin_user.get('admin_id')
            
            if admin_pk:
                supabase_ctx.table("admins").update({
                    "last_login": datetime.now().isoformat()
                }).eq("admin_id", admin_pk).execute()
            
            return jsonify({
                "success": True, 
                "redirect": url_for('admin_panel')
            })
            
    except Exception as e:
        # This will now log specific issues without crashing
        logging.error(f"Admin Login Error: {e}")
    
    return jsonify({"success": False, "message": "Invalid Admin Credentials"}), 401

# unified admin dashboard route
from collections import Counter

@app.route("/admin-panel")
def admin_panel():
    # 1. Security Check
    if session.get("role") != "admin":
        return redirect(url_for("admin_login_page"))

    try:
        # 2. Fetch Users Data
        users_query = supabase_ctx.table("user").select("*").execute()
        users = users_query.data if users_query.data else []
        users_count = len(users)

        # 3. Fetch EEG Reports & Fix Analysis Count
        reports_query = supabase_ctx.table("eeg_reports").select("*").execute()
        eeg_reports = reports_query.data if reports_query.data else []
        analysis_count = len(eeg_reports)

        # 4. Prepare Data for Emotion Bar Graph
        # This counts how many times each emotion appears (e.g., {'Happy': 5, 'Sad': 2})
        emotions_raw = [r.get('emotion_detected', 'Unknown').capitalize() for r in eeg_reports]
        emotion_counts = dict(Counter(emotions_raw))
        
        emotion_labels = list(emotion_counts.keys())
        emotion_values = list(emotion_counts.values())

        # 5. Fetch Unresolved Inquiries
        # Assuming your table is 'contact_messages' or 'messages'
        messages_query = supabase_ctx.table("contact_message")\
            .select("*")\
            .eq("is_resolved", False)\
            .execute()
        messages = messages_query.data if messages_query.data else []

        # 6. Optional: Get "Today's" analysis count
        # (Simplified: you can add a filter for created_at later)
        today_count = 0 

        return render_template(
            "admin/admin.html", 
            users=users, 
            users_count=users_count, 
            analysis_count=analysis_count, # Correctly passed to the card
            messages=messages,
            emotion_labels=emotion_labels, # For the Graph
            emotion_values=emotion_values, # For the Graph
            eeg_reports=eeg_reports,       # For the Recommendation tab
            today_count=today_count
        )

    except Exception as e:
        logging.error(f"Supabase error in admin_panel(): {e}")
        # Return empty data so the page still loads without crashing
        return render_template(
            "admin/admin.html", 
            users=[], 
            users_count=0, 
            analysis_count=0, 
            messages=[],
            emotion_labels=[],
            emotion_values=[],
            eeg_reports=[],
            today_count=0
        )


@app.route('/admin/reply-inquiry', methods=['POST'])
def reply_inquiry():
    data = request.json
    msg_id = data.get('msg_id')
    reply_text = data.get('reply_text')

    try:
        # 1. Fetch the original message to get the user's email
        msg_res = supabase_ctx.table("contact_message").select("email, name").eq("id", msg_id).execute()
        
        if msg_res.data:
            user_email = msg_res.data[0]['email']
            user_name = msg_res.data[0]['name']

            # 2. Send Email via Flask-Mail
            msg = Message(f"Re: Your Inquiry to NeuroHarmonics",
                          sender=app.config['MAIL_USERNAME'],
                          recipients=[user_email])
            msg.body = f"Hello {user_name},\n\n{reply_text}\n\nBest regards,\nNeuroHarmonics Admin"
            mail.send(msg)

            # 3. Mark as resolved in Supabase and save the reply
            supabase_ctx.table("contact_message").update({
                "is_resolved": True,
                "admin_reply": reply_text
            }).eq("id", msg_id).execute()

            return jsonify({"success": True})
        
        return jsonify({"success": False, "message": "Inquiry not found"}), 404

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/post-community', methods=['POST'])
def post_community():
    data = request.get_json()
    if 'username' in session and data.get('message'):
        new_msg = {
            "username": session['username'],
            "content": data['message']
        }
        supabase_ctx.table("community_messages").insert(new_msg).execute()
        return jsonify({"success": True})
    return jsonify({"error": "Unauthorized"}), 401

@app.route('/update-profile', methods=['POST'])
def update_profile():
    new_name = request.form.get('username')
    user_id = session.get('user_id')
    photo = request.files.get('profile-photo')

    if not user_id:
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    try:
        update_data = {}
        
        # 1. Matches schema column: 'username'
        if new_name:
            update_data["username"] = new_name 
            session['username'] = new_name

        # 2. Handle Profile Photo
        if photo and photo.filename != '':
            file_ext = os.path.splitext(photo.filename)[1]
            storage_path = f"avatars/user_{user_id}{file_ext}"
            
            # Read file content for Supabase Storage
            file_content = photo.read()
            
            # Upload to 'avatars' bucket
            supabase_ctx.storage.from_('avatars').upload(
                path=storage_path,
                file=file_content,
                file_options={"upsert": "true", "content-type": photo.content_type}
            )
            
            # Get Public URL and match schema column: 'avatar'
            public_url = supabase_ctx.storage.from_('avatars').get_public_url(storage_path)
            update_data["avatar"] = public_url

        # 3. Apply updates to the 'user' table
        if update_data:
            # result = supabase_ctx.table("user").update(update_data).eq("id", user_id).execute()
            supabase_ctx.table("user").update(update_data).eq("id", user_id).execute()

        return jsonify({"success": True})

    except Exception as e:
        print(f"Update Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
    
# WELLNESS_DATA stores your curated tips and Cloudinary links
WELLNESS_DATA = {
    "morning": [
        {
            "text": "Early sunlight exposure for 10 minutes resets your circadian rhythm, optimizing your internal clock for better sleep tonight.",
            "image": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1774650915/morning_sun_igwaee.png"
        },
        {
            "text": "Hydrating with 500ml of water before your first caffeine intake jumpstarts neural clarity and flushes metabolic waste.",
            "image": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1774650921/morning_water_vkpcum.png"
        },
        {
            "text": "Prioritizing high-protein intake in your first meal provides the amino acids necessary for neurotransmitter production and steady focus.",
            "image": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1774650927/morning_protien_sv2vmk.png"
        }
    ],
    "afternoon": [
        {
            "text": "A 20-minute power nap between 1 PM and 3 PM can drastically improve memory consolidation and creative problem-solving.",
            "image": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1774650949/afternoon_rest_myqh1h.png"
        },
        {
            "text": "Applying the 20-20-20 rule—looking at something 20 feet away for 20 seconds every 20 minutes—prevents digital eye strain and mental fatigue.",
            "image": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1774650958/afternoon_focus_ivkncv.png"
        },
        {
            "text": "A quick 10-minute walk outdoors can reset your prefrontal cortex, boosting your decision-making capacity for the rest of the day.",
            "image": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1774650962/afternoon_walk_cwrztl.png"
        }
    ],
    "evening": [
        {
            "text": "Dimming environmental lights 2 hours before bed triggers the natural release of melatonin, signaling your brain to prepare for recovery.",
            "image": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1774650976/evening_calm_ysdgtw.png"
        },
        {
            "text": "Engaging in light, low-impact stretching helps lower cortisol levels and releases physical tension accumulated throughout the day.",
            "image": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1774650980/evening_stretch_f9rker.png"
        },
        {
            "text": "Practicing 'Digital Sunset'—turning off notifications an hour before bed—reduces cognitive load and prevents sleep-disrupting dopamine spikes.",
            "image": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1774650976/evening_digital_fast_toxce9.png"
        }
    ],
    "night": [
        {
            "text": "Maintaining a bedroom temperature of 18°C (65°F) is scientifically proven to facilitate the transition into deep, restorative REM sleep.",
            "image": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1774650990/night_sleep_dcshgm.png"
        },
        {
            "text": "Your body temperature naturally drops at night to initiate sleep; keeping your room cool (around 18°C) helps your brain sync with this biological rhythm.",
            "image": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1774650990/night_temp_u14rej.png"
        },
        {
            "text": "Writing a 'Brain Dump' list of tomorrow's tasks clears working memory, allowing the brain to enter a deeper state of relaxation.",
            "image": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1774650990/night_journal_yyae95.png"
        }
    ]
}
    
from openai import OpenAI
import re

# Load the key from your .env file instead of typing it here
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# Initialize OpenRouter Client correctly
ai_client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY, 
)

def get_exercise_recommendation(dominant_frequency, predicted_mood):
    prompt = (
        f"Context: User EEG shows dominant {dominant_frequency} waves. "
        f"Mood state is {predicted_mood}. "
        "Task: Recommend one physical exercise to optimize this state. "
        "Rules: \n"
        "1. If Beta/Anxious, suggest grounding/rhythmic movement.\n"
        "2. If Theta/Fatigued, suggest alert-increasing movement.\n"
        "3. If Alpha/Neutral, suggest flow-state activities.\n"
        "CRITICAL: Return ONLY the raw string. Do not include 'Here is your recommendation' or any conversational text.\n"
        "Format: Exercise Name | Neuro-Benefit (max 15 words) | SearchKeyword"
    )

    try:
        response = ai_client.chat.completions.create(
            model="google/gemini-2.0-flash-001",
            messages=[{"role": "user", "content": prompt}]
        )
        
        # .strip() removes accidental newlines at start/end
        raw_text = response.choices[0].message.content.strip()
        
        # If AI still adds a sentence before the pipes, this finds the start of the data
        if "|" in raw_text:
            # We split by pipe and clean each resulting piece
            parts = [p.strip() for p in raw_text.split('|')]
            
            return {
                "name": parts[0],
                "benefit": parts[1] if len(parts) > 1 else "Optimizes brain state.",
                "keyword": parts[2] if len(parts) > 2 else "exercise"
            }
        else:
            # Fallback if the AI completely ignores the pipe format
            raise ValueError("AI response format invalid")

    except Exception as e:
        print(f"AI Error: {e}")
        return {"name": "Yoga", "benefit": "Balances neural activity.", "keyword": "yoga"}

model = EEGProcessor()  # Initialize the processor with the correct sampling frequency

import random
from flask import jsonify, session

# The "Neuro-Music" Database
MUSIC_DATABASE = {
    "happy": [
        {"music": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1775239216/mondamusic-happy-happy-music-499182_x2fz9r.mp3", "thumb": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1775239934/image5_fzup2w.webp"},
        {"music": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1775239142/psyai-nervous-system-regulation-for-emotional-safety-476518_qf6xtd.mp3", "thumb": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1775239933/image2_zvr34k.webp"},
        {"music": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1775238779/psyai-gentle-regulation-after-stress-and-anxiety-476520_v61hez.mp3", "thumb": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1775239932/image1_dfvnvk.webp"},
        {"music": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1775238719/psyai-sensory-reset-for-nervous-system-balance-476524_a6ce18.mp3", "thumb": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1775239931/image8_awemg8.webp"},
        {"music": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1775238672/psyai-alpha-drift-alpha-brainwave-ambient-focus-and-deep-relaxation-481545_fq7esi.mp3", "thumb": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1775239930/image4_szjtkw.webp"},
        {"music": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1775238452/the_mountain-happy-kids-kids-happy-496596_vuo7uj.mp3", "thumb": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1775239929/image6_dxvzhs.webp"},
        {"music": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1775238448/the_mountain-happy-happy-upbeat-496594_xpulex.mp3", "thumb": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1775239929/image3_bjizuk.webp"},
        {"music": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1775238448/the_mountain-happy-happy-music-496549_yvxtis.mp3", "thumb": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1775239928/image9_kluw8z.webp"},
        {"music": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1775238438/eliveta-happy-491187_vrsuah.mp3", "thumb": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1775239928/image7_sbwrjf.webp"},
    ],
    "sad": [
        {"music": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1775239238/hirohasaimoto-silent-snowfall-2-448408_kvvikx.mp3", "thumb": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1775239934/image5_fzup2w.webp"},
        {"music": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1775239124/psyai-nervous-system-regulation-for-emotional-safety-476518_r4a6cd.mp3", "thumb": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1775239933/image2_zvr34k.webp"},
        {"music": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1775239111/psyai-alpha-drift-alpha-brainwave-ambient-focus-and-deep-relaxation-481545_xai8wg.mp3", "thumb": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1775239932/image1_dfvnvk.webp"},
        {"music": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1775239086/psyai-sensory-reset-for-nervous-system-balance-476524_vvvjx0.mp3", "thumb": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1775239931/image8_awemg8.webp"},
        {"music": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1775239077/psyai-gentle-regulation-after-stress-and-anxiety-476520_t90g1e.mp3", "thumb": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1775239930/image4_szjtkw.webp"},
        {"music": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1775239054/paulyudin-sad-sad-music-485935_ijlqcm.mp3", "thumb": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1775239929/image6_dxvzhs.webp"},
        {"music": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1775238496/pianocafe_kumi-emotional-pianothink-of-you-327215_dz5jfp.mp3", "thumb": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1775239929/image3_bjizuk.webp"},
        {"music": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1775238484/nikitakondrashev-sad-510083_zjs5wk.mp3", "thumb": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1775239928/image9_kluw8z.webp"},
        {"music": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1775238464/paulyudin-sad-sad-music-508961_sm9icr.mp3", "thumb": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1775239928/image7_sbwrjf.webp"},
    ],
    "angry": [
        {"music": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1775238603/solarflex-calm-soft-509916_eewmgj.mp3", "thumb": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1775239934/image5_fzup2w.webp"},
        {"music": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1775238567/nickpanekaiassets-cello-dark-distorted-cello-quartet-instrumental-356151_l67gtn.mp3", "thumb": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1775239933/image2_zvr34k.webp"},
        {"music": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1775238558/psyai-nervous-system-regulation-for-emotional-safety-476518_qhteul.mp3", "thumb": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1775239932/image1_dfvnvk.webp"},
        {"music": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1775238534/psyai-gentle-regulation-after-stress-and-anxiety-476520_lu1oaj.mp3", "thumb": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1775239931/image8_awemg8.webp"},
        {"music": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1775238526/psyai-sensory-reset-for-nervous-system-balance-476524_hyxyrt.mp3", "thumb": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1775239930/image4_szjtkw.webp"},
        {"music": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1775238523/soundgallerybydmitrytaras-dramatic-epic-305293_wa1kt1.mp3", "thumb": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1775239929/image6_dxvzhs.webp"},
        {"music": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1775238522/nikitakondrashev-meditation-509071_jp32uz.mp3", "thumb": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1775239929/image3_bjizuk.webp"},
        {"music": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1775238485/psyai-alpha-drift-alpha-brainwave-ambient-focus-and-deep-relaxation-481545_wizvah.mp3", "thumb": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1775239928/image9_kluw8z.webp"},
        {"music": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1775238471/atlasaudio-calm-nature-510279_tadebs.mp3", "thumb": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1775239928/image7_sbwrjf.webp"},
    ],
    "tired": [
        {"music": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1775239156/psyai-nervous-system-regulation-for-emotional-safety-476518_op4xok.mp3", "thumb": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1775239934/image5_fzup2w.webp"},
        {"music": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1775239138/psyai-alpha-drift-alpha-brainwave-ambient-focus-and-deep-relaxation-481545_uvpjcz.mp3", "thumb": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1775239933/image2_zvr34k.webp"},
        {"music": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1775239135/psyai-sensory-reset-for-nervous-system-balance-476524_drzpts.mp3", "thumb": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1775239932/image1_dfvnvk.webp"},
        {"music": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1775239131/psyai-gentle-regulation-after-stress-and-anxiety-476520_ef83yh.mp3", "thumb": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1775239931/image8_awemg8.webp"},
        {"music": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1775239063/fassounds-lofi-study-calm-peaceful-chill-hop-112191_zcxcfm.mp3", "thumb": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1775239930/image4_szjtkw.webp"},
        {"music": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1775239038/fassounds-good-night-lofi-cozy-chill-music-160166_s2kcfd.mp3", "thumb": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1775239929/image6_dxvzhs.webp"},
        {"music": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1775238475/lofcosmos-focus-glow-lofi-269098_glhjqq.mp3", "thumb": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1775239929/image3_bjizuk.webp"},
        {"music": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1775238462/lofcosmos-focus-lofi-269097_mjcy6n.mp3", "thumb": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1775239928/image9_kluw8z.webp"},
        {"music": "https://res.cloudinary.com/dkjp9svlj/video/upload/v1775238424/bfcmusic-lofi-lo-fi-511230_f6ab2o.mp3", "thumb": "https://res.cloudinary.com/dkjp9svlj/image/upload/v1775239928/image7_sbwrjf.webp"},
    ]
}

@app.route('/generate_ai_recommendation', methods=['POST'])
def generate_ai_recommendation():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"success": False, "error": "Session expired."}), 401
    
    try:
        # 1. Fetch latest EEG report (Same logic)
        latest_report = supabase_ctx.table("eeg_reports") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()

        if not latest_report.data:
            return jsonify({"success": False, "error": "No EEG data found."}), 200

        report = latest_report.data[0]
        emotion = str(report.get('emotion_detected', 'Happy')).lower().strip()
        wave = report.get('dominant_wave', 'Alpha')

        # 2. Get Music (Same logic)
        mood_options = MUSIC_DATABASE.get(emotion, MUSIC_DATABASE.get("happy", []))
        track1 = random.choice(mood_options) if mood_options else {"music": "", "thumb": ""}
        track2 = random.choice(mood_options) if mood_options else track1

        # 3. AI Generation via OpenRouter (TF-Compatible)
        ai_prompt_text = f"User has {wave} waves and feels {emotion}. Return ONLY: Quote | Task1 | Task2 | Task3 | Task4 | Task5"
        
        # Fallbacks
        ai_quote = "Trust the rhythm of your mind."
        ai_tasks = ["Deep breathing", "Stay hydrated", "Gentle stretching", "Short walk", "Mindful smile"]

        try:
            # Using the OpenRouter chat completion instead of direct Gemini SDK
            response = ai_client.chat.completions.create(
                model="google/gemini-2.0-flash-001",
                messages=[{"role": "user", "content": ai_prompt_text}]
            )
            
            raw_text = response.choices[0].message.content.strip()
            print(f"--- AI RAW ---\n{raw_text}")

            if '|' in raw_text:
                parts = [p.strip() for p in raw_text.split('|') if p.strip()]
            else:
                parts = [p.strip() for p in raw_text.split('\n') if p.strip()]

            clean_parts = [re.sub(r'^(\d+\.|\-|\*)\s*', '', p) for p in parts]

            if len(clean_parts) >= 6:
                ai_quote = clean_parts[0]
                ai_tasks = clean_parts[1:6] 

        except Exception as ai_err:
            print(f"❌ AI API Error: {ai_err}")

        # 4. Save to Supabase (Same logic)
        supabase_ctx.table("recommendation").insert({
            "user_id": user_id,
            "emotion": emotion,
            "quote": ai_quote,
            "tasks": ai_tasks,
            "music_url": track1.get("music"),
            "image_url": track1.get("thumb")
        }).execute()

        return jsonify({
            "success": True, 
            "quote": ai_quote,
            "tasks": ai_tasks,
            "emotion": emotion.capitalize(),
            "track1": track1,
            "track2": track2
        })

    except Exception as e:
        print(f"CRITICAL ROUTE ERROR: {e}")
        return jsonify({"success": False, "error": "Internal Server Error"}), 500
    
@app.route('/predict_eeg', methods=['POST'])
def predict_eeg():
    avg_features = None 
    temp_path = None
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    # Ensure upload directory exists
    upload_dir = "uploads/eeg"
    os.makedirs(upload_dir, exist_ok=True)
    
    temp_path = os.path.join(upload_dir, secure_filename(file.filename))
    file.save(temp_path)

    try:
        avg_features = None
        # Step 1–7: Feature Extraction
        features_matrix = proc.process_signal(temp_path)
        
        if features_matrix is None or len(features_matrix) == 0:
            return jsonify({"error": "EEG processing failed. Data might be too noisy or short."}), 400

        # Step 7: Average features
        avg_features = np.mean(features_matrix, axis=0).reshape(1, -1).copy()

        # Step 8–10: Prediction
        probs_dict, raw_prediction, confidence_val = proc.predict_emotion(avg_features)

        # ✅ FIX: Ensure integer conversion (handles numpy.int64)
        pred_label = int(raw_prediction)

        # ✅ FINAL LABEL MAP (as per your requirement)
        NUM_TO_EMOTION = {
            0: "Angry",
            1: "Happy",
            2: "Sad",
            3: "Tired"
        }

        mood_text = NUM_TO_EMOTION.get(pred_label, "Unknown")

        # Step 10: Dominant Brain Wave
        band_names = list(proc.bands.keys())
        dom_wave = str(band_names[int(np.argmax(avg_features))])

        # Step 11: Graph + Recommendation
        graph_base64 = proc.generate_plot(probs_dict)
        rec = get_exercise_recommendation(dom_wave, mood_text)

        # Cleanup
        if os.path.exists(temp_path):
            os.remove(temp_path)

        return jsonify({
            "emotion": mood_text,
            "confidence": f"{round(float(confidence_val) * 100, 2)}%",
            "wave": dom_wave,
            "recommendation": rec,
            "graph": graph_base64
        })

    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        logging.error(f"Prediction Error: {e}")
        print("--- DETAILED ERROR TRACKING ---")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/api/get_inquiries')
def get_inquiries():
    user_email = session.get('user_email')
    
    # Check if user is logged in
    if not user_email:
        # RETURN JSON, NOT A REDIRECT!
        return jsonify({"success": False, "error": "unauthorized"}), 401

    try:
        # ... your existing Supabase logic ...
        response = supabase_ctx.table('contact_message').select('*').eq('email', user_email).execute()
        return jsonify({"success": True, "inquiries": response.data})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500 

@app.route('/admin/reply-message', methods=['POST'])
def reply_message():
    data = request.json
    msg_id = data.get('id')      # Matches your JS 'id'
    reply_text = data.get('reply') # Matches your JS 'reply'

    if not msg_id or not reply_text:
        return jsonify({"success": False, "message": "Missing data"}), 400

    try:
        # 1. Fetch the original message to get the user's email from 'contact_message'
        msg_res = supabase_ctx.table("contact_message").select("email, name").eq("id", msg_id).execute()
        
        if not msg_res.data:
            return jsonify({"success": False, "message": "Inquiry not found"}), 404
            
        user = msg_res.data[0]

        # 2. Send the Email
        email_msg = Message(
            subject="Reply to your NeuroHarmonics Inquiry",
            sender=app.config['MAIL_USERNAME'],
            recipients=[user['email']]
        )
        email_msg.body = f"Hello {user['name']},\n\n{reply_text}\n\nBest regards,\nNeuroHarmonics Admin"
        mail.send(email_msg)

        # 3. Update Supabase: Mark as resolved and store the reply
        supabase_ctx.table("contact_message").update({
            "is_resolved": True,
            "admin_reply": reply_text
        }).eq("id", msg_id).execute()

        return jsonify({"success": True})

    except Exception as e:
        print(f"Reply Error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    

@app.route('/predict_face', methods=['POST'])
def predict_face_emotion():
    try:
        data = request.json.get('image')
        if not data:
            return jsonify({"error": "No image data"}), 400

        # 1. Decode base64
        encoded_data = data.split(',')[1]
        nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # 2. Face detection (optimized parameters for better detection)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
        emotion = 'no face'

        if len(faces) > 0:
            # Take largest face
            (x, y, w, h) = faces[0]
            # Better preprocessing
            face = gray[y:y+h, x:x+w]
            # Histogram equalization
            face = cv2.equalizeHist(face)
            # Resize with INTER_CUBIC for better quality
            face = cv2.resize(face, (48, 48), interpolation=cv2.INTER_CUBIC)
            face = face.astype('float32') / 255.0
            # Normalize to mean=0, std=1 (common for FER models)
            face = (face - np.mean(face)) / np.std(face)
            face = np.clip(face, -1, 1)
            face = np.reshape(face, (1, 48, 48, 1))

            # 3. Predict
            preds = emotion_model.predict(face, verbose=0)
            idx = np.argmax(preds)
            emotion = EMOTION_LABELS[idx]
            confidence = float(preds[0][idx])

        # 4. Log to DB if user logged in (commented out due to potential DB issues)
        # user_id = session.get('user_id')
        # if user_id and emotion != 'no face':
        #     log = EmotionLog(user_id=user_id, emotion=emotion)
        #     db.session.add(log)
        #     db.session.commit()

        # Log to Supabase
        try:
            user_id = session.get('user_id')
            supabase_ctx.table("face_analysis").insert({
                "user_id": user_id,
                "image_url": data,  # base64 image
                "emotion": emotion
            }).execute()
        except Exception as db_err:
            print(f"Face log save error: {db_err}")

        return jsonify({
            "emotion": emotion,
            "confidence": f"{confidence*100:.1f}%" if emotion != 'no face' else 'N/A'
        })

    except Exception as e:
        print(f"Face Predict Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/emotions', methods=['GET'])
def get_emotions():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify([]), 401
    
    logs = EmotionLog.query.filter_by(user_id=user_id)\
        .order_by(EmotionLog.timestamp.desc())\
        .limit(50).all()
    
    return jsonify([{
        "emotion": log.emotion,
        "timestamp": log.timestamp.isoformat()
    } for log in logs])
    
from datetime import datetime, timedelta

@app.route('/api/get_reports')
def get_reports():
    month_str = request.args.get('month') # e.g., "2026-04"
    user_id = session.get('user_id')

    if not user_id or not month_str:
        return jsonify([])

    try:
        # Calculate start and end of the month
        start_date = f"{month_str}-01T00:00:00Z"
        
        # Determine the first day of the NEXT month
        year, month = map(int, month_str.split('-'))
        if month == 12:
            end_date = f"{year + 1}-01-01T00:00:00Z"
        else:
            end_date = f"{year}-{month + 1:02d}-01T00:00:00Z"

        # Query using GTE (Greater than or equal) and LT (Less than)
        query = supabase_ctx.table("eeg_reports")\
            .select("*")\
            .eq("user_id", user_id)\
            .gte("created_at", start_date)\
            .lt("created_at", end_date)\
            .order("created_at", desc=True)\
            .execute()

        return jsonify(query.data)
    except Exception as e:
        print(f"SQL Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/save_eeg_result', methods=['POST'])
def save_eeg_result():
    data = request.json
    # Get user_id from session if it's missing from the request
    user_id = data.get('user_id') or session.get('user_id')
    
    try:
        response = supabase_ctx.table('eeg_reports').insert({
            "user_id": user_id,
            "filename": data.get('filename'),
            "emotion_detected": data.get('emotion'),
            "confidence": str(data.get('confidence')), 
            "dominant_wave": data.get('dominant_wave'),
            "recommendation_name": data.get('recommendation_name'),
            "recommendation_benefit": data.get('recommendation_benefit'),
            "graph_base64": data.get('graph'),
            "admin_summary": None # Ensure this is initialized as null
        }).execute()
        
        return jsonify({"success": True, "message": "Report synced"}), 200
    except Exception as e:
        print(f"Supabase Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
    


@app.route('/play_pacman')
def play_pacman():
    import subprocess
    subprocess.Popen(['python', 'pacman.py'], cwd='games/PythonPacman-main')
    return jsonify({'status': 'Pacman launched in new terminal'})

@app.route('/play_flappy')
def play_flappy():
    import subprocess  
    subprocess.Popen(['python', 'flappybird.py'], cwd='games/flappy-bird-python-master/flappy-bird-python-master')
    return jsonify({'status': 'Flappy Bird launched in new terminal'})

@app.route('/play_space_invaders')
def play_space_invaders():
    import subprocess
    subprocess.Popen(['python', 'main.py'], cwd='games/space/Python-Space-Invaders-Game-with-Pygame-main')
    return jsonify({'status': 'Space Invaders launched in new terminal'})

@app.route('/forgot_password', methods=['POST'])
def forgot_password():
    email = request.json.get('email')
    
    # Check if user exists in Supabase
    user_check = supabase_ctx.table("user").select("*").eq("email", email).execute()
    
    if not user_check.data:
        return jsonify({"success": False, "error": "User with this email does not exist."}), 404

    # Generate Reset OTP
    reset_otp = str(random.randint(100000, 999999))
    session['reset_otp'] = reset_otp
    session['reset_email'] = email # Securely store which email is being reset

    msg = Message('NeuroHarmonics Password Reset', recipients=[email])
    msg.body = f"Your password reset code is: {reset_otp}. Use this to set a new password."
    
    try:
        mail.send(msg)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": "Failed to send email."})

@app.route('/reset_password', methods=['POST'])
def reset_password():
    data = request.json
    otp = data.get('otp')
    new_pass = data.get('newPassword')
    email = data.get('email')

    # Verify session data matches
    if otp == session.get('reset_otp') and email == session.get('reset_email'):
        try:
            hashed_password = generate_password_hash(new_pass)
            # Update password in Supabase
            supabase_ctx.table("user").update({
                "password": hashed_password
            }).eq("email", email).execute()

            # Clear reset data from session
            session.pop('reset_otp', None)
            session.pop('reset_email', None)
            
            return jsonify({"success": True})
        except Exception as e:
            return jsonify({"success": False, "error": str(e)})
            
    return jsonify({"success": False, "error": "Invalid OTP code"}), 400

from collections import Counter
import logging

@app.route('/admin')
def admin_dashboard():
    # 1. Security Check
    if session.get("role") != "admin":
        return redirect(url_for("admin_login_page"))

    try:
        # 2. Fetch Users (Table name: 'user')
        users_query = supabase_ctx.table("user").select("*").execute()
        users = users_query.data if users_query.data else []
        users_count = len(users)

        # 3. Fetch EEG Reports (Table name: 'eeg_report')
        # Ensure this table in Supabase has 'emotion_detected'
        eeg_query = supabase_ctx.table("eeg_reports").select("*").execute()
        eeg_data = eeg_query.data if eeg_query.data else []
        analysis_count = len(eeg_data)

        # 4. Prepare Emotion Graph Data
        # We capitalize to ensure grouping works even if case varies
        emotions_raw = [r.get('emotion_detected', 'Neutral').capitalize() for r in eeg_data]
        emotion_counts = dict(Counter(emotions_raw))
        
        e_labels = list(emotion_counts.keys())
        e_values = list(emotion_counts.values())

        # 5. Fetch Messages (Assuming table name 'contact_message')
        # If your table name is different, change it here:
        messages_query = supabase_ctx.table("contact_message").select("*").execute()
        messages = messages_query.data if messages_query.data else []

        return render_template(
            "admin/admin.html",
            users=users,
            users_count=users_count,
            analysis_count=analysis_count,
            emotion_labels=e_labels,
            emotion_values=e_values,
            messages=messages,
            today_count=0 # Placeholder
        )

    except Exception as e:
        logging.error(f"Dashboard Connection Error: {e}")
        # Return defaults so the page loads without the "Undefined" error
        return render_template(
            "admin/admin.html",
            users=[],
            users_count=0,
            analysis_count=0,
            emotion_labels=[],
            emotion_values=[],
            messages=[]
        )

def get_user_by_id(user_id):
    response = supabase_ctx.table("user").select("*").eq("id", user_id).execute()

    if response.data:
        return response.data[0]
    return None

def insert_notification(user_id, message):
    try:
        supabase_ctx.table("notifications").insert({
            "user_id": user_id,
            "message": message,
            "is_read": False
        }).execute()
        return True
    except Exception as e:
        print(f"❌ Error inserting notification: {e}")
        return False

def get_unread_notifications(user_id):
    # Use the global context variable we defined at the top of app.py
    global supabase_ctx
    
    # 1. Check if the connection exists
    if supabase_ctx is None:
        print("⚠️ Supabase client not initialized. Returning empty notifications.")
        return []

    try:
        # 2. Perform the query using the correct variable name: supabase_ctx
        response = supabase_ctx.table("notifications") \
            .select("*") \
            .eq("user_id", user_id) \
            .eq("is_read", False) \
            .execute()

        # 3. Safely return the data
        return response.data if hasattr(response, 'data') else []

    except Exception as e:
        print(f"❌ Error fetching notifications: {e}")
        return []

from datetime import date

today = date.today()
today_count = 0  # Default value if database is unreachable

# 1. Safety Check: Ensure the database client exists
if supabase_ctx is not None:
    try:
        # 2. Perform the query safely
        response = supabase_ctx.table("eeg_reports") \
            .select("*", count="exact") \
            .gte("created_at", str(today)) \
            .execute()

        # 3. Safely extract the count
        if hasattr(response, 'count'):
            today_count = response.count
            print(f"✅ Success: Found {today_count} EEG reports for {today}")
            
    except Exception as e:
        # This catches network errors or table-name typos
        print(f"❌ Database Query Error: {e}")
        today_count = 0 
else:
    # This prevents the "NoneType" AttributeError on a new machine
    print("⚠️ Supabase client not initialized. 'today_count' set to 0.")
    today_count = 0

# 2. DATABASE: Mark as Read (Newly Added)
def mark_notifications_read(user_id):
    try:
        supabase_ctx.table("notifications") \
            .update({"is_read": True}) \
            .eq("user_id", user_id) \
            .eq("is_read", False) \
            .execute()
    except Exception as e:
        print(f"❌ Error marking notifications as read: {e}")

# --- ADMIN: REPORT USER (Sends Email) ---
@app.route('/admin/report-user', methods=['POST'])
def admin_report_user():
    data = request.json
    uid = data.get('user_id')
    
    # Fetch user details from Supabase
    user_res = supabase_ctx.table("user").select("email, username").eq("id", uid).execute()
    
    if user_res.data:
        user = user_res.data[0]
        try:
            msg = Message("Official Report - NeuroHarmonics",
                          sender=app.config['MAIL_USERNAME'],
                          recipients=[user['email']])
            msg.body = f"Hello {user['username']},\n\nYour account has been reported by the system administrator for a policy violation. Please review our terms of service."
            mail.send(msg)
            return jsonify({"success": True})
        except Exception as e:
            return jsonify({"success": False, "message": str(e)}), 500
    return jsonify({"success": False, "message": "User not found"}), 404

# --- ADMIN: DELETE MULTIPLE USERS ---
@app.route('/admin/delete-users', methods=['POST'])
def admin_delete_users():
    uids = request.json.get('user_ids', [])
    try:
        for uid in uids:
            supabase_ctx.table("user").delete().eq("id", uid).execute()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

# --- ADMIN: ADD NEW USER ---
@app.route('/admin/add-user', methods=['POST'])
def admin_add_user():
    data = request.json
    new_user = {
        "username": data.get('username'),
        "email": data.get('email'),
        "password": data.get('password'), # Note: Ideally hash this!
        "status": "active"
    }
    try:
        supabase_ctx.table("user").insert(new_user).execute()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

# 3. ROUTE: Admin Notify User (Includes Email Logic)
@app.route('/admin/notify-user', methods=['POST'])
def notify_user():
    data = request.json
    user_id = data.get('user_id')
    message_text = data.get('message')

    if not user_id or not message_text:
        return jsonify({"success": False, "message": "Invalid data"}), 400

    # A. Save to Supabase Table
    db_status = insert_notification(user_id, message_text)

    # B. Send Notification Email
    try:
        # Fetch user email
        user_res = supabase_ctx.table("user").select("email, username").eq("id", user_id).execute()
        
        if user_res.data and db_status:
            user = user_res.data[0]
            
            # Send via Flask-Mail
            msg = Message("New Notification - NeuroHarmonics",
                          sender=app.config['MAIL_USERNAME'],
                          recipients=[user['email']])
            msg.body = f"Hello {user['username']},\n\nYou have a new notification from the Admin:\n\n{message_text}"
            mail.send(msg)
            
            return jsonify({"success": True})
        
        return jsonify({"success": False, "message": "User email not found"}), 404

    except Exception as e:
        print(f"❌ Notification Route Error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

# 4. ROUTE: Get User Notifications
@app.route('/get-notifications/<user_id>')
def get_notifications(user_id):
    # Fetch unread list
    notifications = get_unread_notifications(user_id)

    # Mark them read so they don't pop up again
    if notifications:
        mark_notifications_read(user_id)

    return jsonify(notifications)

if __name__ == "__main__":
    # Use the port assigned by the cloud provider, default to 5000
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host='0.0.0.0', port=port)

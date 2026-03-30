import os
import logging
import sqlalchemy
from flask import Flask, render_template, redirect, session, request, url_for, flash, jsonify
from sqlalchemy import func
from sqlalchemy.exc import OperationalError
import supabase

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
from models import db, Feedback, ContactMessage, User, CommunityMessage, Admin
from auth_routes import auth
from admin_routes import admin 
from datetime import datetime
from supabase import create_client, Client
from werkzeug.utils import secure_filename

from google import genai

import random

import pandas as pd
import numpy as np
import joblib
from processor import EEGProcessor

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
proc = EEGProcessor(fs=256)

# Setup Gemini (Use an Environment Variable for the API Key!)
client = genai.Client(api_key="AIzaSyAHNxqL07XaIfR_Xk3xiEvTzr86kYtTyIA")

# --- database utilities ------------------------------------------------

SUPABASE_URL = "https://rlbpjxrwgsurkbbtfyqy.supabase.co" 
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsYnBqeHJ3Z3N1cmtiYnRmeXF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNzkyMTEsImV4cCI6MjA4Nzc1NTIxMX0.fSiYOkbSjP7JsZGxNlT0J5sXmUuxrz2c-iiuCvjSNA0"
supabase_ctx: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_database_uri():
    uri = "postgresql://postgres:06kingbeast_2328@db.rlbpjxrwgsurkbbtfyqy.supabase.co:5432/postgres"
    try:
        engine = sqlalchemy.create_engine(uri)
        print("Database URI initialized.")
        return uri
    except Exception as e:
        print(f"Database connection error: {e}")
        return uri

print("Starting NeuroHarmonics Flask app...")
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

app.register_blueprint(auth)
app.register_blueprint(admin)

UPLOAD_FOLDER = 'static/uploads/profiles'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Create the folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

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

@app.route("/dashboard")
def dashboard():
    if "username" not in session:
        return redirect("/login")
    
    try:
        # 1. Get the current user object
        user = User.query.filter_by(username=session['username']).first()
        # 2. Fetch Community Messages (existing logic)
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
    return render_template("dashboard/dashboard.html",
                           user=user, 
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
        "title": "Child's Pose (Balasana)",
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
    elif 17 <= hour < 21:
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
            # Refresh the session to ensure a fresh connection
            db.session.remove() 
            user = User.query.get(user_id)
            if user:
                user.status = "inactive"
                db.session.commit()
        except Exception as e:
            logging.error(f"Logout DB Error: {e}")
            db.session.rollback()
    
    session.clear()
    return redirect("/login")

# --- Form Submissions ---

@app.route('/submit-feedback', methods=['POST'])
def submit_feedback():
    if 'username' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    # Using .first() is good practice here
    user = User.query.filter_by(username=session['username']).first()
    
    # Get form data
    rating_raw = request.form.get('rating')
    comment = request.form.get('comment')
    
    if not user:
        return jsonify({"error": "User not found"}), 404

    if not rating_raw:
        return jsonify({"error": "Rating is required"}), 400

    try:
        # Convert rating to integer before saving to Supabase
        rating_int = int(rating_raw)
        
        new_feedback = Feedback(
            user_id=user.id, 
            rating=rating_int, 
            comment=comment
        )
        
        db.session.add(new_feedback)
        db.session.commit()
        return jsonify({"success": True})

    except ValueError:
        return jsonify({"error": "Invalid rating format"}), 400
    except OperationalError as e:
        db.session.rollback() # Always rollback on failure
        logging.error(f"Database write failed: {e}")
        return jsonify({"error": "Database unavailable"}), 503
    except Exception as e:
        db.session.rollback()
        logging.error(f"Unexpected error: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/contact', methods=['POST'])
def handle_contact():
    # 1. Debug Session (Check your VS Code terminal)
    print(f"DEBUG: Current Session Keys: {list(session.keys())}")
    print(f"DEBUG: Email in Session: {session.get('user_email')}")
    
    # 2. Check for the specific key 'user_email' set in your login route
    user_email = session.get('user_email')
    if not user_email:
        return jsonify({"success": False, "error": "Session missing email. Please log out and back in."}), 401
    
    try:
        data = request.json
        if not data:
            return jsonify({"success": False, "error": "No data received"}), 400

        # 3. Refresh SQLAlchemy session to prevent 'Connection Closed' errors
        # This clears stale connections before we talk to Supabase
        db.session.remove() 

        # 4. Gather info from session (using the keys from your auth logic)
        user_id = session.get('user_id')
        user_name = session.get('username', 'Guest User')

        # 5. Prepare data for the 'contact_message' table
        new_message = {
            "user_id": user_id if user_id else None, # Ensures it's null if missing
            "name": user_name,
            "email": user_email,
            "subject": data.get('subject', 'No Subject'),
            "message": data.get('message'),
            "is_resolved": False,
            "admin_reply": None
        }

        # 6. Insert into Supabase
        # Ensure your Supabase client is initialized as 'supabase'
        result = supabase_ctx.table("contact_message").insert(new_message).execute()

        return jsonify({
            "success": True, 
            "message": "Support message sent!",
            "data": result.data
        }), 200

    except Exception as e:
        # This will print the EXACT error (typos, DB errors, etc.) in your terminal
        print(f"CRITICAL FLASK ERROR: {str(e)}") 
        return jsonify({"success": False, "error": str(e)}), 500


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

    # Case-insensitive query to the 'admins' table
    admin_user = Admin.query.filter(func.lower(Admin.username) == func.lower(u_input)).first()

    if admin_user:
        # We also .strip() the DB password in case it was stored as a fixed-length CHAR
        if admin_user.password.strip() == p_input:
            # 1. Establish the Secure Session
            session['username'] = admin_user.username
            session['role'] = 'admin'
            
            # 2. Update last login time using the DB timestamp
            admin_user.last_login = db.func.current_timestamp()
            
            # 3. Commit the changes to the 'admins' table
            db.session.commit()
            
            return jsonify({
                "success": True, 
                "redirect": url_for('admin_panel')
            })
    
    return jsonify({"success": False, "message": "Invalid Admin Credentials"}), 401


# unified admin dashboard route
@app.route("/admin")
def admin_panel():
    if session.get("role") != "admin":
        return redirect(url_for("admin_login_page"))
    try:
        users = User.query.all()
        users_count = User.query.count()
        messages = ContactMessage.query.filter_by(is_resolved=False).all()
    except OperationalError as e:
        logging.error(f"Database error in admin_panel(): {e}")
        users, users_count, messages = [], 0, []
    return render_template("admin/admin.html", users=users, users_count=users_count, messages=messages)


@app.route('/post-community', methods=['POST'])
def post_community():
    data = request.get_json()
    if 'username' in session and data.get('message'):
        new_msg = CommunityMessage(
            username=session['username'],
            content=data['message']
        )
        db.session.add(new_msg)
        db.session.commit()
        return jsonify({"success": True})
    return jsonify({"error": "Unauthorized"}), 401

@app.route('/update-profile', methods=['POST'])
def update_profile():
    new_name = request.form.get('username')
    user_id = session.get('user_id')
    photo = request.files.get('profile-photo')

    if not user_id:
        return jsonify({"success": False, "error": "Session expired. Please log in again."}), 401

    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({"success": False, "error": "User not found."}), 404

        # 1. Update Username
        if new_name:
            user.username = new_name
            session['username'] = new_name

        # 2. Update Profile Photo
       # Update Photo in Supabase Storage
        if photo and photo.filename != '':
            # 1. Create a unique path in the bucket
            file_ext = os.path.splitext(photo.filename)[1]
            storage_path = f"avatars/user_{user_id}{file_ext}"
            
            # 2. Read file content
            file_content = photo.read()
            
            # 3. Upload to Supabase Bucket 'avatars'
            # Note: Ensure you created a PUBLIC bucket named 'avatars' in Supabase first
            supabase_ctx.storage.from_('avatars').upload(
                path=storage_path,
                file=file_content,
                file_options={"upsert": "true", "content-type": photo.content_type}
            )
            
            # 4. Get Public URL and save to SQLAlchemy Database
            public_url = supabase_ctx.storage.from_('avatars').get_public_url(storage_path)
            user.avatar = public_url

        db.session.commit()
        return jsonify({"success": True})

    except Exception as e:
        db.session.rollback()
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
            "image": "https://res.cloudinary.com/dkjp9svlj/image/upload/f_auto,q_auto/v1/wellness/evening_calm"
        },
        {
            "text": "Engaging in light, low-impact stretching helps lower cortisol levels and releases physical tension accumulated throughout the day.",
            "image": "https://res.cloudinary.com/dkjp9svlj/image/upload/f_auto,q_auto/v1/wellness/evening_stretch"
        },
        {
            "text": "Practicing 'Digital Sunset'—turning off notifications an hour before bed—reduces cognitive load and prevents sleep-disrupting dopamine spikes.",
            "image": "https://res.cloudinary.com/dkjp9svlj/image/upload/f_auto,q_auto/v1/wellness/evening_digital_fast"
        }
    ],
    "night": [
        {
            "text": "Maintaining a bedroom temperature of 18°C (65°F) is scientifically proven to facilitate the transition into deep, restorative REM sleep.",
            "image": "https://res.cloudinary.com/dkjp9svlj/image/upload/f_auto,q_auto/v1/wellness/night_sleep"
        },
        {
            "text": "Practicing deep rhythmic breathing (4-7-8 method) activates the parasympathetic nervous system, effectively quieting a racing mind.",
            "image": "https://res.cloudinary.com/dkjp9svlj/image/upload/f_auto,q_auto/v1/wellness/night_breath"
        },
        {
            "text": "Writing a 'Brain Dump' list of tomorrow's tasks clears working memory, allowing the brain to enter a deeper state of relaxation.",
            "image": "https://res.cloudinary.com/dkjp9svlj/image/upload/f_auto,q_auto/v1/wellness/night_journal"
        }
    ]
}
    
def get_exercise_recommendation(dominant_frequency, predicted_mood):
    """
    Inputs: 
    - dominant_frequency: (e.g., 'Alpha', 'Beta', 'Theta', 'Delta')
    - predicted_mood: (e.g., 'Anxious', 'Focused', 'Fatigued')
    """
    
    # This prompt forces the AI to act as a Neuro-Fitness Expert
    prompt = (
        f"Context: User EEG shows dominant {dominant_frequency} waves. "
        f"Mood state is {predicted_mood}. "
        "Task: Recommend one physical exercise that helps optimize this neural state. "
        "Rules: \n"
        "1. If Beta/Anxious, suggest grounding/rhythmic movement.\n"
        "2. If Theta/Fatigued, suggest alert-increasing movement.\n"
        "3. If Alpha/Neutral, suggest flow-state activities.\n"
        "Format: Exercise Name | Neuro-Benefit (max 15 words) | SearchKeyword"
    )

    try:
        # FIXED SYNTAX:
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt
        )
        parts = response.text.split('|')
        return {
            "name": parts[0].strip(),
            "benefit": parts[1].strip(),
            "keyword": parts[2].strip()
        }
    except Exception as e:
        print(f"API Error: {e}")
        return {"name": "Yoga", "benefit": "Balances neural activity.", "keyword": "yoga"}


@app.route('/predict', methods=['POST'])
def predict():
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
        # Step 1–7: Feature Extraction
        features_matrix = proc.process_signal(temp_path)
        
        if len(features_matrix) == 0:
            return jsonify({"error": "No features extracted"}), 400

        # Step 7: Average features
        avg_features = np.mean(features_matrix, axis=0).reshape(1, -1)

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
    # Security Check
    if session.get('role') != 'admin':
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    data = request.get_json()
    msg_id = data.get('id')
    reply_text = data.get('reply')

    try:
        # 1. Update the record in Postgres via SQLAlchemy
        # This will trigger the Supabase Realtime update to the user
        message = ContactMessage.query.get(msg_id)
        if message:
            message.admin_reply = reply_text
            message.is_resolved = True 
            db.session.commit()
            return jsonify({"success": True})
        
        # This runs only if 'message' is None
        return jsonify({"success": False, "message": "Message not found"}), 404
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

if __name__ == "__main__":
    # This keeps the server running until you press Ctrl+C
    app.run(host='0.0.0.0', port=5000, debug=True)
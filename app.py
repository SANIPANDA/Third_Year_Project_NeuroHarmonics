import os
import logging
import sqlalchemy
from flask import Flask, render_template, redirect, session, request, url_for, flash, jsonify
from sqlalchemy import func
from sqlalchemy.exc import OperationalError

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
supabase_storage: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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


@app.route("/health-tips")
def health_tips():
    hour = datetime.now().hour
    
    # Identify time period
    if 5 <= hour < 12:
        period, greeting = "morning", "Good Morning"
    elif 12 <= hour < 17:
        period, greeting = "afternoon", "Good Afternoon"
    elif 17 <= hour < 21:
        period, greeting = "evening", "Good Evening"
    else:
        period, greeting = "night", "Good Night"

    # Select a random tip from that period
    selected_tip = random.choice(WELLNESS_DATA[period])

    return render_template("index/health_tips.html", 
                           greeting=greeting, 
                           tip=selected_tip)

@app.route("/logout")
def logout():
    # 1. Get the user ID from the session before clearing it
    user_id = session.get("user_id")
    
    if user_id:
        # 2. Find the user in the database
        user = User.query.get(user_id)
        if user:
            # 3. Change status to inactive
            user.status = "inactive"
            db.session.commit()
    
    # 4. Wipe the session clean
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

@app.route('/send-message', methods=['POST'])
def send_message():
    user = User.query.filter_by(username=session.get('username')).first()
    user_id = user.id if user else None
    
    try:
        new_message = ContactMessage(
            user_id=user_id,
            name=session.get('username', 'Guest'),
            email=user.email if user else "guest@example.com",
            subject=request.form.get('subject'),
            message=request.form.get('message')
        )
        db.session.add(new_message)
        db.session.commit()
        return jsonify({"success": True})
    except OperationalError as e:
        logging.error(f"Database write failed in send_message: {e}")
        return jsonify({"error": "Database unavailable"}), 503

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


@app.route('/admin/reply-message', methods=['POST'])
def reply_message():
    if session.get('role') != 'admin':
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    data = request.get_json()
    msg_id = data.get('id')
    reply_text = data.get('reply')

    try:
        message = ContactMessage.query.get(msg_id)
        if message:
            message.admin_reply = reply_text
            message.is_resolved = True  # Mark as resolved so it clears from dashboard
            db.session.commit()
            return jsonify({"success": True})
        return jsonify({"success": False, "message": "Message not found"}), 404
    except OperationalError as e:
        logging.error(f"Database error in reply_message: {e}")
        return jsonify({"success": False, "message": "Database unavailable"}), 503

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
            supabase_storage.storage.from_('avatars').upload(
                path=storage_path,
                file=file_content,
                file_options={"upsert": "true", "content-type": photo.content_type}
            )
            
            # 4. Get Public URL and save to SQLAlchemy Database
            public_url = supabase_storage.storage.from_('avatars').get_public_url(storage_path)
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
    
    
if __name__ == "__main__":
    # This keeps the server running until you press Ctrl+C
    app.run(host='0.0.0.0', port=5000, debug=True)
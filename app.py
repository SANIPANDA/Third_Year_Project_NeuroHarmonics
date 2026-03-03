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


# --- database utilities ------------------------------------------------

def get_database_uri():
    """
    Returns the Supabase PostgreSQL connection string.
    Note: Connection will be established when first query runs.
    """
    uri = "postgresql://postgres:06kingbeast_2328@db.rlbpjxrwgsurkbbtfyqy.supabase.co:5432/postgres"
    try:
        # 3. Remove connect_args from here to stop the TypeError
        engine = sqlalchemy.create_engine(uri)
        print("Database URI initialized.")
        # Just a quick check, don't let it hang the whole app
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

# Register blueprints
app.register_blueprint(auth)
app.register_blueprint(admin)

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
                           username=user.username, 
                           community_messages=messages,
                           inquiries=personal_inquiries) # Passing new data here


@app.route("/health-tips")
def health_tips():
    return render_template("index/health_tips.html")

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
    
    user = User.query.filter_by(username=session['username']).first()
    rating = request.form.get('rating')
    comment = request.form.get('comment')
    
    if user:
        try:
            new_feedback = Feedback(user_id=user.id, rating=rating, comment=comment)
            db.session.add(new_feedback)
            db.session.commit()
            return jsonify({"success": True})
        except OperationalError as e:
            logging.error(f"Database write failed in submit_feedback: {e}")
            return jsonify({"error": "Database unavailable"}), 503
    return jsonify({"error": "User not found"}), 404

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

if __name__ == "__main__":
    print("Database URI configured. The app will connect to the database on first use.")
    app.run(debug=True)

from flask import Blueprint, request, jsonify, session
from models import db, User
from werkzeug.security import check_password_hash, generate_password_hash
import re

auth = Blueprint("auth", __name__, url_prefix="/api")
 
# Validation helpers
def is_valid_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def is_strong_password(password):
    """Validate password strength (min 8 chars, alphanumeric)"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    if not re.search(r'[a-z]', password):
        return False, "Password must contain lowercase letters"
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain uppercase letters"
    if not re.search(r'[0-9]', password):
        return False, "Password must contain numbers"
    return True, "Valid"

from flask import request, jsonify, session
from werkzeug.security import check_password_hash

@auth.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"success": False, "error": "Email and password required"}), 400

        # 1. Fetch user from database
        user = User.query.filter_by(email=email).first()

        # 2. Verify existence and password hash
        if not user or not check_password_hash(user.password, password):
            return jsonify({"success": False, "error": "Invalid email or password"}), 401

        # 3. Determine display name
        username = user.username if user.username else (user.email.split('@')[0] if user.email else "User")

        # 4. Set Session Variables (Crucial for the Support Form)
        session["user_id"] = user.id
        session["username"] = username
        session["user_email"] = user.email  # <--- FIXED: The Missing Link
        session["role"] = user.role

        # 5. Update user status to active
        user.status = "active"
        
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            return jsonify({"success": False, "error": "Database error"}), 500

        # 6. Return success (Frontend will handle the redirect to /dashboard)
        return jsonify({
            "success": True, 
            "username": username,
            "redirect": "/dashboard"
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": "Server error"}), 500
    
@auth.route("/register", methods=["POST"])
def register():
    try:
        data = request.get_json() or {}
        fullName = data.get("fullName") or data.get("full_name") or data.get("name")
        email = data.get("email")
        password = data.get("password")

        if not fullName or not email or not password:
            return jsonify({"success": False, "error": "All fields required"}), 400

        # Validate email format
        if not is_valid_email(email):
            return jsonify({"success": False, "error": "Invalid email format"}), 400

        # Validate password strength
        is_strong, msg = is_strong_password(password)
        if not is_strong:
            return jsonify({"success": False, "error": msg}), 400

        # Validate fullName (alphanumeric + spaces)
        if not re.match(r'^[a-zA-Z\s]+$', fullName):
            return jsonify({"success": False, "error": "Name must contain only letters and spaces"}), 400

        # Prevent duplicate emails
        if User.query.filter_by(email=email).first():
            return jsonify({"success": False, "error": "Email already registered"}), 400

        hashed = generate_password_hash(password)
        user = User(username=fullName.strip(), email=email.strip(), password=hashed)
        db.session.add(user)
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            return jsonify({"success": False, "error": "Database error"}), 500

        # Auto-login after registration
        session["user_id"] = user.id
        session["username"] = user.username
        session["role"] = user.role

        return jsonify({"success": True, "username": user.username})
    except Exception:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": "Server error"}), 500

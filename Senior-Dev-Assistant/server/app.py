from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3

app = Flask(__name__)
CORS(app)

def get_db():
    conn = sqlite3.connect("project.db")
    conn.row_factory = sqlite3.Row
    return conn


@app.route("/admins", methods=["GET"])
def get_admins():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
    SELECT admin_id, name, email, username, phone, role, created_at
    FROM admins
""")
    data = cur.fetchall()
    conn.close()
    return jsonify([dict(row) for row in data])


@app.route("/add-admin", methods=["POST"])
def add_admin():
    data = request.json

    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO admins (name, email, username, phone, password)
        VALUES (?, ?, ?, ?, ?)
    """, (
        data["name"],
        data["email"],
        data["username"],
        data["phone"],
        data["password"]
    ))

    conn.commit()
    conn.close()
    return {"message": "Admin added successfully"}


@app.route("/activities", methods=["GET"])
def get_activities():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM activities")
    rows = cur.fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


if __name__ == "__main__":
    app.run(debug=True)

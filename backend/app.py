from flask import Flask, jsonify, request
import os
import requests
import re
import sqlite3
from dotenv import load_dotenv
from flask_cors import CORS
import logging
from fuzzywuzzy import fuzz, process
import jwt
from datetime import datetime, timedelta
from functools import wraps
logging.basicConfig(level=logging.INFO)

load_dotenv("backend/.env")

HF_API_TOKEN = os.getenv("HF_API_TOKEN")
print("HF_API_TOKEN:", HF_API_TOKEN)

app = Flask(__name__)
CORS(app)

MODEL = "openai/gpt-oss-120b"
DB_FILE = "anime.db"

# -----------------------------
# ADMIN LOGIN CONFIG
# -----------------------------
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "123")
JWT_SECRET = os.getenv("JWT_SECRET", "supersecretkey")  # change in production
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60  # token valid for 1 hour
revoked_tokens = set()


# -----------------------------
# DATABASE CONNECTION
# -----------------------------

def get_db():
    conn = sqlite3.connect(DB_FILE, timeout=30, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


# -----------------------------
# GET ALL ANIME
# -----------------------------

@app.route("/anime")
def get_anime():
    offset = int(request.args.get("offset", 0))
    limit = int(request.args.get("limit", 50))

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, title, year, genres, description, image_url, popularity, link
        FROM anime
        ORDER BY popularity ASC
        LIMIT ? OFFSET ?
    """, (limit, offset))

    rows = cursor.fetchall()
    conn.close()

    anime_list = [dict(row) for row in rows]
    return jsonify(anime_list)


# -----------------------------
# EXTRACT TITLES FROM LLM
# -----------------------------

def extract_anime_titles(text):

    pattern = r"\|\s*\d+\s*\|\s*\*\*(.*?)\*\*"
    titles = re.findall(pattern, text)

    return titles


# -----------------------------
# RECOMMENDATION ENDPOINT
# -----------------------------

@app.route("/recommend", methods=["POST"])
def recommend():
    data = request.json
    favorites = data.get("favorites", [])

    if not favorites:
        return jsonify({"error": "No favorites provided"}), 400

    anime_list = "\n".join(favorites)

    # LLM prompt: ask for Romaji + English + reason
    messages = [
        {"role": "system", "content": "You are an anime recommendation expert."},
        {
            "role": "user",
            "content": f"""
A user likes the following anime:

{anime_list}

Recommend 10 anime they would enjoy.
Return a Markdown table with these columns:
1. Number
2. Title in Romaji (Japanese)
3. English Title
4. Year
5. Reason (Explain why this anime is recommended and how it is similar to the user's favorites).

Do not include anime already listed.
Use Romaji for Japanese titles, do not use Kanji or Kana.
"""
        }
    ]

    url = "https://router.huggingface.co/v1/chat/completions"
    headers = {"Authorization": f"Bearer {HF_API_TOKEN}", "Content-Type": "application/json"}
    payload = {"model": MODEL, "messages": messages}

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        if response.status_code != 200:
            return jsonify({"error": f"Status {response.status_code}", "body": response.text}), 500

        data = response.json()
        raw_text = data["choices"][0]["message"]["content"]

        logging.info("===== RAW LLM OUTPUT =====")
        logging.info(raw_text)
        logging.info("==========================")

        # -----------------------------
        # EXTRACT TITLES AND REASONS
        # -----------------------------
        # Match lines in Markdown table
        lines = raw_text.split("\n")
        recommendations_raw_list = []
        for line in lines:
            if re.match(r"^\|\s*\d+\s*\|", line):
                # Example line:
                # | 1 | **Code Geass: Hangyaku no Lelouch** | Code Geass: Lelouch of the Rebellion | 2006 | Reason here... |
                parts = line.split("|")
                if len(parts) >= 6:
                    romaji_title = parts[2].strip().strip("**")
                    english_title = parts[3].strip()
                    reason = parts[5].strip()
                    recommendations_raw_list.append({
                        "romaji": romaji_title,
                        "english": english_title,
                        "reason": reason
                    })

        # -----------------------------
        # FUZZY MATCH TITLES AGAINST DATABASE
        # -----------------------------
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT title FROM anime")
        db_titles = [row["title"] for row in cursor.fetchall()]
        conn.close()

        matched_titles = set()
        for rec in recommendations_raw_list:
            for title in [rec["english"], rec["romaji"]]:
                if title.strip():
                    match = process.extractOne(title, db_titles, scorer=fuzz.token_sort_ratio)
                    if match and match[1] >= 85:  # threshold
                        matched_titles.add(match[0])

        if not matched_titles:
            return jsonify({"recommendations_raw": raw_text, "recommendations": []})

        # -----------------------------
        # FETCH MATCHED ANIME FROM DATABASE
        # -----------------------------
        conn = get_db()
        cursor = conn.cursor()
        placeholders = ",".join(["?"] * len(matched_titles))
        cursor.execute(f"""
            SELECT id, title, year, genres, description, image_url, link
            FROM anime
            WHERE title IN ({placeholders})
        """, list(matched_titles))
        rows = cursor.fetchall()
        conn.close()

        # Map reasons to matched titles
        final_recommendations = []
        for row in rows:
            # Try to find reason from raw list
            reason = ""
            for rec in recommendations_raw_list:
                if rec["english"] == row["title"] or rec["romaji"] == row["title"]:
                    reason = rec["reason"]
                    break

            final_recommendations.append({
                "id": row["id"],
                "title": row["title"],
                "year": row["year"],
                "genres": row["genres"],  # <-- add this line
                "description": row["description"],
                "image_url": row["image_url"],
                "link": row["link"] if "link" in row.keys() else "",
                "reason": reason
            })

        return jsonify({"recommendations_raw": raw_text, "recommendations": final_recommendations})

    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e)}), 500

@app.route("/search")
def search_anime():
    query = request.args.get("q", "")

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, title, image_url
        FROM anime
        WHERE title LIKE ?
        LIMIT 10
    """, (f"%{query}%",))

    results = cursor.fetchall()

    anime = [
        {
            "id": row[0],
            "title": row[1],
            "image_url": row[2]
        }
        for row in results
    ]

    return jsonify(anime)

@app.route("/browse")
def browse_anime():
    offset = int(request.args.get("offset", 0))
    limit = int(request.args.get("limit", 100))  # default 100
    
    conn = get_db()
    cursor = conn.cursor()


    # Fetch top 100 by popularity (can later add offset for "Load More")
    cursor.execute("""
        SELECT id, title, image_url, popularity, link
        FROM anime
        ORDER BY popularity ASC
        LIMIT ? OFFSET ?
    """, (limit, offset))
    results = cursor.fetchall()
    conn.close()

    anime = [
        {
            "id": row[0],
            "title": row[1],
            "image_url": row[2],
            "popularity": row[3],
            "link": row[4]
        }
        for row in results
    ]

    return jsonify(anime)

@app.route("/admin/login", methods=["POST"])
def admin_login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    if username != ADMIN_USERNAME or password != ADMIN_PASSWORD:
        return jsonify({"error": "Invalid credentials"}), 401

    payload = {
        "sub": username,
        "exp": datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MINUTES)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return jsonify({"token": token})


def admin_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid token"}), 401
        token = auth_header.split(" ")[1]

        # Check if token has been revoked
        if token in revoked_tokens:
            return jsonify({"error": "Token revoked"}), 401

        try:
            jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        return f(*args, **kwargs)
    return wrapper

# Admin create
@app.route("/admin/create", methods=["POST"])
@admin_required
def admin_create():
    data = request.json
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO anime (title, year, genres, description, image_url, popularity, link)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (data["title"], data["year"], data["genres"], data["description"], data["image_url"], data["popularity"], data["link"]))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

# Admin delete
@app.route("/admin/delete", methods=["POST"])
@admin_required
def admin_delete():
    data = request.json
    anime_id = data["id"]
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM anime WHERE id = ?", (anime_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

@app.route("/admin/edit", methods=["POST"])
@admin_required
def admin_edit():
    data = request.json
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE anime
        SET title = ?, year = ?, genres = ?, description = ?, image_url = ?, popularity = ?, link = ?
        WHERE id = ?
    """, (data["title"], data["year"], data["genres"], data["description"], data["image_url"], data["popularity"], data["link"], data["id"]))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

@app.route("/admin/logout", methods=["POST"])
@admin_required
def admin_logout():
    auth_header = request.headers.get("Authorization")
    token = auth_header.split(" ")[1]
    revoked_tokens.add(token)
    return jsonify({"success": True})


# -----------------------------
# RUN SERVER
# -----------------------------

if __name__ == "__main__":
    app.run(debug=True)
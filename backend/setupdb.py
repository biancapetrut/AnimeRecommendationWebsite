import sqlite3
import csv

# Path to your CSV file with anime data
CSV_FILE = "anime_for_db.csv"

# Connect to SQLite database (creates the file if it doesn't exist)
conn = sqlite3.connect("anime.db")
cursor = conn.cursor()

# Create Anime table with popularity and link columns
cursor.execute("""
CREATE TABLE IF NOT EXISTS anime (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    year INTEGER,
    genres TEXT,
    description TEXT,
    image_url TEXT,
    popularity INTEGER NOT NULL,
    link TEXT NOT NULL
)
""")
conn.commit()

# Function to load CSV into database
def load_csv_into_db(csv_file):
    skipped = 0
    with open(csv_file, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            title = row.get("title", "").strip()
            year = row.get("year")
            genres = row.get("genres", "").strip()
            description = row.get("description", "").strip()
            image_url = row.get("image_url", "").strip()
            link = row.get("link", "").strip()
            
            # Skip if any critical fields are missing
            if not title or not genres or not description or not image_url or not link:
                skipped += 1
                continue

            # Skip if popularity is missing or invalid
            try:
                popularity = int(row.get("popularity"))
            except (TypeError, ValueError):
                skipped += 1
                continue

            try:
                cursor.execute("""
                INSERT INTO anime (title, year, genres, description, image_url, popularity, link)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (title, year, genres, description, image_url, popularity, link))
            except sqlite3.IntegrityError:
                skipped += 1
                continue

    conn.commit()
    print(f"CSV data loaded into database. Skipped {skipped} problematic rows.")

# Load CSV
load_csv_into_db(CSV_FILE)

# Close the connection
conn.close()
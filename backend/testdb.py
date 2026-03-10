import sqlite3

conn = sqlite3.connect("anime.db")
cursor = conn.cursor()

# Fetch 5 entries
cursor.execute("SELECT id, title, year FROM anime LIMIT 5")
rows = cursor.fetchall()

for r in rows:
    print(r)

conn.close()
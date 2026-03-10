import React, { useState, useEffect, useRef } from "react";

function AdminPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  // Initialize token from localStorage
  const [token, setToken] = useState(() => localStorage.getItem("adminToken") || "");
  const [loggedIn, setLoggedIn] = useState(false);

  const [animeList, setAnimeList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [expandedAnime, setExpandedAnime] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnime, setEditingAnime] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    year: "",
    genres: "",
    description: "",
    image_url: "",
    popularity: "",
    link: "",
  });

  // -----------------------------
  // INFINITE SCROLL SETUP
  // -----------------------------
  const LIMIT = 50;
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const listRef = useRef(null);

  const fetchAnime = async (reset = false) => {
    if (!hasMore && !reset) return;

    setLoading(true);
    try {
      const res = await fetch(
        `http://127.0.0.1:5000/anime?offset=${reset ? 0 : offset}&limit=${LIMIT}`
      );
      const data = await res.json();

      if (reset) {
        setAnimeList(data);
        setOffset(LIMIT);
        setHasMore(data.length === LIMIT);
      } else {
        setAnimeList((prev) => [...prev, ...data]);
        setOffset((prev) => prev + LIMIT);
        setHasMore(data.length === LIMIT);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (e) => {
    const bottom =
      e.target.scrollHeight - e.target.scrollTop <= e.target.clientHeight + 50;
    if (bottom && !loading && hasMore) fetchAnime();
  };

  // -----------------------------
  // LOGIN
  // -----------------------------
  const handleLogin = async () => {
    try {
      const res = await fetch("http://127.0.0.1:5000/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.status === 200) {
        setToken(data.token);
        localStorage.setItem("adminToken", data.token); // persist token
        setLoggedIn(true);
        setOffset(0);
        setHasMore(true);
        fetchAnime(true);
      } else {
        alert(data.error || "Login failed");
      }
    } catch (err) {
      console.error(err);
      alert("Login error");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  // -----------------------------
  // LOGOUT, DELETE, TOGGLE, MODAL, FORM HANDLERS
  // -----------------------------
  const handleLogout = async () => {
    try {
      if (token) {
        await fetch("http://127.0.0.1:5000/admin/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setToken("");
      localStorage.removeItem("adminToken"); // remove token
      setLoggedIn(false);
      setAnimeList([]);
      setUsername("");
      setPassword("");
    }
  };

  const deleteAnime = async (id) => {
    if (!window.confirm("Delete this anime?")) return;

    try {
      const res = await fetch("http://127.0.0.1:5000/admin/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();
      if (data.success) fetchAnime(true);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleExpand = (id) => {
    setExpandedAnime(expandedAnime === id ? null : id);
  };

  const openCreateModal = () => {
    setEditingAnime(null);
    setIsCreating(true);
    setFormData({
      title: "",
      year: "",
      genres: "",
      description: "",
      image_url: "",
      popularity: "",
      link: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (anime) => {
    setEditingAnime(anime);
    setIsCreating(false);
    setFormData({
      title: anime.title || "",
      year: anime.year || "",
      genres: anime.genres || "",
      description: anime.description || "",
      image_url: anime.image_url || "",
      popularity: anime.popularity || "",
      link: anime.link || "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAnime(null);
    setIsCreating(false);
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const submitForm = async () => {
    try {
      const url = isCreating
        ? "http://127.0.0.1:5000/admin/create"
        : "http://127.0.0.1:5000/admin/edit";

      const body = isCreating ? formData : { id: editingAnime.id, ...formData };

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        fetchAnime(true);
        closeModal();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredAnime = animeList.filter((anime) =>
    anime.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // -----------------------------
  // AUTO-LOGIN ON PAGE LOAD
  // -----------------------------
  useEffect(() => {
    if (token) {
      setLoggedIn(true);
      setOffset(0);
      setHasMore(true);
      fetchAnime(true);
    }
  }, []);

  // -----------------------------
  // LOGIN PAGE
  // -----------------------------
  if (!loggedIn) {
    return (
      <div style={{ padding: "2rem" }}>
        <h2>Admin Login</h2>
        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <button onClick={handleLogin}>Login</button>
      </div>
    );
  }

  // -----------------------------
  // ADMIN PANEL
  // -----------------------------
  return (
    <div style={{ padding: "2rem" }}>
      <h2>Admin Panel</h2>
      <button onClick={handleLogout}>Logout</button>
      <button onClick={openCreateModal} style={{ marginLeft: "10px" }}>
        Create Anime
      </button>

      {/* SEARCH */}
      <div style={{ margin: "1rem 0", position: "relative", width: "250px" }}>
        <input
          placeholder="Search anime..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ padding: "5px", width: "100%" }}
        />
        {searchQuery && (
          <span
            onClick={() => setSearchQuery("")}
            style={{
              position: "absolute",
              right: "5px",
              top: "50%",
              transform: "translateY(-50%)",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            ×
          </span>
        )}
      </div>

      {/* LIST */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        style={{ maxHeight: "70vh", overflowY: "auto" }}
      >
        {filteredAnime.map((anime) => (
          <div key={anime.id} style={{ borderBottom: "1px solid #ddd", padding: "10px 0" }}>
            <div
              onClick={() => toggleExpand(anime.id)}
              style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
            >
              <span style={{ fontSize: "20px", marginRight: "10px" }}>
                {expandedAnime === anime.id ? "▼" : "▶"}
              </span>
              <img
                src={anime.image_url}
                alt={anime.title}
                style={{
                  width: "70px",
                  height: "100px",
                  objectFit: "cover",
                  borderRadius: "4px",
                  marginRight: "15px",
                }}
              />
              <h3 style={{ margin: 0 }}>{anime.title}</h3>
            </div>

            {expandedAnime === anime.id && (
              <div
                style={{
                  marginTop: "10px",
                  marginLeft: "95px",
                  background: "#f9f9f9",
                  padding: "15px",
                  borderRadius: "6px",
                }}
              >
                <p><b>Year:</b> {anime.year}</p>
                <p><b>Genres:</b> {anime.genres}</p>
                <p style={{ maxWidth: "800px" }}>
                  <b>Description:</b><br />
                  {anime.description}
                </p>
                <p>
                  <b>Link:</b>{" "}
                  <a href={anime.link} target="_blank" rel="noreferrer">{anime.link}</a>
                </p>
                <div style={{ marginTop: "10px" }}>
                  <button onClick={() => openEditModal(anime)}>Edit</button>
                  <button onClick={() => deleteAnime(anime.id)} style={{ marginLeft: "10px" }}>Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {loading && <p>Loading...</p>}
        {!hasMore && !loading && <p style={{ textAlign: "center" }}>No more anime.</p>}
      </div>

      {/* MODAL (unchanged) */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "2rem",
              borderRadius: "8px",
              width: "500px",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
          >
            <h3>{isCreating ? "Create Anime" : "Edit Anime"}</h3>

            <label>Title</label>
            <input name="title" value={formData.title} onChange={handleChange} style={{ width: "100%" }} />

            <label>Year</label>
            <input name="year" value={formData.year} onChange={handleChange} style={{ width: "100%" }} />

            <label>Genres</label>
            <input name="genres" value={formData.genres} onChange={handleChange} style={{ width: "100%" }} />

            <label>Description</label>
            <textarea name="description" rows="5" value={formData.description} onChange={handleChange} style={{ width: "100%" }} />

            <label>Image URL</label>
            <input name="image_url" value={formData.image_url} onChange={handleChange} style={{ width: "100%" }} />
            {formData.image_url && (
              <div style={{ marginTop: "10px", textAlign: "center" }}>
                <img src={formData.image_url} alt="preview" style={{ width: "150px", borderRadius: "6px" }} />
              </div>
            )}

            <label>Popularity</label>
            <input name="popularity" value={formData.popularity} onChange={handleChange} style={{ width: "100%" }} />

            <label>Link</label>
            <input name="link" value={formData.link} onChange={handleChange} style={{ width: "100%" }} />

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px" }}>
              <button onClick={submitForm}>{isCreating ? "Create" : "Save"}</button>
              <button onClick={closeModal}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPage;
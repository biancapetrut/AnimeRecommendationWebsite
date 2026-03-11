import React, { useState, useEffect } from "react";
import "./App.css";

function AdminPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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

  // WRAPPED FETCH TO HANDLE 401
  const apiRequest = async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
      },
    });

    // Auto-logout if token is invalid/expired
    if (res.status === 401) {
      alert("Session expired. Please log in again.");
      handleLogout();
      return null;
    }

    return res.json();
  };

  // FETCH ANIME
  const fetchAnime = async () => {
    setLoading(true);
    try {
      const data = await apiRequest("http://127.0.0.1:5000/anime");
      if (data) setAnimeList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // LOGIN / LOGOUT
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
        localStorage.setItem("adminToken", data.token);
        setLoggedIn(true);
        fetchAnime();
      } else {
        alert(data.error || "Login failed");
      }
    } catch (err) {
      console.error(err);
      alert("Login error");
    }
  };

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
      localStorage.removeItem("adminToken");
      setLoggedIn(false);
      setAnimeList([]);
      setUsername("");
      setPassword("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  // Anime actions / CRUD operations
  const deleteAnime = async (id) => {
    if (!window.confirm("Delete this anime?")) return;

    const data = await apiRequest("http://127.0.0.1:5000/admin/delete", {
      method: "POST",
      body: JSON.stringify({ id }),
    });

    if (data?.success) fetchAnime();
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
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const submitForm = async () => {
    const url = isCreating
      ? "http://127.0.0.1:5000/admin/create"
      : "http://127.0.0.1:5000/admin/edit";
    const body = isCreating ? formData : { id: editingAnime.id, ...formData };

    const data = await apiRequest(url, { method: "POST", body: JSON.stringify(body) });
    if (data?.success) {
      fetchAnime();
      closeModal();
    }
  };

  const filteredAnime = animeList.filter((anime) =>
    anime.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // INITIAL EFFECT
  useEffect(() => {
    if (token) {
      setLoggedIn(true);
      fetchAnime();
    }
  }, []);

  // RENDER
  if (!loggedIn) {
    return (
      <div style={{ padding: "2rem" }} className="admin-login-page">
        <h2 className="admin-login-title">Admin Login</h2>
        <div className="admin-login-form">
          <input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={handleKeyPress}
            className="admin-input"
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            className="admin-input"
          />
          <button onClick={handleLogin} className="admin-button">Login</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }} className="admin-panel">
      <h2 className="admin-panel-title">Admin Panel</h2>
      <button onClick={handleLogout} className="admin-button">Logout</button>
      <button onClick={openCreateModal} style={{ marginLeft: "10px" }} className="admin-button">
        Create Anime
      </button>

      <div style={{ margin: "1rem 0", position: "relative", width: "250px" }} className="admin-search">
        <input
          placeholder="Search anime..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ padding: "5px", width: "100%" }}
          className="admin-input"
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
            className="admin-clear-search"
          >
            ×
          </span>
        )}
      </div>

      <div style={{ maxHeight: "70vh", overflowY: "auto" }} className="admin-anime-list">
        {filteredAnime.map((anime) => (
          <div key={anime.id} style={{ borderBottom: "1px solid #ddd", padding: "10px 0" }} className="admin-anime-item">
            <div
              onClick={() => toggleExpand(anime.id)}
              style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
              className="admin-anime-summary"
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
                className="admin-anime-image"
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
                className="admin-anime-details"
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
                  <button onClick={() => openEditModal(anime)} className="admin-button">Edit</button>
                  <button onClick={() => deleteAnime(anime.id)} style={{ marginLeft: "10px" }} className="admin-button">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {loading && <p>Loading...</p>}
      </div>

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
          className="admin-modal-overlay"
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
            className="admin-modal-content"
          >
            <h3>{isCreating ? "Create Anime" : "Edit Anime"}</h3>

            <label>Title</label>
            <input name="title" value={formData.title} onChange={handleChange} style={{ width: "100%" }} className="admin-input" />

            <label>Year</label>
            <input name="year" value={formData.year} onChange={handleChange} style={{ width: "100%" }} className="admin-input" />

            <label>Genres</label>
            <input name="genres" value={formData.genres} onChange={handleChange} style={{ width: "100%" }} className="admin-input" />

            <label>Description</label>
            <textarea name="description" rows="5" value={formData.description} onChange={handleChange} style={{ width: "100%" }} className="admin-textarea" />

            <label>Image URL</label>
            <input name="image_url" value={formData.image_url} onChange={handleChange} style={{ width: "100%" }} className="admin-input" />
            {formData.image_url && (
              <div style={{ marginTop: "10px", textAlign: "center" }}>
                <img src={formData.image_url} alt="preview" style={{ width: "150px", borderRadius: "6px" }} className="admin-preview-image" />
              </div>
            )}

            <label>Popularity</label>
            <input name="popularity" value={formData.popularity} onChange={handleChange} style={{ width: "100%" }} className="admin-input" />

            <label>Link</label>
            <input name="link" value={formData.link} onChange={handleChange} style={{ width: "100%" }} className="admin-input" />

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px" }}>
              <button onClick={submitForm} className="admin-button">{isCreating ? "Create" : "Save"}</button>
              <button onClick={closeModal} className="admin-button">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPage;
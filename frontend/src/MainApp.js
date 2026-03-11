import React, { useState, useEffect } from "react";
import './App.css';

function MainApp() {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [browseAnime, setBrowseAnime] = useState([]);
  const [selectedFavorites, setSelectedFavorites] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBrowseAnime();
  }, []);

  const fetchBrowseAnime = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/browse");
      const data = await response.json();
      setBrowseAnime(data);
    } catch (err) {
      console.error("Error loading browse anime:", err);
    }
  };

  const searchAnime = async (query) => {
    setSearch(query);

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:5000/search?q=${query}`);
      const data = await response.json();
      setSearchResults(data);
    } catch (err) {
      console.error("Search error:", err);
    }
  };

  const addFavorite = (title) => {
    if (!selectedFavorites.includes(title)) {
      setSelectedFavorites([...selectedFavorites, title]);
    }
  };

  const removeFavorite = (title) => {
    setSelectedFavorites(selectedFavorites.filter((t) => t !== title));
  };

  const fetchRecommendations = async () => {
    if (selectedFavorites.length === 0) {
      alert("Start by selecting at least one favorite anime!");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:5000/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorites: selectedFavorites }),
      });
      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">

      {/* HERO / BANNER */}
      <div className="hero-banner">
        <h1>Anime Recommendation System</h1>
        <p className="hero-tagline">
          Discover your next must-watch anime based on your personal tastes! ✨
        </p>
      </div>

      {/* SEARCH SECTION */}
      <div className="search-section">
        <h2>Search Anime</h2>
        <p className="info-box">Pick a few favorites to get personalized recommendations.</p>
        <div style={{ position: "relative", display: "inline-block" }}>
          <input
            type="text"
            placeholder="Search by title..."
            value={search}
            onChange={(e) => searchAnime(e.target.value)}
            className="rounded-input"
            style={{ paddingRight: "30px" }}
          />
          {search && (
            <button
              onClick={() => searchAnime("")}
              style={{
                position: "absolute",
                right: "5px",
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: "16px",
                color: "#888",
                padding: 0,
              }}
            >
              ✖
            </button>
          )}
        </div>

        {searchResults.length > 0 && (
          <div className="card search-results-card" style={{ maxWidth: '500px' }}>
            {searchResults.map((anime) => {
              const isSelected = selectedFavorites.includes(anime.title);
              return (
                <div
                  key={anime.id}
                  className={`search-result ${isSelected ? "selected" : ""}`}
                  onClick={() => addFavorite(anime.title)}
                  style={{ position: "relative", cursor: "pointer" }}
                >
                  <img
                    src={anime.image_url}
                    alt={anime.title}
                    style={{
                      width: "40px",
                      height: "60px",
                      objectFit: "cover",
                      borderRadius: "8px",
                    }}
                  />
                  <span>{anime.title}</span>
                  {isSelected && (
                    <button
                      className="remove-button-top"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFavorite(anime.title);
                      }}
                    >
                      ✖
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BROWSE ANIME */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h2>Browse Popular Anime</h2>
        <div
          className="browse-scroll"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, 120px)",
            gap: "15px",
            maxHeight: "300px",
            overflowY: "scroll",
            justifyContent: "center",
            padding: "5px",
          }}
        >
          {browseAnime.map((anime) => {
            const isSelected = selectedFavorites.includes(anime.title);
            return (
              <div
                key={anime.id}
                className={`browse-item ${isSelected ? "selected" : ""}`}
                onClick={() => addFavorite(anime.title)}
                style={{ position: "relative", cursor: "pointer" }}
              >
                <div style={{ width: "120px", height: "180px", overflow: "hidden", borderRadius: "8px" }}>
                  <img
                    src={anime.image_url}
                    alt={anime.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                  {isSelected && (
                    <button
                      className="remove-button-top"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFavorite(anime.title);
                      }}
                    >
                      ✖
                    </button>
                  )}
                </div>
                <div style={{ fontSize: "12px", textAlign: "center", marginTop: "5px" }}>
                  {anime.title}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SELECTED FAVORITES */}
      {selectedFavorites.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <h3>Your Favorites</h3>
          {selectedFavorites.map((title) => (
            <div
              key={title}
              style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "5px" }}
            >
              <span>{title}</span>
              <button
                onClick={() => removeFavorite(title)}
                className="remove-button"
              >
                ✖
              </button>
            </div>
          ))}
        </div>
      )}

      {/* GET RECOMMENDATIONS BUTTON */}
      <button
        className="rounded-button"
        onClick={fetchRecommendations}
        disabled={loading}
      >
        {loading ? "Loading..." : "Get Recommendations ✨"}
      </button>

      {/* RECOMMENDATIONS */}
      {recommendations.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2>Recommended Anime</h2>
          {recommendations.map((anime) => (
            <div key={anime.id} className="card">
              <div
                style={{
                  width: "220px",
                  height: "380px",
                  overflow: "hidden",
                  flexShrink: 0,
                  borderRadius: "12px"
                }}
              >
                <img
                  src={anime.image_url}
                  alt={anime.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <div style={{ flex: 1, minWidth: "200px" }}>
                <h3>
                  <a
                    href={anime.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#1a0dab", textDecoration: "none", cursor: "pointer" }}
                    onMouseEnter={(e) => (e.target.style.textDecoration = "underline")}
                    onMouseLeave={(e) => (e.target.style.textDecoration = "none")}
                  >
                    {anime.title}
                  </a>
                </h3>
                <p>
                  <strong>Year:</strong> {anime.year}{" "}
                  {anime.genres && <>| <strong>Genres:</strong> {anime.genres}</>}
                </p>
                <p>{anime.description}</p>
                {anime.reason && (
                  <p>
                    <strong>Recommended because:</strong> {anime.reason}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MainApp;
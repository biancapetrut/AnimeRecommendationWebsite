import React, { useState, useEffect, useRef } from "react";

function MainApp() {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [browseAnime, setBrowseAnime] = useState([]);
  const [selectedFavorites, setSelectedFavorites] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const browseContainerRef = useRef(null);

  // -----------------------------
  // Fetch initial browse anime
  // -----------------------------
  useEffect(() => {
    fetchBrowseAnime();
  }, []);

  const fetchBrowseAnime = async () => {
    setLoadingMore(true);
    try {
      const response = await fetch(
        `http://127.0.0.1:5000/browse?offset=${offset}&limit=${limit}`
      );
      const data = await response.json();
      setBrowseAnime((prev) => [...prev, ...data]);
      setOffset((prev) => prev + limit);
    } catch (err) {
      console.error("Error loading browse anime:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // -----------------------------
  // Infinite scroll handler
  // -----------------------------
  const handleScroll = () => {
    const container = browseContainerRef.current;
    if (!container) return;

    if (container.scrollTop + container.clientHeight >= container.scrollHeight - 5) {
      if (!loadingMore) {
        fetchBrowseAnime();
      }
    }
  };

  // -----------------------------
  // Search functionality
  // -----------------------------
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

  // -----------------------------
  // Favorites handling
  // -----------------------------
  const addFavorite = (title) => {
    if (!selectedFavorites.includes(title)) {
      setSelectedFavorites([...selectedFavorites, title]);
    }
  };

  const removeFavorite = (title) => {
    setSelectedFavorites(selectedFavorites.filter((t) => t !== title));
  };

  // -----------------------------
  // Fetch recommendations
  // -----------------------------
  const fetchRecommendations = async () => {
    if (selectedFavorites.length === 0) {
      alert("Select at least one favorite anime.");
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

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <div style={{ padding: "2rem", fontFamily: "Arial", maxWidth: "900px", margin: "auto" }}>
      <h1>Anime Recommendation System</h1>

      {/* SEARCH BAR */}
      <h2>Search Anime</h2>
      <input
        type="text"
        placeholder="Search anime..."
        value={search}
        onChange={(e) => searchAnime(e.target.value)}
        style={{ width: "300px", padding: "8px", marginBottom: "1rem" }}
      />

      {/* SEARCH RESULTS */}
      {searchResults.length > 0 && (
        <div
          style={{
            border: "1px solid #ccc",
            padding: "1rem",
            marginBottom: "1rem",
            maxWidth: "500px",
          }}
        >
          {searchResults.map((anime) => (
            <div
              key={anime.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "8px",
                cursor: "pointer",
              }}
              onClick={() => addFavorite(anime.title)}
            >
              <img
                src={anime.image_url}
                alt={anime.title}
                style={{
                  width: "40px",
                  height: "60px",
                  objectFit: "cover",
                  borderRadius: "4px",
                }}
              />
              <span>{anime.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* BROWSE ANIME */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h2>Browse Anime</h2>
        <div
          ref={browseContainerRef}
          onScroll={handleScroll}
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
          {browseAnime.map((anime) => (
            <div
              key={anime.id}
              style={{
                cursor: "pointer",
                transition: "transform 0.2s",
              }}
              onClick={() => addFavorite(anime.title)}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              <div
                style={{
                  width: "120px",
                  height: "180px",
                  overflow: "hidden",
                  borderRadius: "6px",
                }}
              >
                <img
                  src={anime.image_url}
                  alt={anime.title}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>
              <div style={{ fontSize: "12px", textAlign: "center", marginTop: "5px" }}>
                {anime.title}
              </div>
            </div>
          ))}
        </div>
        {loadingMore && <p style={{ textAlign: "center" }}>Loading more anime...</p>}
      </div>

      {/* SELECTED FAVORITES */}
      {selectedFavorites.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <h3>Selected Favorites</h3>
          {selectedFavorites.map((title) => (
            <div
              key={title}
              style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "5px" }}
            >
              <span>{title}</span>
              <button
                onClick={() => removeFavorite(title)}
                style={{
                  background: "#ff4d4d",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  padding: "3px 8px",
                  borderRadius: "4px",
                }}
              >
                ✖
              </button>
            </div>
          ))}
        </div>
      )}

      {/* GET RECOMMENDATIONS BUTTON */}
      <button
        style={{ marginTop: "1rem", padding: "10px 20px", fontSize: "16px" }}
        onClick={fetchRecommendations}
        disabled={loading}
      >
        {loading ? "Loading..." : "Get Recommendations"}
      </button>

      {/* RECOMMENDATIONS */}
      {recommendations.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2>Recommended Anime</h2>
          {recommendations.map((anime) => (
            <div
              key={anime.id}
              style={{
                border: "1px solid #ddd",
                padding: "1rem",
                marginBottom: "1rem",
                borderRadius: "8px",
                display: "flex",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  width: "220px",
                  height: "380px",
                  overflow: "hidden",
                  borderRadius: "6px",
                  flexShrink: 0,
                }}
              >
                <img
                  src={anime.image_url}
                  alt={anime.title}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
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
                  {anime.genres && (
                    <>
                      | <strong>Genres:</strong> {anime.genres}
                    </>
                  )}
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
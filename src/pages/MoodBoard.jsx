import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./MoodBoard.css";

const MoodBoard = () => {
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    trip_type: "",
    region: "",
    activity: "",
  });
  const navigate = useNavigate();

  const tripTypes = [
    "Adventure",
    "Relaxation",
    "Culture",
    "Shopping",
    "Nature",
    "Luxury",
  ];
  const regions = [
    "Europe",
    "Asia",
    "Americas",
    "Africa",
    "Oceania",
    "Middle East",
  ];
  const activities = [
    "Beaches",
    "Hiking",
    "Museums",
    "Food",
    "Nightlife",
    "Shopping",
    "Wildlife",
    "Historical",
  ];

  const fetchDestinations = React.useCallback(async () => {
    setLoading(true);
    try {
      let url = "http://localhost:8000/api/destinations/";
      const params = new URLSearchParams();
      if (filters.trip_type) params.append("trip_type", filters.trip_type);
      if (filters.region) params.append("region", filters.region);
      if (filters.activity) params.append("activities", filters.activity);

      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setDestinations(data);
      } else {
        console.error("Failed to fetch destinations");
      }
    } catch (error) {
      console.error("Error fetching destinations:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchDestinations();
  }, [fetchDestinations]);

  const handleFilterClick = (category, value) => {
    setFilters((prev) => ({
      ...prev,
      [category]: prev[category] === value ? "" : value,
    }));
  };

  const clearFilters = () => {
    setFilters({ trip_type: "", region: "", activity: "" });
  };

  const handlePlanTrip = (destName) => {
    navigate("/planner", { state: { destination: destName } });
  };

  // Destination-specific landmark images
  const destinationImages = {
    Paris:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=300&fit=crop",
    Tokyo:
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=300&fit=crop",
    London:
      "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=300&fit=crop",
    "New York":
      "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&h=300&fit=crop",
    Rome: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&h=300&fit=crop",
    Barcelona:
      "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400&h=300&fit=crop",
    Dubai:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=300&fit=crop",
    Sydney:
      "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=400&h=300&fit=crop",
    Singapore:
      "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=400&h=300&fit=crop",
    Amsterdam:
      "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=400&h=300&fit=crop",
    Istanbul:
      "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=400&h=300&fit=crop",
    Bangkok:
      "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=400&h=300&fit=crop",
    "Hong Kong":
      "https://images.unsplash.com/photo-1536599018102-9f803c140fc1?w=400&h=300&fit=crop",
    "Los Angeles":
      "https://images.unsplash.com/photo-1534190239940-9ba8944ea261?w=400&h=300&fit=crop",
    Miami:
      "https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?w=400&h=300&fit=crop",
    Venice:
      "https://images.unsplash.com/photo-1514890547357-a9ee288728e0?w=400&h=300&fit=crop",
    Prague:
      "https://images.unsplash.com/photo-1541849546-216549ae216d?w=400&h=300&fit=crop",
    Vienna:
      "https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=400&h=300&fit=crop",
    Athens:
      "https://images.unsplash.com/photo-1555993539-1732b0258235?w=400&h=300&fit=crop",
    Cairo:
      "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=400&h=300&fit=crop",
    Bali: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&h=300&fit=crop",
    Maldives:
      "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=400&h=300&fit=crop",
    Santorini:
      "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=400&h=300&fit=crop",
    Kyoto:
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&h=300&fit=crop",
    Seoul:
      "https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=400&h=300&fit=crop",
    Mumbai:
      "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=400&h=300&fit=crop",
    Delhi:
      "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&h=300&fit=crop",
    Jaipur:
      "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=400&h=300&fit=crop",
    Agra: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=400&h=300&fit=crop",
    Goa: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=400&h=300&fit=crop",
  };

  // Generate image URL for destination
  const getImageUrl = (destName) => {
    // Check if we have a specific image for this destination
    if (destinationImages[destName]) {
      return destinationImages[destName];
    }

    // Fallback to Picsum with destination seed
    return `https://picsum.photos/seed/${encodeURIComponent(destName)}/400/300`;
  };

  return (
    <div className="moodboard-container">
      <div className="moodboard-header">
        <h1>Explore Destinations</h1>
        <p>Select your preferences to discover your perfect trip</p>
      </div>

      <div className="filters-section">
        {/* Trip Type Filter */}
        <div className="filter-row">
          <div className="filter-label">Trip Type ▼</div>
          <div className="filter-pills">
            {tripTypes.map((type) => (
              <button
                key={type}
                className={`filter-pill ${filters.trip_type === type ? "active" : ""}`}
                onClick={() => handleFilterClick("trip_type", type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Region Filter */}
        <div className="filter-row">
          <div className="filter-label">Region ▼</div>
          <div className="filter-pills">
            {regions.map((region) => (
              <button
                key={region}
                className={`filter-pill ${filters.region === region ? "active" : ""}`}
                onClick={() => handleFilterClick("region", region)}
              >
                {region}
              </button>
            ))}
          </div>
        </div>

        {/* Activities Filter */}
        <div className="filter-row">
          <div className="filter-label">Activities ▼</div>
          <div className="filter-pills">
            {activities.map((activity) => (
              <button
                key={activity}
                className={`filter-pill ${filters.activity === activity ? "active" : ""}`}
                onClick={() => handleFilterClick("activity", activity)}
              >
                {activity}
              </button>
            ))}
          </div>
        </div>

        {/* Clear Filters Button */}
        {(filters.trip_type || filters.region || filters.activity) && (
          <div className="clear-filters-row">
            <button className="clear-filters-btn" onClick={clearFilters}>
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading">Loading destinations...</div>
      ) : (
        <div className="destinations-grid">
          {destinations.map((dest) => (
            <div key={dest.id} className="destination-card-mood">
              <div className="card-image-placeholder">
                <img
                  src={getImageUrl(dest.name)}
                  alt={dest.name}
                  loading="lazy"
                  onLoad={(e) => (e.target.style.opacity = "1")}
                  style={{ opacity: 0, transition: "opacity 0.3s" }}
                />
              </div>
              <div className="card-content">
                <h3>{dest.name}</h3>
                <p className="region">{dest.country}</p>
                <p className="description">{dest.description}</p>
                <div className="tags">
                  <span className="tag">{dest.trip_type}</span>
                </div>
                <button
                  onClick={() => handlePlanTrip(dest.name)}
                  className="plan-btn"
                >
                  Plan This Trip
                </button>
              </div>
            </div>
          ))}
          {destinations.length === 0 && (
            <div className="no-results">
              <p>No destinations found matching your filters.</p>
              <button onClick={clearFilters} className="clear-filters-btn">
                Clear Filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MoodBoard;

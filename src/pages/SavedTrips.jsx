import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, formatBudget, getToken, parseItinerary } from "../services/api";
import "./SavedTrips.css";

const SavedTrips = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const fetchTrips = useCallback(async () => {
    if (!getToken()) {
      navigate("/login");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/trips/my_trips/");
      setTrips(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.status === 401) {
        navigate("/login");
        return;
      }
      setError(err.message || "Could not load your trips.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const handleViewTrip = (trip) => {
    navigate("/results", {
      state: {
        tripId: trip.id,
        destination: trip.destination,
        startDate: trip.start_date,
        endDate: trip.end_date,
        budget: Number(trip.budget),
        preferences: trip.preferences,
        itinerary: parseItinerary(trip.itinerary_data || trip.itinerary),
      },
    });
  };

  return (
    <div className="saved-trips-container">
      <h1>My Saved Trips</h1>

      {loading ? (
        <div className="loading">Loading your adventures...</div>
      ) : error ? (
        <div className="no-trips">
          <p>{error}</p>
          <button onClick={fetchTrips} className="start-btn">
            Try again
          </button>
        </div>
      ) : trips.length === 0 ? (
        <div className="no-trips">
          <p>You haven't saved any trips yet.</p>
          <button onClick={() => navigate("/planner")} className="start-btn">
            Start Planning
          </button>
        </div>
      ) : (
        <div className="trips-grid">
          {trips.map((trip) => (
            <div key={trip.id} className="trip-card">
              <div className="trip-header-card">
                <h3>{trip.destination}</h3>
                <span className="status-badge">
                  {trip.is_public ? "Shared" : "Planned"}
                </span>
              </div>
              <div className="trip-details">
                <p>
                  📅 {trip.start_date} → {trip.end_date}
                </p>
                <p>💰 Budget: {formatBudget(trip.budget)}</p>
                <p>🗓️ {trip.days_count} day{trip.days_count === 1 ? "" : "s"}</p>
              </div>
              <button onClick={() => handleViewTrip(trip)} className="view-btn">
                View Itinerary
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedTrips;

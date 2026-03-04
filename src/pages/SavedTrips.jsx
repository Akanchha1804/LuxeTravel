import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./SavedTrips.css";

const SavedTrips = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchTrips = React.useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:8000/api/trips/my_trips/",
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setTrips(data);
      } else {
        console.error("Failed to fetch trips");
      }
    } catch (error) {
      console.error("Error:", error);
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
        destination: trip.destination,
        startDate: trip.start_date,
        endDate: trip.end_date,
        budget: trip.budget,
      },
    });
  };

  return (
    <div className="saved-trips-container">
      <h1>My Saved Trips</h1>

      {loading ? (
        <div className="loading">Loading your adventures...</div>
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
                <span className="status-badge">Planned</span>
              </div>
              <div className="trip-details">
                <p>
                  📅 {trip.start_date} - {trip.end_date}
                </p>
                <p>💰 Budget: {trip.budget}</p>
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

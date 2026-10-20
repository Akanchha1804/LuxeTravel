import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch, formatBudget, getToken, parseItinerary } from "../services/api";
import "./SharedTrip.css";

const SharedTrip = () => {
  const { shareCode } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [forking, setForking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchSharedTrip = async () => {
      try {
        const data = await apiFetch(`/shared/${shareCode}/`, { auth: false });
        if (!cancelled) setTrip(data);
      } catch (err) {
        if (!cancelled) setError(err.message || "Trip not found or is private.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchSharedTrip();
    return () => {
      cancelled = true;
    };
  }, [shareCode]);

  const handleForkTrip = async () => {
    if (!getToken()) {
      alert("🔒 Please log in to fork this trip!");
      navigate("/login");
      return;
    }

    setForking(true);
    try {
      const data = await apiFetch(`/shared/${shareCode}/fork/`, {
        method: "POST",
      });
      const forked = data.trip;
      navigate("/results", {
        state: {
          tripId: forked.id,
          destination: forked.destination,
          startDate: forked.start_date,
          endDate: forked.end_date,
          budget: Number(forked.budget),
          preferences: forked.preferences,
          itinerary: parseItinerary(forked.itinerary_data || forked.itinerary),
        },
      });
    } catch (err) {
      alert(err.message || "Could not fork this trip.");
    } finally {
      setForking(false);
    }
  };

  if (loading) return <div className="loading-screen">Loading Trip...</div>;
  if (error) return <div className="error-screen">{error}</div>;
  if (!trip) return null;

  const parsed = parseItinerary(trip.itinerary_data || trip.itinerary);
  const days = parsed?.days || [];

  return (
    <div className="shared-trip-container">
      <div className="shared-header">
        <h1>✈️ Trip to {trip.destination}</h1>
        <div className="trip-meta">
          <span>
            📅 {trip.start_date} → {trip.end_date}
          </span>
          <span>💰 Budget: {formatBudget(trip.budget)}</span>
          <span>🍴 Forked {trip.fork_count} times</span>
        </div>
        <button className="btn-fork" onClick={handleForkTrip} disabled={forking}>
          {forking ? "Forking..." : "🍴 Fork This Trip"}
        </button>
      </div>

      <div className="itinerary-preview">
        <h2>Itinerary Preview</h2>
        {days.length > 0 ? (
          days.map((day, index) => (
            <div key={index} className="preview-day-card">
              <h3>
                Day {day.day || index + 1}: {day.title || "Explore"}
              </h3>
              <ul>
                {(day.activities || []).map((activity, i) => (
                  <li key={i}>{activity}</li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <p>No itinerary details available.</p>
        )}
      </div>
    </div>
  );
};

export default SharedTrip;

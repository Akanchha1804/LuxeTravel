import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./SharedTrip.css";

const SharedTrip = () => {
  const { shareCode } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSharedTrip = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/api/shared/${shareCode}/`,
        );
        if (response.ok) {
          const data = await response.json();
          setTrip(data);
        } else {
          setError("Trip not found or is private.");
        }
      } catch (err) {
        console.error("Error fetching shared trip:", err);
        setError("Failed to load trip.");
      } finally {
        setLoading(false);
      }
    };

    fetchSharedTrip();
  }, [shareCode]);

  const handleForkTrip = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("🔒 Please log in to fork this trip!");
      navigate("/login");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8000/api/shared/${shareCode}/fork/`,
        {
          method: "POST",
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        alert(
          `✅ Trip forked successfully! You can now customize your version.`,
        );
        // Redirect to the planner or results with the new trip data
        // For now, let's go to the results page of the new trip (if we had a way to load it directly)
        // Or just go to the planner with pre-filled data.
        // Actually, the API returns the new trip. We can navigate to Results with that state.

        // Parse itinerary string back to object if needed, or just pass as is if Results expects object
        // The Trip model stores itinerary as TextField (JSON string usually).
        // Results.jsx expects 'itinerary' as an array of objects.

        let parsedItinerary = [];
        try {
          parsedItinerary =
            typeof data.trip.itinerary === "string"
              ? JSON.parse(data.trip.itinerary)
              : data.trip.itinerary;
        } catch (e) {
          console.error("Error parsing itinerary", e);
        }

        navigate("/results", {
          state: {
            destination: data.trip.destination,
            startDate: data.trip.start_date,
            endDate: data.trip.end_date,
            budget: data.trip.budget,
            // We might need to pass the itinerary if Results uses it from state
            // But Results.jsx currently uses mock data or generates it.
            // We should modify Results.jsx to accept an existing itinerary.
          },
        });
      } else {
        alert("Failed to fork trip.");
      }
    } catch (err) {
      console.error("Fork error:", err);
      alert("Error forking trip.");
    }
  };

  if (loading) return <div className="loading-screen">Loading Trip...</div>;
  if (error) return <div className="error-screen">{error}</div>;
  if (!trip) return null;

  // Parse itinerary if it's a string
  const itinerary =
    typeof trip.itinerary === "string"
      ? JSON.parse(trip.itinerary)
      : trip.itinerary;

  return (
    <div className="shared-trip-container">
      <div className="shared-header">
        <h1>✈️ Trip to {trip.destination}</h1>
        <div className="trip-meta">
          <span>
            📅 {trip.start_date} - {trip.end_date}
          </span>
          <span>💰 Budget: ₹{trip.budget}</span>
          <span>👀 Forked {trip.fork_count} times</span>
        </div>
        <button className="btn-fork" onClick={handleForkTrip}>
          🍴 Fork This Trip
        </button>
      </div>

      <div className="itinerary-preview">
        <h2>Itinerary Preview</h2>
        {itinerary && Array.isArray(itinerary) ? (
          itinerary.map((day, index) => (
            <div key={index} className="preview-day-card">
              <h3>
                Day {day.day}: {day.title}
              </h3>
              <ul>
                {day.activities.map((activity, i) => (
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

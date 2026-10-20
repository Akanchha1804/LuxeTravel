import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Planner.css";

const Planner = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [destination, setDestination] = useState(
    location.state?.destination || "",
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [travelers, setTravelers] = useState(1);
  const [budget, setBudget] = useState("");
  const [customBudget, setCustomBudget] = useState("");
  const [preferences, setPreferences] = useState([]);

  const popularDestinations = [
    "Goa",
    "Paris",
    "Kerala",
    "Dubai",
    "Jaipur",
    "Tokyo",
    "Bali",
    "London",
  ];

  const preferenceOptions = [
    { id: "adventure", label: "🧗 Adventure", desc: "Hiking, Sports, Thrills" },
    { id: "relaxation", label: "🧘 Relaxation", desc: "Spa, Beach, Quiet" },
    { id: "culture", label: "🏛️ Culture", desc: "Museums, History, Art" },
    { id: "food", label: "🍜 Food", desc: "Street Food, Fine Dining" },
    { id: "shopping", label: "🛍️ Shopping", desc: "Malls, Markets" },
    { id: "nightlife", label: "🎉 Nightlife", desc: "Clubs, Bars, Events" },
  ];

  const budgetOptions = [
    { label: "Budget", range: "₹20k - ₹50k", value: "budget" },
    { label: "Moderate", range: "₹50k - ₹1.5L", value: "moderate" },
    { label: "Luxury", range: "₹1.5L+", value: "luxury" },
    { label: "Custom", range: "Enter amount", value: "custom" },
  ];

  const togglePreference = (id) => {
    setPreferences((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const handleNext = () => {
    if (step === 1 && !destination.trim())
      return alert("Please select a destination");
    if (step === 2) {
      if (!startDate || !endDate || !budget)
        return alert("Please fill in all details");
      if (new Date(endDate) < new Date(startDate))
        return alert("The end date must be on or after the start date");
      if (budget === "custom" && (!customBudget || Number(customBudget) <= 0))
        return alert("Please enter a valid budget amount");
    }
    setStep(step + 1);
  };

  const budgetValues = {
    budget: 35000,
    moderate: 100000,
    luxury: 250000,
  };

  const handleSubmit = () => {
    const finalBudget =
      budget === "custom"
        ? Number(customBudget)
        : budgetValues[budget] || 50000;
    navigate("/results", {
      state: {
        destination: destination.trim(),
        startDate,
        endDate,
        budget: finalBudget,
        travelers,
        preferences,
      },
    });
  };

  return (
    <div className="planner-container">
      <div className="planner-header">
        <button
          className="back-btn"
          onClick={() => (step > 1 ? setStep(step - 1) : navigate(-1))}
        >
          ← Back
        </button>
        <div className="step-indicator">
          <span className={step >= 1 ? "active" : ""}>1. Destination</span>
          <span className="line"></span>
          <span className={step >= 2 ? "active" : ""}>2. Details</span>
          <span className="line"></span>
          <span className={step >= 3 ? "active" : ""}>3. Preferences</span>
        </div>
      </div>

      <div className="planner-content">
        {step === 1 && (
          <div className="step-section fade-in">
            <h1>Where is your next adventure?</h1>
            <input
              type="text"
              className="search-input"
              placeholder="Search destinations (e.g., Paris, Tokyo)..."
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
            <div className="popular-destinations">
              <h3>Popular Picks</h3>
              <div className="destinations-grid">
                {popularDestinations.map((dest, idx) => (
                  <button
                    key={idx}
                    className={`destination-card ${destination === dest ? "selected" : ""}`}
                    onClick={() => setDestination(dest)}
                  >
                    <span className="dest-name">{dest}</span>
                  </button>
                ))}
              </div>
            </div>
            <button className="btn-primary next-btn" onClick={handleNext}>
              Next: Trip Details →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="step-section fade-in">
            <h1>Trip Details</h1>
            <div className="form-group">
              <label>When are you going?</label>
              <div className="date-inputs">
                <input
                  type="date"
                  value={startDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <span className="to">to</span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || new Date().toISOString().split("T")[0]}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Who is traveling?</label>
              <div className="travelers-input">
                <button
                  onClick={() => setTravelers(Math.max(1, travelers - 1))}
                >
                  -
                </button>
                <span>
                  {travelers} Traveler{travelers > 1 ? "s" : ""}
                </span>
                <button onClick={() => setTravelers(travelers + 1)}>+</button>
              </div>
            </div>

            <div className="form-group">
              <label>What is your budget?</label>
              <div className="budget-grid">
                {budgetOptions.map((opt) => (
                  <button
                    key={opt.value}
                    className={`budget-card ${budget === opt.value ? "selected" : ""}`}
                    onClick={() => setBudget(opt.value)}
                  >
                    <span className="budget-label">{opt.label}</span>
                    <span className="budget-range">{opt.range}</span>
                  </button>
                ))}
              </div>
              {budget === "custom" && (
                <input
                  type="number"
                  className="custom-budget"
                  placeholder="Enter Amount (₹)"
                  value={customBudget}
                  onChange={(e) => setCustomBudget(e.target.value)}
                />
              )}
            </div>
            <button className="btn-primary next-btn" onClick={handleNext}>
              Next: Preferences →
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="step-section fade-in">
            <h1>Travel Preferences</h1>
            <p>Customize your experience</p>
            <div className="preferences-grid">
              {preferenceOptions.map((pref) => (
                <button
                  key={pref.id}
                  className={`pref-card ${preferences.includes(pref.id) ? "selected" : ""}`}
                  onClick={() => togglePreference(pref.id)}
                >
                  <span className="pref-label">{pref.label}</span>
                  <span className="pref-desc">{pref.desc}</span>
                </button>
              ))}
            </div>
            <button className="btn-primary generate-btn" onClick={handleSubmit}>
              ✨ Generate Dream Itinerary
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Planner;

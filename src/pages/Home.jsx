import React from "react";
import { useNavigate } from "react-router-dom";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./Home.css";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <div className="home-background">
        <div className="overlay"></div>
        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
        <div className="floating-shape shape-3"></div>
      </div>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>
            Discover Your <span className="highlight">Next Adventure</span>
          </h1>
          <p>
            Experience the world with AI-curated itineraries tailored just for
            you. Luxurious, seamless, and unforgettable journeys await.
          </p>
          <button className="cta-button" onClick={() => navigate("/planner")}>
            Start Planning Your Trip →
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2>Everything You Need for the Perfect Trip</h2>
        <div className="features-grid">
          <FeatureCard
            icon="fas fa-magic"
            title="AI-Powered Itineraries"
            desc="Get personalized day-by-day plans crafted by advanced AI"
            onClick={() => navigate("/planner")}
          />
          <FeatureCard
            icon="fas fa-palette"
            title="Mood Board Creator"
            desc="Visualize your dream destination with stunning imagery"
            onClick={() => navigate("/moodboard")}
          />
          <FeatureCard
            icon="fas fa-comments"
            title="Trip Chatrooms"
            desc="Connect with fellow travelers and plan together"
            onClick={() => navigate("/chatroom")}
          />
          <FeatureCard
            icon="fas fa-map-marked-alt"
            title="Smart Navigation"
            desc="Interactive maps with routes and local insights"
            onClick={() => navigate("/planner")}
          />
          <FeatureCard
            icon="fas fa-suitcase"
            title="Packing Assistant"
            desc="Destination-aware packing lists for every trip"
            onClick={() => navigate("/planner")}
          />
          <FeatureCard
            icon="fas fa-hotel"
            title="Seamless Bookings"
            desc="Book flights, hotels, and transport in one place"
            onClick={() => navigate("/booking")}
          />
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stat-item">
          <h3>3 steps</h3>
          <p>From idea to itinerary</p>
        </div>
        <div className="stat-item">
          <h3>10+</h3>
          <p>Curated destinations</p>
        </div>
        <div className="stat-item">
          <h3>24/7</h3>
          <p>Trip chatrooms</p>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bottom-cta">
        <h2>Ready to Explore the World?</h2>
        <p>Let AI craft your perfect itinerary in seconds</p>
        <button
          className="cta-button-outline"
          onClick={() => navigate("/planner")}
        >
          Get Started Now
        </button>
      </section>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc, onClick }) => (
  <div className="feature-card" onClick={onClick}>
    <div className="feature-icon">
      <i className={icon}></i>
    </div>
    <h3>{title}</h3>
    <p>{desc}</p>
  </div>
);

export default Home;

import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import amadeusAPI, {
  searchFlights,
  searchHotelsByCity,
  getCityCode,
} from "../services/amadeusAPI";
import "./booking.css";

const Booking = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { destination, startDate, endDate, provider } = location.state || {};

  const [activeTab, setActiveTab] = useState(provider || "flights");
  const [loading, setLoading] = useState(false);
  const [flights, setFlights] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [searchParams, setSearchParams] = useState({
    origin: "Delhi", // Default origin
    destination: destination || "Mumbai",
    departureDate:
      startDate ||
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
    returnDate:
      endDate ||
      new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
    adults: 1,
    children: 0,
  });

  // Mock flight data (Fallback)
  const mockFlights = [
    {
      id: 1,
      airline: "Air India",
      logo: "https://pics.avs.io/200/200/AI.png",
      flightNumber: "AI 101",
      departure: "09:00 AM",
      arrival: "11:30 AM",
      duration: "2h 30m",
      stops: "Non-stop",
      price: 5499,
      class: "Economy",
    },
    {
      id: 2,
      airline: "IndiGo",
      logo: "https://pics.avs.io/200/200/6E.png",
      flightNumber: "6E 234",
      departure: "11:45 AM",
      arrival: "02:20 PM",
      duration: "2h 35m",
      stops: "Non-stop",
      price: 4899,
      class: "Economy",
    },
    {
      id: 3,
      airline: "Vistara",
      logo: "https://pics.avs.io/200/200/UK.png",
      flightNumber: "UK 567",
      departure: "03:15 PM",
      arrival: "05:50 PM",
      duration: "2h 35m",
      stops: "Non-stop",
      price: 6299,
      class: "Premium Economy",
    },
    {
      id: 4,
      airline: "SpiceJet",
      logo: "https://pics.avs.io/200/200/SG.png",
      flightNumber: "SG 789",
      departure: "06:30 PM",
      arrival: "09:10 PM",
      duration: "2h 40m",
      stops: "Non-stop",
      price: 4599,
      class: "Economy",
    },
  ];

  // Mock hotel data (Fallback)
  const mockHotels = [
    {
      id: 1,
      name: "The Taj Mahal Palace",
      image:
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop",
      rating: 5,
      reviews: 1234,
      location: "Gateway of India",
      amenities: ["WiFi", "Pool", "Spa", "Restaurant"],
      price: 15000,
      originalPrice: 18000,
    },
    {
      id: 2,
      name: "ITC Grand Central",
      image:
        "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400&h=300&fit=crop",
      rating: 5,
      reviews: 892,
      location: "Parel",
      amenities: ["WiFi", "Pool", "Gym", "Restaurant"],
      price: 12000,
      originalPrice: 14500,
    },
    {
      id: 3,
      name: "Trident Hotel",
      image:
        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&h=300&fit=crop",
      rating: 4,
      reviews: 567,
      location: "Bandra Kurla Complex",
      amenities: ["WiFi", "Pool", "Restaurant", "Bar"],
      price: 8500,
      originalPrice: 10000,
    },
    {
      id: 4,
      name: "Novotel Mumbai",
      image:
        "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&h=300&fit=crop",
      rating: 4,
      reviews: 445,
      location: "Juhu Beach",
      amenities: ["WiFi", "Pool", "Gym", "Beach Access"],
      price: 7200,
      originalPrice: 9000,
    },
  ];

  useEffect(() => {
    const fetchRealData = async () => {
      setLoading(true);
      try {
        if (activeTab === "flights") {
          // Try to fetch real flight data
          try {
            const originCode = getCityCode(searchParams.origin);
            const destCode = getCityCode(searchParams.destination);

            const flightData = await searchFlights(
              originCode,
              destCode,
              searchParams.departureDate,
              searchParams.returnDate,
              searchParams.adults,
            );

            if (flightData && flightData.length > 0) {
              setFlights(flightData);
            } else {
              setFlights(mockFlights);
            }
          } catch (apiError) {
            setFlights(mockFlights);
          }
        } else {
          // Try to fetch real hotel data
          try {
            const cityCode = getCityCode(searchParams.destination);

            const hotelData = await searchHotelsByCity(
              cityCode,
              searchParams.departureDate,
              searchParams.returnDate,
              searchParams.adults,
            );

            if (hotelData && hotelData.length > 0) {
              setHotels(hotelData);
            } else {
              setHotels(mockHotels);
            }
          } catch (apiError) {
            setHotels(mockHotels);
          }
        }
      } catch (error) {
        console.error("Data fetch error:", error);
        // Fallback to mock data
        if (activeTab === "flights") {
          setFlights(mockFlights);
        } else {
          setHotels(mockHotels);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRealData();
  }, [activeTab, searchParams]);

  const handleFlightBook = (flight) => {
    // Redirect to airline booking page
    const bookingUrl = `https://www.makemytrip.com/flights/`;
    window.open(bookingUrl, "_blank");
  };

  const handleHotelBook = (hotel) => {
    // Redirect to hotel booking page
    const bookingUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(searchParams.destination)}&checkin=${searchParams.departureDate}&checkout=${searchParams.returnDate}`;
    window.open(bookingUrl, "_blank");
  };

  return (
    <div className="booking-container">
      <div className="booking-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h1>Book Your Trip to {searchParams.destination}</h1>
        <p className="booking-dates">
          {searchParams.departureDate} - {searchParams.returnDate}
        </p>
      </div>

      {/* Tabs */}
      <div className="booking-tabs">
        <button
          className={`tab-btn ${activeTab === "flights" ? "active" : ""}`}
          onClick={() => setActiveTab("flights")}
        >
          ✈️ Flights
        </button>
        <button
          className={`tab-btn ${activeTab === "hotels" ? "active" : ""}`}
          onClick={() => setActiveTab("hotels")}
        >
          🏨 Hotels
        </button>
      </div>

      {/* Content */}
      <div className="booking-content">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Searching for best {activeTab}...</p>
          </div>
        ) : (
          <>
            {activeTab === "flights" && (
              <div className="flights-section">
                <div className="results-header">
                  <h2>Available Flights</h2>
                  <p className="results-count">
                    {flights.length} flights found
                  </p>
                </div>
                <div className="flights-list">
                  {flights.map((flight) => (
                    <div key={flight.id} className="flight-card">
                      <div className="flight-info">
                        <div className="airline-info">
                          <img
                            src={flight.logo}
                            alt={flight.airline}
                            className="airline-logo"
                          />
                          <div>
                            <h3>{flight.airline}</h3>
                            <p className="flight-number">
                              {flight.flightNumber}
                            </p>
                          </div>
                        </div>
                        <div className="flight-times">
                          <div className="time-block">
                            <span className="time">{flight.departure}</span>
                            <span className="label">Departure</span>
                          </div>
                          <div className="flight-duration">
                            <span className="duration">{flight.duration}</span>
                            <div className="flight-line"></div>
                            <span className="stops">{flight.stops}</span>
                          </div>
                          <div className="time-block">
                            <span className="time">{flight.arrival}</span>
                            <span className="label">Arrival</span>
                          </div>
                        </div>
                        <div className="flight-class">
                          <span className="class-badge">{flight.class}</span>
                        </div>
                      </div>
                      <div className="flight-booking">
                        <div className="price-info">
                          <span className="price">
                            ₹{flight.price.toLocaleString()}
                          </span>
                          <span className="per-person">per person</span>
                        </div>
                        <button
                          className="book-btn"
                          onClick={() => handleFlightBook(flight)}
                        >
                          Book Now →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "hotels" && (
              <div className="hotels-section">
                <div className="results-header">
                  <h2>Available Hotels</h2>
                  <p className="results-count">{hotels.length} hotels found</p>
                </div>
                <div className="hotels-grid">
                  {hotels.map((hotel) => (
                    <div key={hotel.id} className="hotel-card">
                      <div className="hotel-image">
                        <img src={hotel.image} alt={hotel.name} />
                        <div className="hotel-rating">
                          <span className="stars">
                            {"⭐".repeat(hotel.rating)}
                          </span>
                        </div>
                      </div>
                      <div className="hotel-info">
                        <h3>{hotel.name}</h3>
                        <p className="hotel-location">📍 {hotel.location}</p>
                        <div className="hotel-reviews">
                          <span className="rating-score">{hotel.rating}.0</span>
                          <span className="review-count">
                            ({hotel.reviews} reviews)
                          </span>
                        </div>
                        <div className="hotel-amenities">
                          {hotel.amenities.map((amenity, idx) => (
                            <span key={idx} className="amenity-tag">
                              {amenity}
                            </span>
                          ))}
                        </div>
                        <div className="hotel-pricing">
                          <div className="price-block">
                            {hotel.originalPrice > hotel.price && (
                              <span className="original-price">
                                ₹{hotel.originalPrice.toLocaleString()}
                              </span>
                            )}
                            <span className="current-price">
                              ₹{hotel.price.toLocaleString()}
                            </span>
                            <span className="per-night">per night</span>
                          </div>
                          <button
                            className="book-btn"
                            onClick={() => handleHotelBook(hotel)}
                          >
                            Book Now →
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="booking-note">
        <p>
          💡 <strong>Note:</strong> Clicking "Book Now" will redirect you to the
          booking partner's website to complete your reservation.
        </p>
      </div>
    </div>
  );
};

export default Booking;

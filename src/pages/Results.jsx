import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MapWidget from "../components/MapWidget";
import "./Results.css";

const Results = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { destination, startDate, endDate, budget } = location.state || {};

  // Calculate daysCount
  let daysCount = 3; // Default to 3 days if dates are not available or invalid
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end day
  }

  // Phase 4: Social & Collaboration State
  const [shareUrl, setShareUrl] = useState(null);
  const [tripId, setTripId] = useState(null);

  // Destination-specific data
  const getDestinationData = (dest, daysCount) => {
    const destinationDB = {
      Paris: {
        itinerary: [
          {
            day: 1,
            title: "Iconic Landmarks & Eiffel Tower",
            imageQuery: "eiffel+tower+paris",
            activities: [
              "Morning: Visit the Eiffel Tower (Book skip-the-line tickets)",
              "Lunch at Café de l'Homme with Eiffel views",
              "Afternoon: Cruise on Seine River",
              "Evening: Explore Champs-Élysées and Arc de Triomphe",
            ],
          },
          {
            day: 2,
            title: "Art & History at Louvre",
            imageQuery: "louvre+museum+paris",
            activities: [
              "Morning: Louvre Museum (Mona Lisa & Venus de Milo)",
              "Lunch: Tuileries Garden picnic or cafe",
              "Afternoon: Musée d'Orsay (Impressionist art)",
              "Evening: Montmartre & Sacré-Cœur Basilica sunset",
            ],
          },
          {
            day: 3,
            title: "Versailles & Royal History",
            imageQuery: "versailles+palace",
            activities: [
              "Day trip to Palace of Versailles (Hall of Mirrors)",
              "Explore the Royal Gardens",
              "Lunch in Versailles town",
              "Evening: Return to Paris, dinner in Le Marais",
            ],
          },
        ],
        packing: [
          "Comfortable walking shoes (cobblestone streets)",
          "Light jacket (Paris weather is unpredictable)",
          "EU power adapter (Type C/E)",
          "Reusable water bottle",
          "Crossbody bag (pickpocket prevention)",
          "Scarf (for church visits)",
        ],
        transit: [
          { name: "Paris Metro", link: "https://www.ratp.fr/en", icon: "🚇" },
          {
            name: "RER Trains",
            link: "https://www.transilien.com/en",
            icon: "🚆",
          },
          {
            name: "Vélib' Bike Share",
            link: "https://www.velib-metropole.fr/en",
            icon: "🚲",
          },
          { name: "Uber/Bolt", link: "https://www.uber.com/", icon: "🚗" },
        ],
        airport: "CDG",
      },
      Tokyo: {
        itinerary: [
          {
            day: 1,
            title: "Modern Tokyo & Shibuya",
            imageQuery: "shibuya+crossing+tokyo",
            activities: [
              "Morning: Meiji Shrine in Harajuku",
              "Lunch: Ichiran Ramen in Shibuya",
              "Afternoon: Shibuya Crossing & Shopping",
              "Evening: Tokyo Skytree observation deck",
            ],
          },
          {
            day: 2,
            title: "Traditional Tokyo & Asakusa",
            imageQuery: "senso+ji+temple+tokyo",
            activities: [
              "Morning: Senso-ji Temple in Asakusa",
              "Nakamise Shopping Street for souvenirs",
              "Lunch: Tsukiji Outer Market (sushi)",
              "Evening: TeamLab Borderless digital art museum",
            ],
          },
          {
            day: 3,
            title: "Day Trip to Mt. Fuji",
            imageQuery: "mount+fuji+japan",
            activities: [
              "Early morning: Shinkansen to Kawaguchiko",
              "Lake Kawaguchiko cruise with Mt. Fuji views",
              "Lunch at Houtou Fudou (local noodles)",
              "Evening: Return to Tokyo via express train",
            ],
          },
        ],
        packing: [
          "JR Pass (if traveling multiple cities)",
          "Pocket WiFi or SIM card",
          "Cash (many places don't accept cards)",
          "Comfortable shoes (lots of walking)",
          "Pasmo/Suica IC card for transit",
          "Light backpack for day trips",
        ],
        transit: [
          {
            name: "Tokyo Metro",
            link: "https://www.tokyometro.jp/en/",
            icon: "🚇",
          },
          {
            name: "JR Yamanote Line",
            link: "https://www.jreast.co.jp/e/",
            icon: "🚆",
          },
          {
            name: "Shinkansen (Bullet Train)",
            link: "https://www.jrpass.com/",
            icon: "🚄",
          },
          { name: "Taxi Apps", link: "https://japantaxi.jp/en/", icon: "🚕" },
        ],
        airport: "NRT",
      },
      "New York": {
        itinerary: [
          {
            day: 1,
            title: "Manhattan Highlights",
            imageQuery: "times+square+new+york",
            activities: [
              "Morning: Central Park walk & Bethesda Fountain",
              "Lunch: Shake Shack or Halal Guys",
              "Afternoon: Times Square & Broadway area",
              "Evening: Top of the Rock observation deck",
            ],
          },
          {
            day: 2,
            title: "Statue of Liberty & Downtown",
            imageQuery: "statue+of+liberty",
            activities: [
              "Morning: Ferry to Statue of Liberty & Ellis Island",
              "Lunch: Stone Street historic district",
              "Afternoon: 9/11 Memorial & Museum",
              "Evening: Brooklyn Bridge walk at sunset",
            ],
          },
          {
            day: 3,
            title: "Museums & Culture",
            imageQuery: "metropolitan+museum+art",
            activities: [
              "Morning: Metropolitan Museum of Art",
              "Lunch: Food trucks near MoMA",
              "Afternoon: Museum of Modern Art (MoMA)",
              "Evening: Dinner in Greenwich Village",
            ],
          },
        ],
        packing: [
          "MetroCard for subway",
          "Comfortable walking shoes",
          "Layers (buildings are heavily air-conditioned)",
          "Portable charger",
          "Reusable tote bag (NYC plastic bag ban)",
          "Umbrella (sudden rain showers)",
        ],
        transit: [
          {
            name: "NYC Subway (MTA)",
            link: "https://new.mta.info/",
            icon: "🚇",
          },
          { name: "Citi Bike", link: "https://citibikenyc.com/", icon: "🚲" },
          {
            name: "Yellow Cabs",
            link: "https://www.nyc.gov/site/tlc/passengers/taxi-passengers.page",
            icon: "🚕",
          },
          { name: "Uber/Lyft", link: "https://www.uber.com/", icon: "🚗" },
        ],
        airport: "JFK",
      },
      London: {
        itinerary: [
          {
            day: 1,
            title: "Royal London",
            imageQuery: "buckingham+palace+london",
            activities: [
              "Morning: Buckingham Palace & Changing of Guard",
              "Lunch: Borough Market food stalls",
              "Afternoon: Tower of London & Crown Jewels",
              "Evening: Thames River cruise",
            ],
          },
          {
            day: 2,
            title: "Museums & Culture",
            imageQuery: "british+museum+london",
            activities: [
              "Morning: British Museum (Rosetta Stone)",
              "Lunch: Covent Garden area",
              "Afternoon: National Gallery in Trafalgar Square",
              "Evening: West End theatre show",
            ],
          },
          {
            day: 3,
            title: "Modern London & Markets",
            imageQuery: "london+eye",
            activities: [
              "Morning: London Eye & South Bank walk",
              "Lunch: Camden Market street food",
              "Afternoon: Notting Hill & Portobello Road",
              "Evening: Sky Garden for sunset views",
            ],
          },
        ],
        packing: [
          "Oyster Card or contactless payment card",
          "Umbrella (London rain is frequent)",
          "UK power adapter (Type G)",
          "Light raincoat",
          "Comfortable walking shoes",
          "Reusable water bottle",
        ],
        transit: [
          {
            name: "London Underground (Tube)",
            link: "https://tfl.gov.uk/modes/tube/",
            icon: "🚇",
          },
          {
            name: "London Buses",
            link: "https://tfl.gov.uk/modes/buses/",
            icon: "🚌",
          },
          {
            name: "Santander Cycles",
            link: "https://tfl.gov.uk/modes/cycling/santander-cycles",
            icon: "🚲",
          },
          {
            name: "Black Cabs/Uber",
            link: "https://www.uber.com/",
            icon: "🚕",
          },
        ],
        airport: "LHR",
      },
    };

    // Get base data or default
    let data = destinationDB[dest]
      ? { ...destinationDB[dest] }
      : {
          itinerary: [
            {
              day: 1,
              title: "Arrival and City Exploration",
              imageQuery: `${dest}+city+view`,
              activities: [
                `Arrive at ${dest} airport and check into hotel`,
                `Visit main square or central area of ${dest}`,
                `Try local cuisine at recommended restaurant`,
                `Evening walk in historic district`,
              ],
            },
            {
              day: 2,
              title: "Cultural Immersion",
              imageQuery: `${dest}+landmarks`,
              activities: [
                `Morning visit to top museum in ${dest}`,
                `Lunch at local favorite spot`,
                `Afternoon: Explore famous landmarks`,
                `Evening: Local cultural experience`,
              ],
            },
          ],
          packing: [
            "Comfortable walking shoes",
            "Weather-appropriate clothing",
            "Universal power adapter",
            "Toiletries and personal meds",
            "Camera/Phone for photos",
            "Daypack for excursions",
          ],
          transit: [
            {
              name: "Local Metro/Subway",
              link: `https://www.google.com/maps/search/public+transit+${dest}`,
              icon: "🚇",
            },
            {
              name: "Taxi/Rideshare",
              link: "https://www.uber.com/",
              icon: "🚕",
            },
            { name: "Walking", link: "#", icon: "🚶" },
          ],
          airport: "Local Airport",
        };

    // Extend itinerary if daysCount > current itinerary length
    if (daysCount > data.itinerary.length) {
      const baseLength = data.itinerary.length;
      const extraDays = daysCount - baseLength;

      const extraActivities = [
        {
          title: "Hidden Gems & Local Life",
          activities: [
            `Explore lesser-known neighborhoods of ${dest}`,
            `Visit local markets and artisan shops`,
            `Relax at a scenic park or garden`,
            `Dinner at a hidden gem restaurant`,
          ],
        },
        {
          title: "Day Trip & Nature",
          activities: [
            `Take a day trip to nearby scenic towns`,
            `Hiking or nature walk in surrounding areas`,
            `Picnic with local produce`,
            `Return and relax at hotel`,
          ],
        },
        {
          title: "Culinary Adventure",
          activities: [
            `Join a local food tour or cooking class`,
            `Visit famous bakeries and cafes`,
            `Shopping for local spices or ingredients`,
            `Farewell dinner at a rooftop restaurant`,
          ],
        },
        {
          title: "Relaxation & Shopping",
          activities: [
            `Morning spa session or leisure time`,
            `Shopping at major districts or malls`,
            `Visit any missed landmarks`,
            `Sunset drinks at a view point`,
          ],
        },
      ];

      for (let i = 0; i < extraDays; i++) {
        const template = extraActivities[i % extraActivities.length];
        data.itinerary.push({
          day: baseLength + i + 1,
          title: template.title,
          imageQuery: `${dest}+${template.title.split(" ")[0]}`,
          activities: template.activities,
        });
      }
    }

    return data;
  };

  const destData = getDestinationData(destination, daysCount);
  const itinerary = destData.itinerary;
  const packingList = destData.packing;
  const transitOptions = destData.transit;

  const handleSaveTrip = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("🔒 Please log in to save trips!");
      navigate("/login");
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/trips/`, {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destination: destination || "Unknown",
          start_date: startDate,
          end_date: endDate,
          budget: budget,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTripId(data.id);
        alert(
          "✅ Trip saved successfully! You can now share it or create a chatroom.",
        );
      } else {
        alert("Failed to save trip.");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Error saving trip.");
    }
  };

  const handleShareTrip = async () => {
    if (!tripId) {
      alert("💾 Please save the trip first!");
      return;
    }
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(
        `http://localhost:8000/api/trips/${tripId}/make-public/`,
        {
          method: "POST",
          headers: { Authorization: `Token ${token}` },
        },
      );
      const data = await response.json();
      if (response.ok) {
        setShareUrl(`http://localhost:3000${data.share_url}`);
        alert("🔗 Trip is now public! Link generated.");
      } else {
        alert("Failed to generate share link.");
      }
    } catch (err) {
      console.error("Share error:", err);
      alert("Error sharing trip.");
    }
  };

  const handleCreateChatRoom = async () => {
    if (!tripId) {
      alert("💾 Please save the trip first!");
      return;
    }
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(
        `http://localhost:8000/api/trips/${tripId}/create-chatroom/`,
        {
          method: "POST",
          headers: { Authorization: `Token ${token}` },
        },
      );
      if (response.ok) {
        alert("💬 Trip Chatroom Created! Redirecting...");
        navigate("/chatroom");
      } else {
        alert("Failed to create chatroom.");
      }
    } catch (err) {
      console.error("Chatroom error:", err);
      alert("Error creating chatroom.");
    }
  };

  return (
    <div className="results-container">
      {/* Header Section */}
      <div className="trip-header">
        <h1>Trip to {destination || "Dream Destination"}</h1>
        <div className="header-badges">
          <span className="badge">
            📅 {startDate || "TBD"} - {endDate || "TBD"}
          </span>
          <span className="badge">💰 Budget: ₹{budget || "N/A"}</span>
        </div>
      </div>

      <div className="content-grid">
        {/* Left Column: Details & Widgets */}
        <div className="left-column">
          <div className="widget-card map-placeholder">
            <h3>📍 Interactive Map</h3>
            <MapWidget destination={destination} itinerary={itinerary} />
          </div>

          <div className="widget-card weather-widget">
            <h3>☀️ Weather</h3>
            <p>Current: 28°C Sunny</p>
            <p>Forecast: Pleasant throughout your trip</p>
          </div>

          <div className="widget-card transport-widget">
            <h3>🚗 Local Transport</h3>
            <ul>
              {transitOptions.map((transit, idx) => (
                <li key={idx}>
                  <a
                    href={transit.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transit-link"
                  >
                    {transit.icon} {transit.name} →
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="widget-card packing-widget">
            <h3>🧳 Smart Packing List</h3>
            <ul>
              {packingList.map((item, idx) => (
                <li key={idx}>✓ {item}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Column: Itinerary */}
        <div className="right-column">
          <div className="itinerary-section">
            <h2>🗺️ Your AI-Curated Itinerary</h2>
            {itinerary.map((day, index) => (
              <div key={index} className="day-card">
                <img
                  src={`https://picsum.photos/seed/${encodeURIComponent((day.imageQuery || destination) + day.day)}/800/300`}
                  alt={day.title}
                  className="day-image"
                  onError={(e) => (e.target.style.display = "none")}
                />
                <h3>
                  Day {day.day}: {day.title}
                </h3>
                <ul>
                  {day.activities.map((activity, i) => (
                    <li key={i}>
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(activity + " " + destination)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="activity-link"
                      >
                        {activity} 🔗
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions Footer */}
      <div className="actions-footer">
        <button
          className="btn-secondary"
          onClick={() =>
            navigate("/planner", {
              state: { destination, startDate, endDate, budget },
            })
          }
        >
          ✏️ Customize
        </button>
        <button
          className="btn-secondary"
          onClick={() => window.location.reload()}
        >
          🔄 Regenerate
        </button>
        <button className="btn-primary" onClick={handleSaveTrip}>
          💾 Save Trip
        </button>
        <button className="btn-secondary" onClick={handleShareTrip}>
          🔗 Share Trip
        </button>
        <button className="btn-secondary" onClick={handleCreateChatRoom}>
          💬 Trip Chat
        </button>
        <button
          className="btn-secondary"
          onClick={() =>
            navigate("/booking", {
              state: { destination, startDate, endDate, provider: "flights" },
            })
          }
        >
          ✈️ Book Flights
        </button>
        <button
          className="btn-secondary"
          onClick={() =>
            navigate("/booking", {
              state: { destination, startDate, endDate, provider: "hotels" },
            })
          }
        >
          🏨 Book Hotels
        </button>
        <a
          href={`https://www.rome2rio.com/map/${encodeURIComponent(destination)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary"
          style={{ textDecoration: "none" }}
        >
          🚌 Local Transport
        </a>
      </div>

      {shareUrl && (
        <div className="share-section">
          <p>🎉 Share this link with friends:</p>
          <div className="share-link-box">
            <input type="text" value={shareUrl} readOnly />
            <button onClick={() => navigator.clipboard.writeText(shareUrl)}>
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Results;

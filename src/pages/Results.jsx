import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MapWidget from "../components/MapWidget";
import {
  apiFetch,
  budgetToNumber,
  daysBetween,
  formatBudget,
  getHealth,
  getToken,
  parseItinerary,
} from "../services/api";
import "./Results.css";

const Results = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    destination,
    startDate,
    endDate,
    budget,
    travelers = 1,
    preferences,
    itinerary: incomingItinerary,
    tripId: incomingTripId,
  } = location.state || {};

  const daysCount = daysBetween(startDate, endDate) || 3;

  const initialItinerary = useMemo(
    () => parseItinerary(incomingItinerary),
    [incomingItinerary],
  );

  // Phase 4: Social & Collaboration State
  const [shareUrl, setShareUrl] = useState(null);
  const [tripId, setTripId] = useState(incomingTripId || null);
  const [saved, setSaved] = useState(Boolean(incomingTripId));
  const [busy, setBusy] = useState(false);
  const [aiItinerary, setAiItinerary] = useState(initialItinerary);
  const [aiStatus, setAiStatus] = useState(
    initialItinerary ? (incomingTripId ? "saved" : "ready") : "idle",
  );
  const aiRequested = useRef(false);

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
      ? {
          ...destinationDB[dest],
          itinerary: destinationDB[dest].itinerary.map((day) => ({
            ...day,
            activities: [...day.activities],
          })),
          packing: [...destinationDB[dest].packing],
          transit: [...destinationDB[dest].transit],
        }
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

  const destData = useMemo(
    () => getDestinationData(destination, daysCount),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [destination, daysCount],
  );

  const aiDays = useMemo(() => {
    if (!aiItinerary?.days?.length) return [];
    return aiItinerary.days.map((day, index) => ({
      ...day,
      day: day.day || index + 1,
      title: day.title || `Day ${index + 1}`,
      activities: Array.isArray(day.activities) ? day.activities : [],
      imageQuery: day.imageQuery || `${destination} ${day.title || ""}`,
    }));
  }, [aiItinerary, destination]);

  const itinerary = aiDays.length ? aiDays : destData.itinerary;

  const packingList =
    aiItinerary?.packing_list?.length > 0
      ? aiItinerary.packing_list
      : destData.packing;

  const transitOptions = useMemo(() => {
    if (!aiItinerary?.local_transportation?.length) return destData.transit;
    return aiItinerary.local_transportation.map((option, index) => {
      if (option && typeof option === "object") return option;
      const label = String(option);
      return {
        name: label,
        link: `https://www.google.com/search?q=${encodeURIComponent(
          `${label} ${destination} public transport`,
        )}`,
        icon: ["🚇", "🚕", "🚶", "🚌"][index % 4],
      };
    });
  }, [aiItinerary, destData.transit, destination]);

  const generateWithAI = useCallback(async () => {
    if (!destination || !startDate || !endDate) return false;
    setAiStatus("loading");
    try {
      const data = await apiFetch("/trips/preview/", {
        method: "POST",
        auth: false,
        body: {
          destination,
          start_date: startDate,
          end_date: endDate,
          budget: budgetToNumber(budget),
          travelers,
          preferences,
        },
      });
      const parsed = parseItinerary(data.itinerary);
      if (parsed?.days?.length) {
        setAiItinerary(parsed);
        setAiStatus("ready");
        return true;
      }
      setAiStatus("fallback");
      return false;
    } catch (error) {
      setAiStatus("fallback");
      return false;
    }
  }, [destination, startDate, endDate, budget, travelers, preferences]);

  // If a saved trip is opened without its itinerary in router state, fetch it.
  useEffect(() => {
    if (!incomingTripId || initialItinerary) return undefined;
    let cancelled = false;
    apiFetch(`/trips/${incomingTripId}/`)
      .then((trip) => {
        if (cancelled) return;
        const parsed = parseItinerary(trip.itinerary_data || trip.itinerary);
        if (parsed) {
          setAiItinerary(parsed);
          setAiStatus("saved");
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [incomingTripId, initialItinerary]);

  // Silently upgrade the curated plan with AI when the server has a provider.
  useEffect(() => {
    if (initialItinerary || incomingTripId || aiRequested.current) return;
    aiRequested.current = true;
    let cancelled = false;
    getHealth().then((health) => {
      if (cancelled) return;
      if (health.ai_provider) {
        generateWithAI();
      } else {
        setAiStatus("fallback");
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const itineraryPayload = useMemo(
    () => ({
      days: itinerary,
      packing_list: packingList,
      local_transportation: transitOptions.map((option) =>
        typeof option === "string" ? option : option.name,
      ),
      mood_board_keywords: aiItinerary?.mood_board_keywords || [
        `${destination} landmarks`,
        `${destination} local food`,
        "travel inspiration",
      ],
    }),
    [itinerary, packingList, transitOptions, aiItinerary, destination],
  );

  const saveTrip = useCallback(async () => {
    if (!getToken()) {
      alert("🔒 Please log in to save trips!");
      navigate("/login");
      return null;
    }
    if (!destination || !startDate || !endDate) {
      alert("This trip is missing its destination or dates.");
      return null;
    }

    setBusy(true);
    try {
      const payload = {
        destination,
        start_date: startDate,
        end_date: endDate,
        budget: budgetToNumber(budget),
        preferences: JSON.stringify(preferences || []),
        itinerary: itineraryPayload,
      };

      const data = tripId
        ? await apiFetch(`/trips/${tripId}/`, { method: "PATCH", body: payload })
        : await apiFetch("/trips/", { method: "POST", body: payload });

      const id = data?.id || tripId;
      setTripId(id);
      setSaved(true);
      return id;
    } catch (error) {
      if (error.status === 401) {
        navigate("/login");
      } else if (error.status === 429) {
        alert("Too many requests. Please wait a moment and try again.");
      } else {
        alert(error.message || "Could not save this trip.");
      }
      return null;
    } finally {
      setBusy(false);
    }
  }, [budget, destination, endDate, navigate, preferences, startDate, tripId, itineraryPayload]);

  const handleSaveTrip = async () => {
    const id = await saveTrip();
    if (id) {
      alert("✅ Trip saved. You can now share it or open its chatroom.");
    }
  };

  const handleShareTrip = async () => {
    if (busy) return;
    const id = tripId || (await saveTrip());
    if (!id) return;

    setBusy(true);
    try {
      const data = await apiFetch(`/trips/${id}/make-public/`, {
        method: "POST",
      });
      setShareUrl(`${window.location.origin}${data.share_url}`);
      alert("🔗 Trip is now public. Share the link below!");
    } catch (error) {
      alert(error.message || "Could not create a share link.");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateChatRoom = async () => {
    if (busy) return;
    const id = tripId || (await saveTrip());
    if (!id) return;

    setBusy(true);
    try {
      const data = await apiFetch(`/trips/${id}/create-chatroom/`, {
        method: "POST",
      });
      navigate("/chatroom", {
        state: {
          roomId: data.chatroom?.id,
          roomCode: data.chatroom?.room_code,
          roomName: data.chatroom?.name,
        },
      });
    } catch (error) {
      alert(error.message || "Could not create the trip chatroom.");
    } finally {
      setBusy(false);
    }
  };

  const handleRegenerate = async () => {
    if (aiStatus === "loading") return;
    const ok = await generateWithAI();
    if (!ok) {
      alert(
        "AI generation is not available on this deployment, so the curated plan is shown instead. Add an AI key to enable it.",
      );
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
          <span className="badge">💰 Budget: {formatBudget(budget)}</span>
          <span className="badge">
            {aiStatus === "loading"
              ? "✨ Personalising with AI..."
              : aiStatus === "ready"
                ? "✨ AI itinerary"
                : aiStatus === "saved"
                  ? "📋 Saved itinerary"
                  : "🧭 Curated plan"}
          </span>
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
            <p>Check the live forecast before you pack.</p>
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(
                `${destination} weather forecast`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="transit-link"
            >
              View forecast →
            </a>
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
              state: { destination, startDate, endDate, budget, preferences },
            })
          }
        >
          ✏️ Customize
        </button>
        <button
          className="btn-secondary"
          onClick={handleRegenerate}
          disabled={aiStatus === "loading"}
        >
          {aiStatus === "loading" ? "✨ Generating..." : "🔄 Regenerate"}
        </button>
        <button
          className="btn-primary"
          onClick={handleSaveTrip}
          disabled={busy}
        >
          {busy ? "Saving..." : saved ? "💾 Update Trip" : "💾 Save Trip"}
        </button>
        <button
          className="btn-secondary"
          onClick={handleShareTrip}
          disabled={busy}
        >
          🔗 Share Trip
        </button>
        <button
          className="btn-secondary"
          onClick={handleCreateChatRoom}
          disabled={busy}
        >
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

import axios from "axios";

// Safely access environment variables
const getEnv = (key, defaultValue) => {
  if (typeof process !== "undefined" && process.env) {
    return process.env[key] || defaultValue;
  }
  return defaultValue;
};

// Amadeus API Configuration
const AMADEUS_API_KEY = getEnv(
  "REACT_APP_AMADEUS_API_KEY",
  "YOUR_API_KEY_HERE",
);
const AMADEUS_API_SECRET = getEnv(
  "REACT_APP_AMADEUS_API_SECRET",
  "YOUR_API_SECRET_HERE",
);
const BASE_URL = "https://test.api.amadeus.com/v2";
const AUTH_URL = "https://test.api.amadeus.com/v1/security/oauth2/token";

// Cache for access token
let accessToken = null;
let tokenExpiry = null;

// Get or refresh access token
const getAccessToken = async () => {
  // Return cached token if still valid
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

  try {
    const response = await axios.post(
      AUTH_URL,
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: AMADEUS_API_KEY,
        client_secret: AMADEUS_API_SECRET,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    accessToken = response.data.access_token;
    // Token expires in seconds, cache for 95% of that time
    tokenExpiry = Date.now() + response.data.expires_in * 950;

    return accessToken;
  } catch (error) {
    console.error("Failed to get access token:", error);
    throw new Error("Authentication failed");
  }
};

// Airport code mapping for major cities
const cityToAirportCode = {
  Paris: "PAR",
  Tokyo: "TYO",
  London: "LON",
  "New York": "NYC",
  Rome: "ROM",
  Barcelona: "BCN",
  Dubai: "DXB",
  Sydney: "SYD",
  Singapore: "SIN",
  Amsterdam: "AMS",
  Istanbul: "IST",
  Bangkok: "BKK",
  "Hong Kong": "HKG",
  "Los Angeles": "LAX",
  Miami: "MIA",
  Venice: "VCE",
  Prague: "PRG",
  Vienna: "VIE",
  Athens: "ATH",
  Cairo: "CAI",
  Mumbai: "BOM",
  Delhi: "DEL",
  Jaipur: "JAI",
  Agra: "AGR",
  Goa: "GOI",
};

// Get airport code for city
export const getCityCode = (cityName) => {
  if (!cityName) return "DEL";
  // If it's already a 3-letter code, return it
  if (cityName.length === 3 && cityName === cityName.toUpperCase())
    return cityName;
  // Look up in map, default to first 3 letters uppercase if not found
  return cityToAirportCode[cityName] || cityName.substring(0, 3).toUpperCase();
};

// Search flights
export const searchFlights = async (
  origin,
  destination,
  departureDate,
  returnDate = null,
  adults = 1,
) => {
  try {
    const token = await getAccessToken();

    const originCode = getCityCode(origin);
    const destCode = getCityCode(destination);

    const params = {
      originLocationCode: originCode,
      destinationLocationCode: destCode,
      departureDate: departureDate,
      adults: adults,
      max: 10,
      currencyCode: "INR",
    };

    if (returnDate) {
      params.returnDate = returnDate;
    }

    const response = await axios.get(`${BASE_URL}/shopping/flight-offers`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: params,
    });

    return formatFlightData(response.data.data);
  } catch (error) {
    console.error(
      "Flight search error:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

// Format flight data for our UI
const formatFlightData = (flights) => {
  if (!flights || !Array.isArray(flights)) return [];

  return flights.map((flight, index) => {
    const segment = flight.itineraries[0].segments[0];
    const lastSegment =
      flight.itineraries[0].segments[flight.itineraries[0].segments.length - 1];

    return {
      id: index + 1,
      airline: segment.carrierCode,
      logo: `https://pics.avs.io/200/200/${segment.carrierCode}.png`,
      flightNumber: `${segment.carrierCode} ${segment.number}`,
      departure: new Date(segment.departure.at).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      arrival: new Date(lastSegment.arrival.at).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      duration: flight.itineraries[0].duration.replace("PT", "").toLowerCase(),
      stops:
        flight.itineraries[0].segments.length === 1
          ? "Non-stop"
          : `${flight.itineraries[0].segments.length - 1} stop(s)`,
      price: Math.round(parseFloat(flight.price.total)),
      class:
        flight.travelerPricings[0].fareDetailsBySegment[0].cabin || "Economy",
      currency: flight.price.currency,
    };
  });
};

// Search hotels by city
export const searchHotelsByCity = async (
  cityCode,
  checkInDate,
  checkOutDate,
  adults = 1,
) => {
  try {
    const token = await getAccessToken();

    // First, get hotel IDs for the city
    const hotelsResponse = await axios.get(
      `${BASE_URL}/reference-data/locations/hotels/by-city`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          cityCode: cityCode,
          radius: 20,
          radiusUnit: "KM",
          hotelSource: "ALL",
        },
      },
    );

    if (!hotelsResponse.data.data || hotelsResponse.data.data.length === 0) {
      throw new Error("No hotels found in this city");
    }

    // Get hotel IDs (limit to first 10)
    const hotelIds = hotelsResponse.data.data
      .slice(0, 10)
      .map((hotel) => hotel.hotelId)
      .join(",");

    // Get hotel offers
    const offersResponse = await axios.get(
      `${BASE_URL}/shopping/hotel-offers`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          hotelIds: hotelIds,
          checkInDate: checkInDate,
          checkOutDate: checkOutDate,
          adults: adults,
          currency: "INR",
        },
      },
    );

    return formatHotelData(offersResponse.data.data);
  } catch (error) {
    console.error("Hotel search error:", error.response?.data || error.message);
    throw error;
  }
};

// Format hotel data for our UI
const formatHotelData = (hotels) => {
  if (!hotels || !Array.isArray(hotels)) return [];

  return hotels.map((hotel, index) => {
    const offer = hotel.offers[0];
    const price = Math.round(parseFloat(offer.price.total));

    return {
      id: index + 1,
      name: hotel.hotel.name,
      image: `https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop&sig=${index}`,
      rating: hotel.hotel.rating || 4,
      reviews: Math.floor(Math.random() * 1000) + 100,
      location: hotel.hotel.address?.cityName || "City Center",
      amenities: hotel.hotel.amenities?.slice(0, 4) || [
        "WiFi",
        "Pool",
        "Restaurant",
        "Gym",
      ],
      price: price,
      originalPrice: Math.round(price * 1.2),
      currency: offer.price.currency,
      hotelId: hotel.hotel.hotelId,
    };
  });
};

const amadeusAPI = {
  searchFlights,
  searchHotelsByCity,
  getCityCode,
};

export default amadeusAPI;

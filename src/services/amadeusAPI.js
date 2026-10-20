import { apiFetch } from "./api";

/**
 * Flight and hotel search now goes through the Django API, which keeps the
 * Amadeus client secret on the server and avoids browser CORS restrictions.
 * When the provider is not configured the API returns 503 and the booking
 * page falls back to its curated sample results.
 */

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
  Kerala: "COK",
  Bali: "DPS",
};

export const getCityCode = (cityName) => {
  if (!cityName) return "DEL";
  const trimmed = cityName.trim();
  if (trimmed.length === 3 && trimmed === trimmed.toUpperCase()) return trimmed;
  return cityToAirportCode[trimmed] || trimmed.substring(0, 3).toUpperCase();
};

export const searchFlights = async (
  origin,
  destination,
  departureDate,
  returnDate = null,
  adults = 1,
) => {
  const params = new URLSearchParams({
    origin,
    destination,
    departure_date: departureDate,
    adults: String(adults),
  });
  if (returnDate) params.set("return_date", returnDate);

  const data = await apiFetch(`/travel/flights/?${params.toString()}`, {
    auth: false,
  });
  return data.results || [];
};

export const searchHotelsByCity = async (
  cityCode,
  checkInDate,
  checkOutDate,
  adults = 1,
) => {
  const params = new URLSearchParams({
    destination: cityCode,
    check_in: checkInDate,
    check_out: checkOutDate,
    adults: String(adults),
  });

  const data = await apiFetch(`/travel/hotels/?${params.toString()}`, {
    auth: false,
  });
  return data.results || [];
};

const amadeusAPI = {
  searchFlights,
  searchHotelsByCity,
  getCityCode,
};

export default amadeusAPI;

"""Server-side Amadeus integration.

The browser never sees the Amadeus client secret. When credentials are not
configured, callers return a 503 and the frontend uses its curated mock data.
"""

import logging
import threading
import time

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

_token_lock = threading.Lock()
_token_cache = {"value": None, "expires_at": 0}

CITY_TO_AIRPORT = {
    "Paris": "PAR",
    "Tokyo": "TYO",
    "London": "LON",
    "New York": "NYC",
    "Rome": "ROM",
    "Barcelona": "BCN",
    "Dubai": "DXB",
    "Sydney": "SYD",
    "Singapore": "SIN",
    "Amsterdam": "AMS",
    "Istanbul": "IST",
    "Bangkok": "BKK",
    "Hong Kong": "HKG",
    "Los Angeles": "LAX",
    "Miami": "MIA",
    "Venice": "VCE",
    "Prague": "PRG",
    "Vienna": "VIE",
    "Athens": "ATH",
    "Cairo": "CAI",
    "Mumbai": "BOM",
    "Delhi": "DEL",
    "Jaipur": "JAI",
    "Agra": "AGR",
    "Goa": "GOI",
    "Kerala": "COK",
    "Bali": "DPS",
}


class AmadeusUnavailable(Exception):
    pass


class AmadeusError(Exception):
    pass


def configured():
    return bool(
        (getattr(settings, "AMADEUS_CLIENT_ID", "") or "").strip()
        and (getattr(settings, "AMADEUS_CLIENT_SECRET", "") or "").strip()
    )


def _base_url():
    if getattr(settings, "AMADEUS_ENV", "test") == "production":
        return "https://api.amadeus.com"
    return "https://test.api.amadeus.com"


def city_code(value):
    if not value:
        return "DEL"
    value = value.strip()
    if len(value) == 3 and value.isalpha() and value.isupper():
        return value
    if value in CITY_TO_AIRPORT:
        return CITY_TO_AIRPORT[value]
    return value[:3].upper()


def _get_token():
    now = time.time()
    with _token_lock:
        if _token_cache["value"] and now < _token_cache["expires_at"]:
            return _token_cache["value"]

        try:
            response = requests.post(
                f"{_base_url()}/v1/security/oauth2/token",
                data={
                    "grant_type": "client_credentials",
                    "client_id": settings.AMADEUS_CLIENT_ID,
                    "client_secret": settings.AMADEUS_CLIENT_SECRET,
                },
                timeout=15,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            logger.warning("Amadeus authentication failed: %s", exc)
            raise AmadeusError("Could not authenticate with travel provider") from exc

        data = response.json()
        _token_cache["value"] = data["access_token"]
        # Refresh a little early.
        _token_cache["expires_at"] = now + max(int(data.get("expires_in", 1799)) - 60, 60)
        return _token_cache["value"]


def _get(path, params):
    token = _get_token()
    try:
        response = requests.get(
            f"{_base_url()}{path}",
            params=params,
            headers={"Authorization": f"Bearer {token}"},
            timeout=20,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        logger.warning("Amadeus request %s failed: %s", path, exc)
        raise AmadeusError("Travel provider request failed") from exc
    return response.json()


def search_flights(origin, destination, departure_date, return_date=None, adults=1):
    if not configured():
        raise AmadeusUnavailable("Amadeus credentials are not configured")

    params = {
        "originLocationCode": city_code(origin),
        "destinationLocationCode": city_code(destination),
        "departureDate": departure_date,
        "adults": max(int(adults or 1), 1),
        "max": 10,
        "currencyCode": "INR",
    }
    if return_date:
        params["returnDate"] = return_date

    payload = _get("/v2/shopping/flight-offers", params)
    offers = payload.get("data") or []

    results = []
    for index, offer in enumerate(offers):
        try:
            itinerary = offer["itineraries"][0]
            segments = itinerary["segments"]
            first = segments[0]
            last = segments[-1]
            fare = offer.get("travelerPricings", [{}])[0]
            cabin = (
                fare.get("fareDetailsBySegment", [{}])[0].get("cabin") or "Economy"
            )
            results.append(
                {
                    "id": index + 1,
                    "airline": first["carrierCode"],
                    "logo": f"https://pics.avs.io/200/200/{first['carrierCode']}.png",
                    "flightNumber": f"{first['carrierCode']} {first['number']}",
                    "departure": _time(first["departure"]["at"]),
                    "arrival": _time(last["arrival"]["at"]),
                    "duration": itinerary["duration"].replace("PT", "").lower(),
                    "stops": "Non-stop"
                    if len(segments) == 1
                    else f"{len(segments) - 1} stop(s)",
                    "price": round(float(offer["price"]["total"])),
                    "class": cabin.title(),
                    "currency": offer["price"]["currency"],
                }
            )
        except (KeyError, IndexError, TypeError, ValueError):
            logger.debug("Skipping malformed Amadeus flight offer")
    return results


def search_hotels(city, check_in, check_out, adults=1):
    if not configured():
        raise AmadeusUnavailable("Amadeus credentials are not configured")

    hotels_payload = _get(
        "/v1/reference-data/locations/hotels/by-city",
        {
            "cityCode": city_code(city),
            "radius": 20,
            "radiusUnit": "KM",
            "hotelSource": "ALL",
        },
    )
    hotel_ids = [item["hotelId"] for item in (hotels_payload.get("data") or [])[:10]]
    if not hotel_ids:
        return []

    offers_payload = _get(
        "/v3/shopping/hotel-offers",
        {
            "hotelIds": ",".join(hotel_ids),
            "checkInDate": check_in,
            "checkOutDate": check_out,
            "adults": max(int(adults or 1), 1),
            "currency": "INR",
            "bestRateOnly": "true",
        },
    )

    results = []
    for index, item in enumerate(offers_payload.get("data") or []):
        hotel = item.get("hotel", {})
        offers = item.get("offers") or []
        if not offers:
            continue
        offer = offers[0]
        try:
            price = round(float(offer["price"]["total"]))
        except (KeyError, TypeError, ValueError):
            continue
        results.append(
            {
                "id": index + 1,
                "name": hotel.get("name", "Hotel"),
                "image": (
                    "https://images.unsplash.com/photo-1566073771259-6a8506099945"
                    f"?w=400&h=300&fit=crop&sig={index}"
                ),
                "rating": hotel.get("rating") or 4,
                "reviews": 0,
                "location": (hotel.get("address") or {}).get("cityName", "City Center"),
                "amenities": (hotel.get("amenities") or ["Wifi", "Parking"])[:4],
                "price": price,
                "originalPrice": round(price * 1.2),
                "currency": offer["price"].get("currency", "INR"),
                "hotelId": hotel.get("hotelId"),
            }
        )
    return results


def _time(value):
    # "2026-11-02T09:00:00" -> "09:00"
    try:
        return value.split("T")[1][:5]
    except (AttributeError, IndexError):
        return value

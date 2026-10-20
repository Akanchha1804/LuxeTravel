import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./MapWidget.css";

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const MapWidget = ({ destination, itinerary }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [coordinates, setCoordinates] = useState(null);
  const [activityLocations, setActivityLocations] = useState([]);

  // Geocode destination to get coordinates
  useEffect(() => {
    const geocodeDestination = async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}`,
        );
        const data = await response.json();
        if (data && data.length > 0) {
          setCoordinates({
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
          });
        }
      } catch (error) {
        console.error("Geocoding error:", error);
        // Default to a central location if geocoding fails
        setCoordinates({ lat: 20, lng: 0 });
      }
    };

    if (destination) {
      geocodeDestination();
    }
  }, [destination]);

  // Generate mock activity locations around the destination
  useEffect(() => {
    if (coordinates && itinerary) {
      const locations = [];
      let dayIndex = 0;

      itinerary.forEach((day) => {
        day.activities.forEach((activity, activityIndex) => {
          // Generate random offset for each activity (within ~5km radius)
          const latOffset = (Math.random() - 0.5) * 0.05;
          const lngOffset = (Math.random() - 0.5) * 0.05;

          locations.push({
            lat: coordinates.lat + latOffset,
            lng: coordinates.lng + lngOffset,
            day: day.day,
            activity: activity,
            dayColor: getDayColor(dayIndex),
          });
        });
        dayIndex++;
      });

      setActivityLocations(locations);
    }
  }, [coordinates, itinerary]);

  // Initialize map and add markers/routes
  useEffect(() => {
    if (!coordinates || !mapRef.current) return;

    // Initialize map
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView(
        [coordinates.lat, coordinates.lng],
        13,
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);
    }

    // Clear existing markers and routes
    mapInstanceRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        mapInstanceRef.current.removeLayer(layer);
      }
    });

    // Add activity markers
    const dayGroups = {};
    activityLocations.forEach((location, index) => {
      // Create custom icon for each day
      const customIcon = L.divIcon({
        className: "custom-marker",
        html: `<div class="marker-pin" style="background-color: ${location.dayColor}">
                        <span>${location.day}</span>
                       </div>`,
        iconSize: [30, 42],
        iconAnchor: [15, 42],
        popupAnchor: [0, -42],
      });

      L.marker([location.lat, location.lng], {
        icon: customIcon,
      }).addTo(mapInstanceRef.current).bindPopup(`
                    <div class="marker-popup">
                        <strong>Day ${location.day}</strong><br/>
                        ${location.activity}
                    </div>
                `);

      // Group markers by day for route drawing
      if (!dayGroups[location.day]) {
        dayGroups[location.day] = [];
      }
      dayGroups[location.day].push([location.lat, location.lng]);
    });

    // Draw routes for each day
    Object.keys(dayGroups).forEach((day) => {
      const points = dayGroups[day];
      if (points.length > 1) {
        const dayColor = getDayColor(parseInt(day) - 1);
        L.polyline(points, {
          color: dayColor,
          weight: 3,
          opacity: 0.7,
          dashArray: "10, 5",
        }).addTo(mapInstanceRef.current);
      }
    });

    // Fit bounds to show all markers
    if (activityLocations.length > 0) {
      const bounds = activityLocations.map((loc) => [loc.lat, loc.lng]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [coordinates, activityLocations]);

  const getDayColor = (dayIndex) => {
    const colors = ["#854F6C", "#DFB6B2", "#522B5B", "#FBE4D8", "#2B124C"];
    return colors[dayIndex % colors.length];
  };

  return (
    <div className="map-widget-container">
      <div ref={mapRef} className="leaflet-map"></div>
      {!coordinates && <div className="map-loading">Loading map...</div>}
    </div>
  );
};

export default MapWidget;

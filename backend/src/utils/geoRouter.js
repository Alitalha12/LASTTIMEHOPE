/**
 * Geo-routing utility
 * Simulates route path generation and time-of-day traffic latency calculations
 */
const logger = require("./logger");

/**
 * Calculates a detailed route path, distance, and duration between two coordinates
 * @param {number} lat1 - Provider Latitude
 * @param {number} lng1 - Provider Longitude
 * @param {number} lat2 - Customer Latitude
 * @param {number} lng2 - Customer Longitude
 * @returns {object} Route tracking info
 */
const calculateRoute = (lat1, lng1, lat2, lng2) => {
  // 1. Calculate straight-line distance (Haversine)
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const straightDistance = 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // 2. Real road distance is usually 1.25x to 1.4x of straight line
  const roadDistance = Math.round(straightDistance * 1.32 * 10) / 10;

  // 3. Traffic Multipliers based on time-of-day
  const currentHour = new Date().getHours();
  let trafficMultiplier = 1.0;
  
  if ((currentHour >= 8 && currentHour <= 10) || (currentHour >= 17 && currentHour <= 19)) {
    // Peak Rush Hours (Office / School commute)
    trafficMultiplier = 1.85; 
  } else if (currentHour >= 12 && currentHour <= 14) {
    // Lunch Rush
    trafficMultiplier = 1.4;
  }

  // Average speed in city: 35 km/h
  const baseDurationMinutes = (roadDistance / 35) * 60;
  const realDurationMinutes = Math.max(2, Math.round(baseDurationMinutes * trafficMultiplier));

  // 4. Generate route coordinates (sinusoidal tracks to simulate roads)
  const steps = Math.max(8, Math.round(roadDistance * 2));
  const coordinates = [];

  for (let i = 0; i <= steps; i++) {
    const fraction = i / steps;
    
    // Linearly interpolate coordinates
    let lat = lat1 + (lat2 - lat1) * fraction;
    let lng = lng1 + (lng2 - lng1) * fraction;
    
    // Add sinusoidal wave perpendicular to the line to represent street turns
    if (i > 0 && i < steps) {
      const angle = Math.atan2(lat2 - lat1, lng2 - lng1) + Math.PI / 2;
      const amplitude = 0.0006 * Math.sin(fraction * Math.PI * 3); // 3 curves
      lat += amplitude * Math.sin(angle);
      lng += amplitude * Math.cos(angle);
    }

    coordinates.push({
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lng.toFixed(6))
    });
  }

  logger.debug(`Route calculated: ${roadDistance}km, ${realDurationMinutes}mins (Traffic: ${trafficMultiplier}x)`);

  return {
    distanceKm: roadDistance,
    durationMinutes: realDurationMinutes,
    coordinates
  };
};

module.exports = { calculateRoute };

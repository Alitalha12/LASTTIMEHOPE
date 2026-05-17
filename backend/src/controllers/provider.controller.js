/**
 * Provider Controller
 * Handles provider listing and search — REAL Firebase queries
 */
const logger = require("../utils/logger");
const { queryDocuments, getDocument, getAllDocuments } = require("../services/firebase.service");

/**
 * GET /api/providers
 * List providers with optional filters: ?service=plumber&location=G-13&available=true
 */
const getProviders = async (req, res, next) => {
  try {
    const { service, location, available } = req.query;

    logger.info(`Provider search — service: ${service || "all"}, location: ${location || "all"}`);

    const filters = [];

    if (service) {
      filters.push({ field: "service_type", operator: "==", value: service });
    }
    if (location) {
      filters.push({ field: "location", operator: "==", value: location });
    }
    if (available === "true") {
      filters.push({ field: "available", operator: "==", value: true });
    }

    const providers = filters.length > 0
      ? await queryDocuments("providers", filters)
      : await getAllDocuments("providers");

    res.status(200).json({
      success: true,
      count: providers.length,
      data: providers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/providers/:providerId
 * Get a specific provider by ID
 */
const getProviderById = async (req, res, next) => {
  try {
    const { providerId } = req.params;

    logger.info(`Fetching provider: ${providerId}`);

    let provider = await getDocument("providers", providerId);

    if (!provider) {
      // Auto-heal: see if they exist in "users" collection
      const user = await getDocument("users", providerId);
      if (user && user.role === "provider") {
        logger.info(`Auto-creating missing provider record during getProviderById for: ${providerId}`);
        const profile = await getDocument("user_profiles", providerId);
        provider = {
          id: providerId,
          fullName: user.fullName || "Specialist Expert",
          service_type: "ac_technician", // Default category
          rating: 5.0,
          completedJobs: 0,
          city: user.city || profile?.currentLocation?.city || "Islamabad",
          location: profile?.addresses?.[0]?.area?.split(',')[0]?.trim() || "G-13",
          radiusKm: 15.0,
          available: true,
          badgeTier: "Silver",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        const { addDocument } = require("../services/firebase.service");
        await addDocument("providers", providerId, provider);
      } else {
        return res.status(404).json({
          success: false,
          error: { message: "Provider not found" },
          statusCode: 404,
        });
      }
    }

    res.status(200).json({ success: true, data: provider });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/providers/:providerId/favorite
 * Toggle favorite status for a provider
 */
const toggleFavorite = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { providerId } = req.params;

    logger.info(`Toggling favorite provider: ${providerId} for user: ${userId}`);

    const { queryDocuments, addDocument, deleteDocument } = require("../services/firebase.service");
    const { v4: uuidv4 } = require("uuid");

    const existing = await queryDocuments("favorites", [
      { field: "userId", operator: "==", value: userId },
      { field: "providerId", operator: "==", value: providerId }
    ]);

    if (existing && existing.length > 0) {
      await deleteDocument("favorites", existing[0].id);
      return res.status(200).json({ success: true, isFavorite: false, message: "Removed from favorites." });
    } else {
      await addDocument("favorites", uuidv4(), { userId, providerId });
      return res.status(200).json({ success: true, isFavorite: true, message: "Added to favorites." });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/providers/favorites
 * Fetch list of all favorite providers for a user
 */
const getFavorites = async (req, res, next) => {
  try {
    const userId = req.user.id;

    logger.info(`Fetching favorite providers for user: ${userId}`);

    const { queryDocuments, getDocument } = require("../services/firebase.service");
    const favorites = await queryDocuments("favorites", [
      { field: "userId", operator: "==", value: userId }
    ]);

    const favoriteProviders = [];
    for (const fav of favorites) {
      const p = await getDocument("providers", fav.providerId);
      if (p) {
        favoriteProviders.push({ ...p, isFavorite: true });
      }
    }

    res.status(200).json({ success: true, count: favoriteProviders.length, data: favoriteProviders });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/providers/:providerId/availability
 * Fetch general weekly online slot hours and off-days for a provider
 */
const getAvailability = async (req, res, next) => {
  try {
    const { providerId } = req.params;
    logger.info(`Fetching availability settings for provider: ${providerId}`);

    let provider = await getDocument("providers", providerId);
    if (!provider) {
      // Auto-heal: see if they exist in "users" collection
      const user = await getDocument("users", providerId);
      if (user && user.role === "provider") {
        logger.info(`Auto-creating missing provider record during getAvailability for: ${providerId}`);
        const profile = await getDocument("user_profiles", providerId);
        provider = {
          id: providerId,
          fullName: user.fullName || "Specialist Expert",
          service_type: "ac_technician", // Default category
          rating: 5.0,
          completedJobs: 0,
          city: user.city || profile?.currentLocation?.city || "Islamabad",
          location: profile?.addresses?.[0]?.area?.split(',')[0]?.trim() || "G-13",
          radiusKm: 15.0,
          available: true,
          badgeTier: "Silver",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        const { addDocument } = require("../services/firebase.service");
        await addDocument("providers", providerId, provider);
      } else {
        return res.status(404).json({ success: false, message: "Provider not found." });
      }
    }

    const defaultAvailability = {
      offDays: ["Sunday"],
      slots: {
        "09:00 - 11:00": true,
        "11:00 - 13:00": true,
        "13:00 - 15:00": true,
        "15:00 - 17:00": true,
        "17:00 - 19:00": true
      }
    };

    res.status(200).json({
      success: true,
      data: provider.availabilitySettings || defaultAvailability
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/providers/availability
 * Updates work slots and off-days for the logged-in provider
 */
const updateAvailability = async (req, res, next) => {
  try {
    const providerId = req.user.id;
    const { offDays, slots } = req.body;
    logger.info(`Updating availability settings for provider: ${providerId}`);

    const provider = await getDocument("providers", providerId);
    if (!provider) {
      // Check if we need to auto-create provider placeholder
      const { addDocument } = require("../services/firebase.service");
      const user = await getDocument("users", providerId);
      const placeholder = {
        id: providerId,
        businessName: user?.fullName || "Expert Provider",
        ownerName: user?.fullName || "Expert Provider",
        phone: user?.phoneNumber || "+923000000000",
        city: user?.city || "Islamabad",
        area: "G-13",
        service_type: "ac_technician",
        rating: 4.8,
        totalReviews: 1,
        experienceYears: 5,
        basePrice: 1500,
        available: true,
        isVerified: true,
        completedJobs: 0,
        distances: { "G-13": 1.0 },
        createdAt: new Date().toISOString()
      };
      await addDocument("providers", providerId, placeholder);
    }

    const availabilitySettings = {
      offDays: offDays || ["Sunday"],
      slots: slots || {
        "09:00 - 11:00": true,
        "11:00 - 13:00": true,
        "13:00 - 15:00": true,
        "15:00 - 17:00": true,
        "17:00 - 19:00": true
      }
    };

    const { updateDocument } = require("../services/firebase.service");
    await updateDocument("providers", providerId, { availabilitySettings });

    res.status(200).json({
      success: true,
      message: "Availability settings saved successfully.",
      data: availabilitySettings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/providers/earnings
 * Calculates dynamic daily, weekly, and monthly earnings breakdown aggregates
 */
const getEarningsAnalytics = async (req, res, next) => {
  try {
    const providerId = req.user.id;
    logger.info(`Calculating earnings analytics for provider: ${providerId}`);

    const { queryDocuments } = require("../services/firebase.service");
    const bookings = await queryDocuments("bookings", [
      { field: "providerId", operator: "==", value: providerId },
      { field: "status", operator: "==", value: "completed" }
    ]);

    const daily = {};
    const weekly = {};
    const monthly = {};

    // Pre-fill daily (last 7 days)
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
      daily[dayStr] = 0;
    }

    // Pre-fill weekly (last 4 weeks)
    for (let i = 3; i >= 0; i--) {
      weekly[`Week ${4 - i}`] = 0;
    }

    // Pre-fill monthly (last 6 months)
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStr = d.toLocaleDateString('en-US', { month: 'short' });
      monthly[monthStr] = 0;
    }

    const now = new Date();

    bookings.forEach(b => {
      const price = parseFloat(b.price || b.cost || 0);
      const date = b.completedAt ? new Date(b.completedAt) : (b.createdAt ? new Date(b.createdAt) : new Date());

      // Group Daily (if within last 7 days)
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) {
        const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' });
        if (typeof daily[dayStr] !== 'undefined') {
          daily[dayStr] += price;
        }
      }

      // Group Weekly (if within last 28 days)
      if (diffDays <= 28) {
        const weekIdx = Math.floor((diffDays - 1) / 7);
        const weekLabel = `Week ${4 - weekIdx}`;
        if (typeof weekly[weekLabel] !== 'undefined') {
          weekly[weekLabel] += price;
        }
      }

      // Group Monthly (if within last 180 days)
      if (diffDays <= 180) {
        const monthStr = date.toLocaleDateString('en-US', { month: 'short' });
        if (typeof monthly[monthStr] !== 'undefined') {
          monthly[monthStr] += price;
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        daily: Object.entries(daily).map(([label, value]) => ({ label, value })),
        weekly: Object.entries(weekly).map(([label, value]) => ({ label, value })),
        monthly: Object.entries(monthly).map(([label, value]) => ({ label, value }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/providers/:providerId/reviews
 * Fetch all reviews and replies for a provider
 */
const getProviderReviews = async (req, res, next) => {
  try {
    const { providerId } = req.params;
    logger.info(`Fetching reviews for provider: ${providerId}`);

    const { queryDocuments } = require("../services/firebase.service");
    const reviews = await queryDocuments("reviews", [
      { field: "providerId", operator: "==", value: providerId }
    ]);

    // Sort by newest first
    const sorted = reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      count: sorted.length,
      data: sorted
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/providers/radius
 * Updates the service area radius matching restriction for the provider
 */
const updateRadius = async (req, res, next) => {
  try {
    const providerId = req.user.id;
    const { radiusKm } = req.body;

    logger.info(`Updating service area radius to ${radiusKm}km for provider: ${providerId}`);

    if (radiusKm === undefined || isNaN(radiusKm) || radiusKm < 2 || radiusKm > 30) {
      return res.status(400).json({ success: false, message: "Radius must be a number between 2km and 30km." });
    }

    const { updateDocument, getDocument } = require("../services/firebase.service");
    
    // Self-healing: make sure provider document exists
    const provider = await getDocument("providers", providerId);
    if (!provider) {
      const { addDocument } = require("../services/firebase.service");
      const user = await getDocument("users", providerId);
      const placeholder = {
        id: providerId,
        fullName: user?.fullName || "Expert Provider",
        service_type: "ac_technician",
        rating: 5.0,
        completedJobs: 0,
        city: "Islamabad",
        location: "G-13",
        radiusKm: parseFloat(radiusKm),
        available: true,
        distances: { "G-13": 1.0 }
      };
      await addDocument("providers", providerId, placeholder);
    } else {
      await updateDocument("providers", providerId, { radiusKm: parseFloat(radiusKm) });
    }

    res.status(200).json({ success: true, message: "Service area radius updated successfully in Firestore." });
  } catch (error) {
    next(error);
  }
};

module.exports = { 
  getProviders, 
  getProviderById, 
  toggleFavorite, 
  getFavorites,
  getAvailability,
  updateAvailability,
  getEarningsAnalytics,
  getProviderReviews,
  updateRadius
};

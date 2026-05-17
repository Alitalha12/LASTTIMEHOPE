/**
 * userMemory.service.js
 * Builds AI memory context from a user's past booking history.
 * Used by the IntentParser agent to personalize AI responses.
 */
const { queryDocuments } = require('./firebase.service');
const logger = require('../utils/logger');

/**
 * Supported history depth options
 */
const HISTORY_DEPTHS = {
  last10:    { label: 'Last 10 Bookings',  limit: 10,  dayFilter: null },
  last30days:{ label: 'Last 30 Days',      limit: 50,  dayFilter: 30  },
  last90days:{ label: 'Last 3 Months',     limit: 100, dayFilter: 90  },
  allTime:   { label: 'All Time',          limit: 200, dayFilter: null },
};

/**
 * Build user memory context from Firestore booking history
 * @param {string} userId
 * @param {string} historyDepth - one of: 'last10' | 'last30days' | 'last90days' | 'allTime'
 * @returns {object} memory context object
 */
const buildUserMemoryContext = async (userId, historyDepth = 'last10') => {
  try {
    const depthConfig = HISTORY_DEPTHS[historyDepth] || HISTORY_DEPTHS.last10;
    logger.info(`[Memory] Building context for ${userId} | depth: ${depthConfig.label}`);

    // Fetch bookings from Firestore
    let bookings = await queryDocuments('bookings', [
      { field: 'userId', operator: '==', value: userId },
      { field: 'status',  operator: '==', value: 'completed' },
    ], { limit: depthConfig.limit, orderBy: 'createdAt', orderDirection: 'desc' });

    // Apply day filter if needed
    if (depthConfig.dayFilter) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - depthConfig.dayFilter);
      bookings = bookings.filter(b => new Date(b.createdAt) >= cutoff);
    }

    if (!bookings || bookings.length === 0) {
      logger.info(`[Memory] No history found for ${userId}`);
      return null;
    }

    // ── Analyze patterns ──────────────────────────────────────────────────────

    // 1. Most booked service type
    const serviceCounts = {};
    bookings.forEach(b => {
      const s = b.service_type || b.serviceName || 'unknown';
      serviceCounts[s] = (serviceCounts[s] || 0) + 1;
    });
    const topService = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    // 2. Preferred area (most frequent)
    const areaCounts = {};
    bookings.forEach(b => {
      const a = b.area || b.location || 'unknown';
      areaCounts[a] = (areaCounts[a] || 0) + 1;
    });
    const preferredArea = Object.entries(areaCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    // 3. Average budget
    const prices = bookings.map(b => Number(b.price || b.cost || 0)).filter(p => p > 0);
    const avgBudget = prices.length > 0
      ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
      : null;

    // 4. Favorite provider (highest rated + most used)
    const providerMap = {};
    bookings.forEach(b => {
      if (!b.providerName) return;
      const key = b.providerId || b.providerName;
      if (!providerMap[key]) {
        providerMap[key] = { name: b.providerName, rating: b.providerRating || 0, count: 0, avatar: b.providerAvatar };
      }
      providerMap[key].count++;
    });
    const favoriteProvider = Object.values(providerMap)
      .sort((a, b) => (b.rating * b.count) - (a.rating * a.count))[0] || null;

    // 5. Preferred time pattern
    const timeSlots = bookings.map(b => b.scheduledTime).filter(Boolean);
    const timeCounts = {};
    timeSlots.forEach(t => { timeCounts[t] = (timeCounts[t] || 0) + 1; });
    const preferredTime = Object.entries(timeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    // 6. Most common city
    const cityCounts = {};
    bookings.forEach(b => {
      const c = b.city || 'Islamabad';
      cityCounts[c] = (cityCounts[c] || 0) + 1;
    });
    const preferredCity = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    // ── Build memory object ──────────────────────────────────────────────────
    const memory = {
      totalBookings: bookings.length,
      topService,
      preferredArea,
      preferredCity,
      avgBudget,
      favoriteProvider: favoriteProvider ? {
        name: favoriteProvider.name,
        rating: favoriteProvider.rating,
        bookingCount: favoriteProvider.count,
        avatar: favoriteProvider.avatar,
      } : null,
      preferredTime: preferredTime || null,
      recentServices: [...new Set(bookings.slice(0, 3).map(b => b.service_type || b.serviceName))],
      lastBookingDate: bookings[0]?.createdAt || null,
      historyDepth: depthConfig.label,
    };

    logger.info(`[Memory] Context built: ${JSON.stringify(memory)}`);
    return memory;

  } catch (error) {
    logger.error(`[Memory] Failed to build context: ${error.message}`);
    return null; // Graceful degradation — don't crash orchestrator
  }
};

/**
 * Convert memory object to a natural language string for injection into AI prompt
 */
const memoryToPromptContext = (memory) => {
  if (!memory) return '';

  const lines = [
    `\n\n=== USER HISTORY CONTEXT (AI Memory Active) ===`,
    `Total past bookings analyzed: ${memory.totalBookings} (${memory.historyDepth})`,
    memory.topService     && `Most booked service: ${memory.topService}`,
    memory.preferredCity  && `Preferred city: ${memory.preferredCity}`,
    memory.preferredArea  && `Preferred area/sector: ${memory.preferredArea}`,
    memory.avgBudget      && `Average budget: ~${memory.avgBudget} PKR`,
    memory.preferredTime  && `Preferred time: ${memory.preferredTime}`,
    memory.favoriteProvider && `Favorite provider: ${memory.favoriteProvider.name} (${memory.favoriteProvider.rating}⭐, hired ${memory.favoriteProvider.bookingCount}x)`,
    memory.recentServices?.length && `Recent services: ${memory.recentServices.join(', ')}`,
    `\nINSTRUCTION: Use the above context to auto-fill missing fields if the user's query is vague.`,
    `If user doesn't mention location, use their preferred area.`,
    `If user doesn't mention budget, use their average budget as a soft limit.`,
    `=== END USER CONTEXT ===\n`,
  ].filter(Boolean);

  return lines.join('\n');
};

module.exports = { buildUserMemoryContext, memoryToPromptContext, HISTORY_DEPTHS };

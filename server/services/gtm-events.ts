/**
 * GTM Events Tracking Service
 * Tracks Google Tag Manager events fired from the frontend
 */

interface GTMEvent {
  id: string;
  eventName: string;
  eventCategory: string;
  eventLabel?: string;
  eventValue?: number;
  userId?: string;
  sessionId: string;
  timestamp: Date;
  pageUrl?: string;
  referrer?: string;
  userAgent?: string;
  country?: string;
  deviceType?: string;
  customData?: Record<string, any>;
}

interface GTMEventStats {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByCategory: Record<string, number>;
  uniqueSessions: number;
  uniqueUsers: number;
  pageViews: number;
  conversions: number;
  avgSessionDuration: number;
  bounceRate: number;
  topEvents: Array<{ name: string; count: number }>;
  deviceBreakdown: Record<string, number>;
  countryBreakdown: Record<string, number>;
}

// In-memory event store (in production, use a database)
const eventStore: Map<string, GTMEvent> = new Map();
const sessionStore: Set<string> = new Set();
const userStore: Set<string> = new Set();

/**
 * Log a GTM event
 */
export function logEvent(event: Omit<GTMEvent, "id" | "timestamp">): GTMEvent {
  const gtmEvent: GTMEvent = {
    ...event,
    id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
  };

  eventStore.set(gtmEvent.id, gtmEvent);
  sessionStore.add(event.sessionId);
  if (event.userId) {
    userStore.add(event.userId);
  }

  return gtmEvent;
}

/**
 * Get all events (with optional filtering)
 */
export function getEvents(options?: {
  limit?: number;
  offset?: number;
  category?: string;
  hoursBack?: number;
}): GTMEvent[] {
  let events = Array.from(eventStore.values());

  // Filter by time range
  if (options?.hoursBack) {
    const cutoffTime = new Date(
      Date.now() - options.hoursBack * 60 * 60 * 1000,
    );
    events = events.filter((e) => e.timestamp > cutoffTime);
  }

  // Filter by category
  if (options?.category) {
    events = events.filter((e) => e.eventCategory === options.category);
  }

  // Sort by timestamp descending
  events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Apply pagination
  const start = options?.offset || 0;
  const end = start + (options?.limit || 100);

  return events.slice(start, end);
}

/**
 * Get comprehensive GTM event statistics
 */
export function getEventStats(hoursBack: number = 24): GTMEventStats {
  const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  const recentEvents = Array.from(eventStore.values()).filter(
    (e) => e.timestamp > cutoffTime,
  );

  // Calculate statistics
  const eventsByType: Record<string, number> = {};
  const eventsByCategory: Record<string, number> = {};
  const deviceBreakdown: Record<string, number> = {};
  const countryBreakdown: Record<string, number> = {};
  const sessionMap: Map<string, number> = new Map();
  let pageViewCount = 0;
  let conversionCount = 0;
  let totalSessionDuration = 0;

  recentEvents.forEach((event) => {
    // Count by event type
    eventsByType[event.eventName] = (eventsByType[event.eventName] || 0) + 1;

    // Count by category
    eventsByCategory[event.eventCategory] =
      (eventsByCategory[event.eventCategory] || 0) + 1;

    // Count page views
    if (event.eventName === "page_view") {
      pageViewCount++;
    }

    // Count conversions
    if (event.eventCategory === "conversion") {
      conversionCount++;
    }

    // Track devices
    if (event.deviceType) {
      deviceBreakdown[event.deviceType] =
        (deviceBreakdown[event.deviceType] || 0) + 1;
    }

    // Track countries
    if (event.country) {
      countryBreakdown[event.country] =
        (countryBreakdown[event.country] || 0) + 1;
    }

    // Track session durations
    const sessionDuration = event.eventValue || 0;
    if (sessionMap.has(event.sessionId)) {
      sessionMap.set(
        event.sessionId,
        (sessionMap.get(event.sessionId) || 0) + sessionDuration,
      );
    } else {
      sessionMap.set(event.sessionId, sessionDuration);
    }
  });

  totalSessionDuration = Array.from(sessionMap.values()).reduce(
    (a, b) => a + b,
    0,
  );

  const avgSessionDuration =
    sessionMap.size > 0
      ? Math.round(totalSessionDuration / sessionMap.size)
      : 0;

  // Calculate bounce rate (sessions with only 1 event)
  const bouncedSessions = Array.from(sessionMap.entries()).filter(
    ([_, duration]) => duration === 0,
  ).length;
  const bounceRate =
    sessionMap.size > 0
      ? Math.round((bouncedSessions / sessionMap.size) * 100)
      : 0;

  // Get top events
  const topEvents = Object.entries(eventsByType)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return {
    totalEvents: recentEvents.length,
    eventsByType,
    eventsByCategory,
    uniqueSessions: sessionMap.size,
    uniqueUsers: userStore.size,
    pageViews: pageViewCount,
    conversions: conversionCount,
    avgSessionDuration,
    bounceRate,
    topEvents,
    deviceBreakdown,
    countryBreakdown,
  };
}

/**
 * Clear old events (keep only last N hours of data)
 */
export function cleanupOldEvents(hoursToKeep: number = 72): number {
  const cutoffTime = new Date(Date.now() - hoursToKeep * 60 * 60 * 1000);
  let deletedCount = 0;

  for (const [id, event] of eventStore.entries()) {
    if (event.timestamp < cutoffTime) {
      eventStore.delete(id);
      deletedCount++;
    }
  }

  return deletedCount;
}

/**
 * Get event timeline (aggregate events by hour)
 */
export function getEventTimeline(
  hoursBack: number = 24,
): Array<{ hour: string; count: number }> {
  const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  const timeline: Record<string, number> = {};

  Array.from(eventStore.values())
    .filter((e) => e.timestamp > cutoffTime)
    .forEach((event) => {
      const hour = new Date(event.timestamp);
      hour.setMinutes(0, 0, 0);
      const key = hour.toISOString();
      timeline[key] = (timeline[key] || 0) + 1;
    });

  return Object.entries(timeline)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, count]) => ({
      hour,
      count,
    }));
}

// Cleanup old events every hour
setInterval(
  () => {
    const deleted = cleanupOldEvents(72);
    console.log(`[GTM] Cleaned up ${deleted} old events`);
  },
  60 * 60 * 1000,
);

import axios from '../axiosConfig';

/**
 * Survey Event Tracking Utility
 * Tracks response funnel: viewed → started → completed → abandoned
 */

// Generate or retrieve session ID for this browser session
const getSessionId = () => {
    let sessionId = sessionStorage.getItem('rayix_session_id');
    if (!sessionId) {
        sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('rayix_session_id', sessionId);
    }
    return sessionId;
};

// Get unique identifier from URL or generate one
const getUniqueId = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('u') || urlParams.get('uid') || 'anonymous';
};

// Get distribution ID from URL if present
const getDistributionId = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const distId = urlParams.get('d') || urlParams.get('dist');
    return distId ? parseInt(distId) : null;
};

// Track event helper
const trackEvent = async (formId, eventType, additionalData = {}) => {
    try {
        const eventData = {
            formId,
            eventType,
            uniqueId: getUniqueId(),
            distributionId: getDistributionId(),
            sessionId: getSessionId(),
            userAgent: navigator.userAgent,
            referrer: document.referrer || null,
            ...additionalData
        };

        // Send tracking request (fire-and-forget, don't block UI)
        await axios.post('/api/analytics/survey-events', eventData);

        console.debug('[SurveyTracking]', eventType, eventData);
    } catch (error) {
        // Fail silently - tracking shouldn't break the survey
        console.error('[SurveyTracking] Failed to track event:', error.message);
    }
};

/**
 * Track when survey page is first viewed
 * Call this when the survey loads
 */
export const trackSurveyViewed = async (formId) => {
    // Check if already tracked in this session
    const trackingKey = `rayix_viewed_${formId}`;
    if (sessionStorage.getItem(trackingKey)) {
        return; // Already tracked
    }

    await trackEvent(formId, 'viewed');
    sessionStorage.setItem(trackingKey, 'true');
};

/**
 * Track when user starts answering questions
 * Call this when first question is answered
 */
export const trackSurveyStarted = async (formId, pageNumber = 1) => {
    // Check if already tracked in this session
    const trackingKey = `rayix_started_${formId}`;
    if (sessionStorage.getItem(trackingKey)) {
        return; // Already tracked
    }

    await trackEvent(formId, 'started', { pageNumber });
    sessionStorage.setItem(trackingKey, 'true');
};

/**
 * Track when survey is completed
 * Call this when final submission succeeds
 */
export const trackSurveyCompleted = async (formId, metadata = {}) => {
    // Check if already tracked in this session
    const trackingKey = `rayix_completed_${formId}`;
    if (sessionStorage.getItem(trackingKey)) {
        return; // Already tracked
    }

    await trackEvent(formId, 'completed', { metadata });
    sessionStorage.setItem(trackingKey, 'true');
};

/**
 * Track when survey is abandoned
 * Call this on page unload if started but not completed
 */
export const trackSurveyAbandoned = async (formId, pageNumber = null) => {
    // Only track if started but not completed
    const startedKey = `rayix_started_${formId}`;
    const completedKey = `rayix_completed_${formId}`;
    const abandonedKey = `rayix_abandoned_${formId}`;

    const hasStarted = sessionStorage.getItem(startedKey);
    const hasCompleted = sessionStorage.getItem(completedKey);
    const hasAbandoned = sessionStorage.getItem(abandonedKey);

    if (hasStarted && !hasCompleted && !hasAbandoned) {
        // Use sendBeacon for reliability during page unload
        const eventData = {
            formId,
            eventType: 'abandoned',
            uniqueId: getUniqueId(),
            distributionId: getDistributionId(),
            sessionId: getSessionId(),
            pageNumber,
            userAgent: navigator.userAgent,
        };

        try {
            const blob = new Blob([JSON.stringify(eventData)], { type: 'application/json' });
            const baseURL = axios.defaults.baseURL || window.location.origin;
            navigator.sendBeacon(`${baseURL}/api/analytics/survey-events`, blob);

            sessionStorage.setItem(abandonedKey, 'true');
            console.debug('[SurveyTracking] abandoned', eventData);
        } catch (error) {
            console.error('[SurveyTracking] Failed to track abandonment:', error.message);
        }
    }
};

/**
 * Setup abandon tracking on page unload
 * Call this once when survey component mounts
 */
export const setupAbandonTracking = (formId, getCurrentPage) => {
    const handleBeforeUnload = () => {
        const currentPage = getCurrentPage ? getCurrentPage() : null;
        trackSurveyAbandoned(formId, currentPage);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Return cleanup function
    return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
    };
};

/**
 * Clear tracking state (useful for testing)
 */
export const clearTrackingState = (formId) => {
    sessionStorage.removeItem(`rayix_viewed_${formId}`);
    sessionStorage.removeItem(`rayix_started_${formId}`);
    sessionStorage.removeItem(`rayix_completed_${formId}`);
    sessionStorage.removeItem(`rayix_abandoned_${formId}`);
};

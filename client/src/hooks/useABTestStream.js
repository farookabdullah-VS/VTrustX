import { useAnalyticsStream } from './useAnalyticsStream';
import { useCallback } from 'react';

/**
 * Specialized SSE hook for A/B Testing events
 *
 * Wraps useAnalyticsStream and filters for A/B testing-specific events:
 * - ab_experiment_created
 * - ab_experiment_started
 * - ab_experiment_paused
 * - ab_experiment_completed
 * - ab_variant_assigned
 * - ab_winner_declared
 *
 * @param {number|null} experimentId - Optional experiment ID to filter events (null = all experiments)
 * @param {function} onUpdate - Callback function to handle SSE updates
 * @returns {object} - { connected, error, reconnect }
 */
export function useABTestStream(experimentId, onUpdate) {
    const handleUpdate = useCallback((data) => {
        const abEvents = [
            'ab_experiment_created',
            'ab_experiment_started',
            'ab_experiment_paused',
            'ab_experiment_completed',
            'ab_variant_assigned',
            'ab_winner_declared'
        ];

        // Filter for A/B testing events only
        if (abEvents.includes(data.type)) {
            // If experimentId specified, filter to that experiment only
            if (!experimentId || data.experimentId === experimentId) {
                onUpdate(data);
            }
        }
    }, [experimentId, onUpdate]);

    return useAnalyticsStream(handleUpdate);
}

export default useABTestStream;

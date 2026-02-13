import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

/**
 * Custom React hook for Server-Sent Events (SSE) analytics stream
 *
 * Provides real-time updates for analytics dashboards without polling.
 * Handles connection, reconnection, and error states.
 *
 * @param {function} onUpdate - Callback function called when event received
 * @param {object} options - Configuration options
 * @returns {object} - { connected, error, connectionCount, reconnect }
 */
export function useAnalyticsStream(onUpdate, options = {}) {
    const {
        autoConnect = true,
        reconnectDelay = 3000,
        maxReconnectAttempts = 5
    } = options;

    const [connected, setConnected] = useState(false);
    const [error, setError] = useState(null);
    const [connectionCount, setConnectionCount] = useState(0);

    const eventSourceRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const reconnectTimeoutRef = useRef(null);
    const isManualDisconnectRef = useRef(false);

    /**
     * Connect to SSE stream
     */
    const connect = useCallback(() => {
        // Don't reconnect if manually disconnected
        if (isManualDisconnectRef.current) {
            return;
        }

        // Close existing connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        try {
            // Get CSRF token from cookie
            const csrfToken = document.cookie
                .split('; ')
                .find(row => row.startsWith('__csrf='))
                ?.split('=')[1];

            // Create EventSource with credentials
            const url = '/api/analytics/sse/stream';
            const eventSource = new EventSource(url, {
                withCredentials: true
            });

            eventSourceRef.current = eventSource;

            // Handle connection opened
            eventSource.addEventListener('connected', (event) => {
                const data = JSON.parse(event.data);
                console.log('[SSE] Connected to analytics stream', data);
                setConnected(true);
                setError(null);
                reconnectAttemptsRef.current = 0;
                setConnectionCount(prev => prev + 1);
            });

            // Handle message_sent events
            eventSource.addEventListener('message_sent', (event) => {
                const data = JSON.parse(event.data);
                if (onUpdate) {
                    onUpdate({ type: 'message_sent', ...data });
                }
            });

            // Handle message_status_updated events
            eventSource.addEventListener('message_status_updated', (event) => {
                const data = JSON.parse(event.data);
                if (onUpdate) {
                    onUpdate({ type: 'message_status_updated', ...data });
                }
            });

            // Handle distribution_started events
            eventSource.addEventListener('distribution_started', (event) => {
                const data = JSON.parse(event.data);
                if (onUpdate) {
                    onUpdate({ type: 'distribution_started', ...data });
                }
            });

            // Handle distribution_completed events
            eventSource.addEventListener('distribution_completed', (event) => {
                const data = JSON.parse(event.data);
                if (onUpdate) {
                    onUpdate({ type: 'distribution_completed', ...data });
                }
            });

            // Handle survey_event events
            eventSource.addEventListener('survey_event', (event) => {
                const data = JSON.parse(event.data);
                if (onUpdate) {
                    onUpdate({ type: 'survey_event', ...data });
                }
            });

            // Handle generic message events
            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (onUpdate) {
                        onUpdate(data);
                    }
                } catch (err) {
                    console.error('[SSE] Failed to parse message', err);
                }
            };

            // Handle errors
            eventSource.onerror = (err) => {
                console.error('[SSE] Connection error', err);
                setConnected(false);

                // Only attempt reconnect if not manually disconnected
                if (!isManualDisconnectRef.current) {
                    if (reconnectAttemptsRef.current < maxReconnectAttempts) {
                        reconnectAttemptsRef.current += 1;
                        const delay = reconnectDelay * reconnectAttemptsRef.current;

                        setError(`Connection lost. Reconnecting in ${delay/1000}s... (Attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);

                        reconnectTimeoutRef.current = setTimeout(() => {
                            console.log(`[SSE] Reconnecting... (Attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
                            connect();
                        }, delay);
                    } else {
                        setError('Connection lost. Max reconnect attempts reached. Please refresh the page.');
                        eventSource.close();
                    }
                }
            };

        } catch (err) {
            console.error('[SSE] Failed to create connection', err);
            setError('Failed to establish connection');
            setConnected(false);
        }
    }, [onUpdate, reconnectDelay, maxReconnectAttempts]);

    /**
     * Disconnect from SSE stream
     */
    const disconnect = useCallback(() => {
        isManualDisconnectRef.current = true;

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        setConnected(false);
        console.log('[SSE] Disconnected from analytics stream');
    }, []);

    /**
     * Manually reconnect to SSE stream
     */
    const reconnect = useCallback(() => {
        isManualDisconnectRef.current = false;
        reconnectAttemptsRef.current = 0;
        setError(null);
        connect();
    }, [connect]);

    // Auto-connect on mount if enabled
    useEffect(() => {
        if (autoConnect) {
            isManualDisconnectRef.current = false;
            connect();
        }

        // Cleanup on unmount
        return () => {
            disconnect();
        };
    }, [autoConnect, connect, disconnect]);

    // Fetch connection stats periodically
    useEffect(() => {
        if (!connected) return;

        const fetchStats = async () => {
            try {
                const response = await axios.get('/api/analytics/sse/stats');
                // Store stats if needed (not currently used in UI)
            } catch (err) {
                console.error('[SSE] Failed to fetch stats', err);
            }
        };

        // Fetch stats every 30 seconds
        const interval = setInterval(fetchStats, 30000);
        fetchStats(); // Fetch immediately

        return () => clearInterval(interval);
    }, [connected]);

    return {
        connected,
        error,
        connectionCount,
        reconnect,
        disconnect
    };
}

/**
 * Hook for specific event types
 *
 * @param {string} eventType - Event type to listen for
 * @param {function} onEvent - Callback when event received
 * @returns {object} - { connected, error, reconnect }
 */
export function useAnalyticsEvent(eventType, onEvent) {
    const handleUpdate = useCallback((data) => {
        if (data.type === eventType) {
            onEvent(data);
        }
    }, [eventType, onEvent]);

    return useAnalyticsStream(handleUpdate);
}

export default useAnalyticsStream;

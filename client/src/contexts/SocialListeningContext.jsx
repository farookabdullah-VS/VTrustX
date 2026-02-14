/**
 * Social Listening Context
 *
 * Global state management for Social Listening module
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import socialListeningApi from '../services/socialListeningApi';

const SocialListeningContext = createContext();

export const useSocialListening = () => {
  const context = useContext(SocialListeningContext);
  if (!context) {
    throw new Error('useSocialListening must be used within SocialListeningProvider');
  }
  return context;
};

export const SocialListeningProvider = ({ children }) => {
  // State
  const [sources, setSources] = useState([]);
  const [queries, setQueries] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState({
    sources: false,
    queries: false,
    overview: false
  });
  const [filters, setFilters] = useState({
    platform: null,
    sentiment: null,
    intent: null,
    topic: null,
    status: 'new',
    date_from: null,
    date_to: null
  });

  // Fetch sources
  const fetchSources = async () => {
    setLoading(prev => ({ ...prev, sources: true }));
    try {
      const response = await socialListeningApi.sources.list();
      setSources(response.data);
    } catch (error) {
      console.error('Failed to fetch sources:', error);
    } finally {
      setLoading(prev => ({ ...prev, sources: false }));
    }
  };

  // Fetch queries
  const fetchQueries = async () => {
    setLoading(prev => ({ ...prev, queries: true }));
    try {
      const response = await socialListeningApi.queries.list();
      setQueries(response.data);
    } catch (error) {
      console.error('Failed to fetch queries:', error);
    } finally {
      setLoading(prev => ({ ...prev, queries: false }));
    }
  };

  // Fetch overview
  const fetchOverview = async (dateParams = {}) => {
    setLoading(prev => ({ ...prev, overview: true }));
    try {
      const response = await socialListeningApi.analytics.overview(dateParams);
      setOverview(response.data);
    } catch (error) {
      console.error('Failed to fetch overview:', error);
    } finally {
      setLoading(prev => ({ ...prev, overview: false }));
    }
  };

  // Update filters
  const updateFilters = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      platform: null,
      sentiment: null,
      intent: null,
      topic: null,
      status: 'new',
      date_from: null,
      date_to: null
    });
  };

  // Initial load
  useEffect(() => {
    fetchSources();
    fetchQueries();
    fetchOverview();
  }, []);

  const value = {
    // State
    sources,
    queries,
    overview,
    loading,
    filters,

    // Actions
    fetchSources,
    fetchQueries,
    fetchOverview,
    updateFilters,
    resetFilters,
    setSources,
    setQueries
  };

  return (
    <SocialListeningContext.Provider value={value}>
      {children}
    </SocialListeningContext.Provider>
  );
};

export default SocialListeningContext;

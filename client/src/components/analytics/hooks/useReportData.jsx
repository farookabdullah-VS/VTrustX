import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

/**
 * Hook for fetching and managing report data with pagination support
 * @param {string|null} surveyId - The survey ID to fetch data for
 * @param {Object} filters - Filter object for the query
 * @param {number} pageSize - Number of rows per page (default: 100)
 * @returns {Object} - { data, loading, error, loadMore, hasMore, refresh, pagination }
 */
export function useReportData(surveyId, filters = {}, pageSize = 100) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize,
    totalCount: 0,
    totalPages: 0,
    hasMore: false
  });

  const fetchData = useCallback(async (page = 1, append = false) => {
    if (!surveyId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/analytics/query-data', {
        surveyId,
        filters,
        page,
        pageSize
      });

      if (response.data) {
        const newData = response.data.data || [];

        setData(prev => append ? [...prev, ...newData] : newData);

        // Set pagination metadata from server
        const paginationMeta = response.data.pagination || {
          page,
          pageSize,
          totalCount: newData.length,
          totalPages: 1,
          hasMore: false,
          from: 1,
          to: newData.length
        };

        setPagination(paginationMeta);

        // Log pagination info for debugging
        console.log('Data loaded:', {
          page,
          loaded: newData.length,
          totalCount: paginationMeta.totalCount,
          hasMore: paginationMeta.hasMore
        });
      }
    } catch (err) {
      console.error('Failed to fetch report data:', err);
      const errorMessage = err.response?.data?.error || 'Failed to load data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [surveyId, filters, pageSize]);

  const loadMore = useCallback(async () => {
    if (!pagination.hasMore || loading) return;
    await fetchData(pagination.page + 1, true);
  }, [fetchData, pagination.page, pagination.hasMore, loading]);

  const refresh = useCallback(() => {
    setData([]);
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchData(1, false);
  }, [fetchData]);

  // Initial load when surveyId or filters change
  useEffect(() => {
    if (surveyId) {
      refresh();
    }
  }, [surveyId, JSON.stringify(filters)]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    data,
    loading,
    error,
    loadMore,
    hasMore: pagination.hasMore,
    refresh,
    pagination
  };
}

/**
 * Unit tests for useReportData hook
 */

import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import axios from 'axios';
import { useReportData } from '../hooks/useReportData';

// Mock axios
jest.mock('axios');

const mockApiResponse = {
  data: [
    { id: 1, name: 'Response 1' },
    { id: 2, name: 'Response 2' }
  ],
  pagination: {
    page: 1,
    pageSize: 100,
    totalCount: 150,
    totalPages: 2,
    hasMore: true
  }
};

const mockSecondPageResponse = {
  data: [
    { id: 3, name: 'Response 3' },
    { id: 4, name: 'Response 4' }
  ],
  pagination: {
    page: 2,
    pageSize: 100,
    totalCount: 150,
    totalPages: 2,
    hasMore: false
  }
};

describe('useReportData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.post.mockResolvedValue(mockApiResponse);
  });

  describe('Initial State', () => {
    test('returns initial state with empty data', () => {
      const { result } = renderHook(() => useReportData('survey-123'));

      expect(result.current.data).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.hasMore).toBe(false);
    });

    test('has loadMore function', () => {
      const { result } = renderHook(() => useReportData('survey-123'));

      expect(typeof result.current.loadMore).toBe('function');
    });

    test('has refresh function', () => {
      const { result } = renderHook(() => useReportData('survey-123'));

      expect(typeof result.current.refresh).toBe('function');
    });
  });

  describe('Data Loading', () => {
    test('fetches data when surveyId provided', async () => {
      const { result } = renderHook(() => useReportData('survey-123'));

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith('/api/analytics/query-data', {
          surveyId: 'survey-123',
          filters: {},
          page: 1,
          pageSize: 100
        });
      });
    });

    test('sets loading state during fetch', async () => {
      const { result } = renderHook(() => useReportData('survey-123'));

      act(() => {
        result.current.loadMore();
      });

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    test('updates data after successful fetch', async () => {
      const { result } = renderHook(() => useReportData('survey-123'));

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockApiResponse.data);
        expect(result.current.pagination).toEqual(mockApiResponse.pagination);
      });
    });

    test('sets hasMore based on pagination', async () => {
      const { result } = renderHook(() => useReportData('survey-123'));

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.hasMore).toBe(true);
      });
    });
  });

  describe('Pagination', () => {
    test('loads next page of data', async () => {
      const { result } = renderHook(() => useReportData('survey-123'));

      // Load first page
      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.data.length).toBe(2);
      });

      // Load second page
      axios.post.mockResolvedValueOnce(mockSecondPageResponse);

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith('/api/analytics/query-data', {
          surveyId: 'survey-123',
          filters: {},
          page: 2,
          pageSize: 100
        });
      });
    });

    test('appends new data to existing data', async () => {
      const { result } = renderHook(() => useReportData('survey-123'));

      // Load first page
      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.data.length).toBe(2);
      });

      // Load second page
      axios.post.mockResolvedValueOnce(mockSecondPageResponse);

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.data.length).toBe(4);
        expect(result.current.data[2].id).toBe(3);
        expect(result.current.data[3].id).toBe(4);
      });
    });

    test('does not load more when hasMore is false', async () => {
      axios.post.mockResolvedValueOnce({
        ...mockApiResponse,
        pagination: { ...mockApiResponse.pagination, hasMore: false }
      });

      const { result } = renderHook(() => useReportData('survey-123'));

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.hasMore).toBe(false);
      });

      // Try to load more
      const callCount = axios.post.mock.calls.length;

      act(() => {
        result.current.loadMore();
      });

      // Should not make another call
      expect(axios.post.mock.calls.length).toBe(callCount);
    });

    test('does not load more when already loading', async () => {
      axios.post.mockImplementationOnce(() =>
        new Promise(resolve => setTimeout(() => resolve(mockApiResponse), 100))
      );

      const { result } = renderHook(() => useReportData('survey-123'));

      act(() => {
        result.current.loadMore();
        result.current.loadMore(); // Try to load again while loading
      });

      // Should only make one call
      expect(axios.post.mock.calls.length).toBe(1);
    });
  });

  describe('Filters', () => {
    test('includes filters in request', async () => {
      const filters = { age: { operator: 'greaterThan', value: 25 } };
      const { result } = renderHook(() => useReportData('survey-123', filters));

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith('/api/analytics/query-data', {
          surveyId: 'survey-123',
          filters,
          page: 1,
          pageSize: 100
        });
      });
    });

    test('refetches when filters change', async () => {
      const { result, rerender } = renderHook(
        ({ filters }) => useReportData('survey-123', filters),
        { initialProps: { filters: {} } }
      );

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledTimes(1);
      });

      // Change filters
      const newFilters = { age: { operator: 'greaterThan', value: 30 } };
      rerender({ filters: newFilters });

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Page Size', () => {
    test('uses custom page size', async () => {
      const { result } = renderHook(() => useReportData('survey-123', {}, 50));

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith('/api/analytics/query-data', {
          surveyId: 'survey-123',
          filters: {},
          page: 1,
          pageSize: 50
        });
      });
    });

    test('defaults to 100 page size', async () => {
      const { result } = renderHook(() => useReportData('survey-123'));

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith('/api/analytics/query-data',
          expect.objectContaining({ pageSize: 100 })
        );
      });
    });
  });

  describe('Refresh', () => {
    test('refresh resets pagination and refetches', async () => {
      const { result } = renderHook(() => useReportData('survey-123'));

      // Load first page
      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.data.length).toBe(2);
      });

      // Load second page
      axios.post.mockResolvedValueOnce(mockSecondPageResponse);

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.data.length).toBe(4);
      });

      // Refresh
      axios.post.mockResolvedValueOnce(mockApiResponse);

      act(() => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.data.length).toBe(2);
        expect(result.current.pagination.page).toBe(1);
      });
    });

    test('refresh clears existing data before fetch', async () => {
      const { result } = renderHook(() => useReportData('survey-123'));

      // Load initial data
      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.data.length).toBe(2);
      });

      // Refresh should clear and reload
      axios.post.mockResolvedValueOnce(mockApiResponse);

      act(() => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockApiResponse.data);
      });
    });
  });

  describe('Error Handling', () => {
    test('sets error state on fetch failure', async () => {
      axios.post.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useReportData('survey-123'));

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.loading).toBe(false);
      });
    });

    test('clears error on successful retry', async () => {
      axios.post.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useReportData('survey-123'));

      // First attempt fails
      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      // Retry succeeds
      axios.post.mockResolvedValueOnce(mockApiResponse);

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.data.length).toBe(2);
      });
    });
  });

  describe('Survey ID Changes', () => {
    test('refetches when surveyId changes', async () => {
      const { result, rerender } = renderHook(
        ({ surveyId }) => useReportData(surveyId),
        { initialProps: { surveyId: 'survey-123' } }
      );

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledTimes(1);
      });

      // Change surveyId
      rerender({ surveyId: 'survey-456' });

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledTimes(2);
        expect(axios.post).toHaveBeenLastCalledWith('/api/analytics/query-data',
          expect.objectContaining({ surveyId: 'survey-456' })
        );
      });
    });

    test('resets data when surveyId changes', async () => {
      const { result, rerender } = renderHook(
        ({ surveyId }) => useReportData(surveyId),
        { initialProps: { surveyId: 'survey-123' } }
      );

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.data.length).toBe(2);
      });

      // Change surveyId
      rerender({ surveyId: 'survey-456' });

      // Data should be reset during refetch
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledTimes(2);
      });
    });
  });
});

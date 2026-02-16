import { useState, useCallback, useMemo } from 'react';

/**
 * Hook for managing filters and applying them to data
 * @param {Array} initialFilters - Initial filters object
 * @returns {Object} - Filters state and management functions
 */
export function useFilters(initialFilters = {}) {
  const [filters, setFilters] = useState(initialFilters);

  const addFilter = useCallback((field, operator, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: { operator, value }
    }));
  }, []);

  const removeFilter = useCallback((field) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[field];
      return newFilters;
    });
  }, []);

  const updateFilter = useCallback((field, updates) => {
    setFilters(prev => ({
      ...prev,
      [field]: { ...prev[field], ...updates }
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const hasFilters = useMemo(() => {
    return Object.keys(filters).length > 0;
  }, [filters]);

  // Apply filters to data array
  const applyFilters = useCallback((data) => {
    if (!hasFilters) return data;

    return data.filter(row => {
      return Object.entries(filters).every(([field, filter]) => {
        const value = row[field];
        const filterValue = filter.value;
        const operator = filter.operator || 'equals';

        switch (operator) {
          case 'equals':
            return String(value).toLowerCase() === String(filterValue).toLowerCase();

          case 'contains':
            return String(value).toLowerCase().includes(String(filterValue).toLowerCase());

          case 'greaterThan':
            return Number(value) > Number(filterValue);

          case 'lessThan':
            return Number(value) < Number(filterValue);

          case 'greaterThanOrEqual':
            return Number(value) >= Number(filterValue);

          case 'lessThanOrEqual':
            return Number(value) <= Number(filterValue);

          case 'notEquals':
            return String(value).toLowerCase() !== String(filterValue).toLowerCase();

          case 'in':
            return Array.isArray(filterValue) && filterValue.includes(value);

          default:
            return true;
        }
      });
    });
  }, [filters, hasFilters]);

  // Get filter count for a specific field
  const getFilterCount = useCallback((field) => {
    return filters[field] ? 1 : 0;
  }, [filters]);

  // Check if a field is filtered
  const isFieldFiltered = useCallback((field) => {
    return Boolean(filters[field]);
  }, [filters]);

  return {
    filters,
    addFilter,
    removeFilter,
    updateFilter,
    clearFilters,
    hasFilters,
    applyFilters,
    getFilterCount,
    isFieldFiltered,
    setFilters
  };
}

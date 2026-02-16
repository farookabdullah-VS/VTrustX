import { useState, useCallback } from 'react';

/**
 * Hook for managing report state and layout
 * @param {Object} initialReport - Initial report configuration
 * @returns {Object} - Report state and update functions
 */
export function useReportState(initialReport = null) {
  const [report, setReport] = useState(initialReport);
  const [isDirty, setIsDirty] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState(null);

  const updateReport = useCallback((updates) => {
    setReport(prev => {
      if (!prev) return updates;
      return { ...prev, ...updates };
    });
    setIsDirty(true);
  }, []);

  const updateWidget = useCallback((widgetId, updates) => {
    setReport(prev => {
      if (!prev || !prev.widgets) return prev;

      return {
        ...prev,
        widgets: prev.widgets.map(w =>
          w.id === widgetId ? { ...w, ...updates } : w
        )
      };
    });
    setIsDirty(true);
  }, []);

  const addWidget = useCallback((widget) => {
    setReport(prev => {
      if (!prev) return prev;

      const newWidget = {
        ...widget,
        id: widget.id || `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      return {
        ...prev,
        widgets: [...(prev.widgets || []), newWidget]
      };
    });
    setIsDirty(true);
  }, []);

  const removeWidget = useCallback((widgetId) => {
    setReport(prev => {
      if (!prev || !prev.widgets) return prev;

      return {
        ...prev,
        widgets: prev.widgets.filter(w => w.id !== widgetId)
      };
    });
    setIsDirty(true);

    if (selectedWidget?.id === widgetId) {
      setSelectedWidget(null);
    }
  }, [selectedWidget]);

  const updateLayout = useCallback((newLayout) => {
    setReport(prev => {
      if (!prev) return prev;
      return { ...prev, layout: newLayout };
    });
    setIsDirty(true);
  }, []);

  const markClean = useCallback(() => {
    setIsDirty(false);
  }, []);

  const reset = useCallback(() => {
    setReport(initialReport);
    setIsDirty(false);
    setSelectedWidget(null);
  }, [initialReport]);

  return {
    report,
    isDirty,
    selectedWidget,
    setSelectedWidget,
    updateReport,
    updateWidget,
    addWidget,
    removeWidget,
    updateLayout,
    markClean,
    reset
  };
}

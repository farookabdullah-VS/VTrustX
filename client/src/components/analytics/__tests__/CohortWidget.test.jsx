/**
 * Unit tests for CohortWidget component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import { CohortWidget } from '../widgets/CohortWidget';

// Mock axios
jest.mock('axios');

// Mock Recharts to avoid canvas issues in tests
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }) => <div>{children}</div>,
    BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
    Bar: () => <div data-testid="bar" />,
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: () => <div data-testid="y-axis" />,
    CartesianGrid: () => <div data-testid="grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />
  };
});

const mockCohortData = [
  {
    cohort: '2026-01',
    totalResponses: 150,
    metricValue: 45.5,
    trend: {
      change: 5.2,
      percentChange: 12.88,
      direction: 'up'
    }
  },
  {
    cohort: '2026-02',
    totalResponses: 180,
    metricValue: 50.7,
    trend: {
      change: -3.1,
      percentChange: -5.76,
      direction: 'down'
    }
  },
  {
    cohort: '2026-03',
    totalResponses: 200,
    metricValue: 47.6,
    trend: {
      change: 0,
      percentChange: 0,
      direction: 'flat'
    }
  }
];

const mockWidget = {
  id: 'widget-1',
  type: 'cohort',
  config: {
    title: 'Cohort Analysis',
    metric: 'nps',
    cohortBy: 'month'
  }
};

describe('CohortWidget', () => {
  const surveyId = 'survey-123';

  beforeEach(() => {
    jest.clearAllMocks();
    axios.get.mockResolvedValue({ data: mockCohortData });
  });

  describe('Rendering', () => {
    test('renders loading state initially', () => {
      render(<CohortWidget widget={mockWidget} surveyId={surveyId} />);

      expect(screen.getByText('Loading cohort analysis...')).toBeInTheDocument();
    });

    test('renders cohort analysis title', async () => {
      render(<CohortWidget widget={mockWidget} surveyId={surveyId} />);

      await waitFor(() => {
        expect(screen.getByText('Cohort Analysis')).toBeInTheDocument();
      });
    });

    test('displays metric and cohort period', async () => {
      render(<CohortWidget widget={mockWidget} surveyId={surveyId} />);

      await waitFor(() => {
        expect(screen.getByText('NPS by month')).toBeInTheDocument();
      });
    });

    test('renders chart view by default', async () => {
      const { container } = render(<CohortWidget widget={mockWidget} surveyId={surveyId} />);

      await waitFor(() => {
        expect(container.querySelector('[data-testid="bar-chart"]')).toBeInTheDocument();
      });
    });

    test('displays view mode toggle buttons', async () => {
      render(<CohortWidget widget={mockWidget} surveyId={surveyId} />);

      await waitFor(() => {
        expect(screen.getByText('Chart')).toBeInTheDocument();
        expect(screen.getByText('Table')).toBeInTheDocument();
      });
    });
  });

  describe('Data Fetching', () => {
    test('fetches cohort data on mount', async () => {
      render(<CohortWidget widget={mockWidget} surveyId={surveyId} />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/analytics/cohorts', {
          params: {
            surveyId: 'survey-123',
            metric: 'nps',
            cohortBy: 'month'
          }
        });
      });
    });

    test('does not fetch if surveyId is missing', () => {
      render(<CohortWidget widget={mockWidget} surveyId={null} />);

      expect(axios.get).not.toHaveBeenCalled();
    });

    test('refetches when metric changes', async () => {
      const { rerender } = render(<CohortWidget widget={mockWidget} surveyId={surveyId} />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(1);
      });

      const updatedWidget = {
        ...mockWidget,
        config: { ...mockWidget.config, metric: 'csat' }
      };

      rerender(<CohortWidget widget={updatedWidget} surveyId={surveyId} />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2);
        expect(axios.get).toHaveBeenLastCalledWith('/api/analytics/cohorts', {
          params: {
            surveyId: 'survey-123',
            metric: 'csat',
            cohortBy: 'month'
          }
        });
      });
    });
  });

  describe('View Modes', () => {
    test('switches to table view when table button clicked', async () => {
      render(<CohortWidget widget={mockWidget} surveyId={surveyId} />);

      await waitFor(() => {
        expect(screen.getByText('2026-01')).toBeInTheDocument();
      });

      const tableButton = screen.getByText('Table');
      fireEvent.click(tableButton);

      // Table view should show cohort data in table format
      expect(screen.getByText('Cohort')).toBeInTheDocument();
      expect(screen.getByText('Responses')).toBeInTheDocument();
      expect(screen.getByText('Trend')).toBeInTheDocument();
    });

    test('switches back to chart view', async () => {
      const { container } = render(<CohortWidget widget={mockWidget} surveyId={surveyId} />);

      await waitFor(() => {
        expect(screen.getByText('2026-01')).toBeInTheDocument();
      });

      const tableButton = screen.getByText('Table');
      fireEvent.click(tableButton);

      const chartButton = screen.getByText('Chart');
      fireEvent.click(chartButton);

      expect(container.querySelector('[data-testid="bar-chart"]')).toBeInTheDocument();
    });

    test('highlights active view button', async () => {
      render(<CohortWidget widget={mockWidget} surveyId={surveyId} />);

      await waitFor(() => {
        expect(screen.getByText('2026-01')).toBeInTheDocument();
      });

      const chartButton = screen.getByText('Chart');
      expect(chartButton).toHaveStyle({ background: '#2563eb', color: 'white' });

      const tableButton = screen.getByText('Table');
      fireEvent.click(tableButton);

      expect(tableButton).toHaveStyle({ background: '#2563eb', color: 'white' });
      expect(chartButton).not.toHaveStyle({ background: '#2563eb' });
    });
  });

  describe('Table View', () => {
    test('displays cohort data in table', async () => {
      render(<CohortWidget widget={mockWidget} surveyId={surveyId} />);

      await waitFor(() => {
        expect(screen.getByText('2026-01')).toBeInTheDocument();
      });

      const tableButton = screen.getByText('Table');
      fireEvent.click(tableButton);

      expect(screen.getByText('2026-01')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('45.5')).toBeInTheDocument();
    });

    test('displays trend indicators in table', async () => {
      render(<CohortWidget widget={mockWidget} surveyId={surveyId} />);

      await waitFor(() => {
        expect(screen.getByText('2026-01')).toBeInTheDocument();
      });

      const tableButton = screen.getByText('Table');
      fireEvent.click(tableButton);

      // Should show trend icons for cohorts with trends
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });

    test('formats numbers with localeString', async () => {
      const largeData = [{
        ...mockCohortData[0],
        totalResponses: 1500
      }];

      axios.get.mockResolvedValueOnce({ data: largeData });

      render(<CohortWidget widget={mockWidget} surveyId={surveyId} />);

      await waitFor(() => {
        expect(screen.getByText('2026-01')).toBeInTheDocument();
      });

      const tableButton = screen.getByText('Table');
      fireEvent.click(tableButton);

      expect(screen.getByText('1,500')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('displays error message when fetch fails', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network error'));

      render(<CohortWidget widget={mockWidget} surveyId={surveyId} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load cohort data')).toBeInTheDocument();
      });
    });

    test('retry button refetches data', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network error'));

      render(<CohortWidget widget={mockWidget} surveyId={surveyId} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load cohort data')).toBeInTheDocument();
      });

      axios.get.mockResolvedValueOnce({ data: mockCohortData });

      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('2026-01')).toBeInTheDocument();
      });
    });

    test('displays empty state when no data available', async () => {
      axios.get.mockResolvedValueOnce({ data: [] });

      render(<CohortWidget widget={mockWidget} surveyId={surveyId} />);

      await waitFor(() => {
        expect(screen.getByText('No cohort data available')).toBeInTheDocument();
      });
    });
  });

  describe('Default Config', () => {
    test('uses default metric when not provided', async () => {
      const widgetWithoutMetric = {
        ...mockWidget,
        config: { cohortBy: 'month' }
      };

      render(<CohortWidget widget={widgetWithoutMetric} surveyId={surveyId} />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/analytics/cohorts', {
          params: expect.objectContaining({ metric: 'nps' })
        });
      });
    });

    test('uses default cohortBy when not provided', async () => {
      const widgetWithoutCohortBy = {
        ...mockWidget,
        config: { metric: 'nps' }
      };

      render(<CohortWidget widget={widgetWithoutCohortBy} surveyId={surveyId} />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/analytics/cohorts', {
          params: expect.objectContaining({ cohortBy: 'month' })
        });
      });
    });
  });
});

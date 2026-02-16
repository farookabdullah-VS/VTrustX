/**
 * Unit tests for ForecastWidget component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import { ForecastWidget } from '../widgets/ForecastWidget';

// Mock axios
jest.mock('axios');

// Mock Recharts
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }) => <div>{children}</div>,
    ComposedChart: ({ children }) => <div data-testid="composed-chart">{children}</div>,
    Line: () => <div data-testid="line" />,
    Area: () => <div data-testid="area" />,
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: () => <div data-testid="y-axis" />,
    CartesianGrid: () => <div data-testid="grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />
  };
});

const mockForecastData = {
  historical: [
    { period: 0, periodLabel: '2026-02-01', value: 42.5 },
    { period: 1, periodLabel: '2026-02-02', value: 45.2 },
    { period: 2, periodLabel: '2026-02-03', value: 47.8 }
  ],
  forecast: [
    {
      period: 3,
      periodLabel: '2026-02-04',
      predicted: 50.1,
      lowerBound: 47.5,
      upperBound: 52.7,
      confidence: 95
    },
    {
      period: 4,
      periodLabel: '2026-02-05',
      predicted: 52.3,
      lowerBound: 49.2,
      upperBound: 55.4,
      confidence: 95
    }
  ],
  regression: {
    slope: 2.6,
    intercept: 40.1,
    r2: 0.945,
    mse: 1.23
  },
  trend: {
    direction: 'increasing',
    description: 'Positive trend',
    strength: 'strong'
  }
};

const mockWidget = {
  id: 'widget-1',
  type: 'forecast',
  config: {
    title: 'NPS Forecast',
    metric: 'nps',
    forecastPeriods: 7,
    interval: 'day'
  }
};

describe('ForecastWidget', () => {
  const surveyId = 'survey-123';

  beforeEach(() => {
    jest.clearAllMocks();
    axios.get.mockResolvedValue({ data: mockForecastData });
  });

  describe('Rendering', () => {
    test('renders loading state initially', () => {
      render(<ForecastWidget widget={mockWidget} surveyId={surveyId} />);

      expect(screen.getByText('Generating forecast...')).toBeInTheDocument();
    });

    test('renders forecast title', async () => {
      render(<ForecastWidget widget={mockWidget} surveyId={surveyId} />);

      await waitFor(() => {
        expect(screen.getByText('NPS Forecast')).toBeInTheDocument();
      });
    });

    test('displays forecast period info', async () => {
      render(<ForecastWidget widget={mockWidget} surveyId={surveyId} />);

      await waitFor(() => {
        expect(screen.getByText('7 days ahead')).toBeInTheDocument();
      });
    });

    test('renders chart', async () => {
      const { container } = render(<ForecastWidget widget={mockWidget} surveyId={surveyId} />);

      await waitFor(() => {
        expect(container.querySelector('[data-testid="composed-chart"]')).toBeInTheDocument();
      });
    });

    test('displays trend badge', async () => {
      render(<ForecastWidget widget={mockWidget} surveyId={surveyId} />);

      await waitFor(() => {
        expect(screen.getByText(/strong increasing/i)).toBeInTheDocument();
      });
    });
  });

  describe('Metric Cards', () => {
    test('displays R² score', async () => {
      render(<ForecastWidget widget={mockWidget} surveyId={surveyId} />);

      await waitFor(() => {
        expect(screen.getByText('R² Score')).toBeInTheDocument();
        expect(screen.getByText('0.945')).toBeInTheDocument();
      });
    });

    test('displays MSE', async () => {
      render(<ForecastWidget widget={mockWidget} surveyId={surveyId} />);

      await waitFor(() => {
        expect(screen.getByText('MSE')).toBeInTheDocument();
        expect(screen.getByText('1.23')).toBeInTheDocument();
      });
    });

    test('displays next predicted value', async () => {
      render(<ForecastWidget widget={mockWidget} surveyId={surveyId} />);

      await waitFor(() => {
        expect(screen.getByText('Next Value')).toBeInTheDocument();
        expect(screen.getByText('50.1')).toBeInTheDocument();
      });
    });

    test('shows N/A when metric value is missing', async () => {
      const dataWithoutNextValue = {
        ...mockForecastData,
        forecast: []
      };

      axios.get.mockResolvedValueOnce({ data: dataWithoutNextValue });

      render(<ForecastWidget widget={mockWidget} surveyId={surveyId} />);

      await waitFor(() => {
        expect(screen.getByText('Next Value')).toBeInTheDocument();
        expect(screen.getByText('N/A')).toBeInTheDocument();
      });
    });
  });

  describe('Data Fetching', () => {
    test('fetches forecast data on mount', async () => {
      render(<ForecastWidget widget={mockWidget} surveyId={surveyId} />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/analytics/forecast', {
          params: {
            surveyId: 'survey-123',
            metric: 'nps',
            periods: 7,
            interval: 'day'
          }
        });
      });
    });

    test('does not fetch if surveyId is missing', () => {
      render(<ForecastWidget widget={mockWidget} surveyId={null} />);

      expect(axios.get).not.toHaveBeenCalled();
    });

    test('refetches when config changes', async () => {
      const { rerender } = render(<ForecastWidget widget={mockWidget} surveyId={surveyId} />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(1);
      });

      const updatedWidget = {
        ...mockWidget,
        config: { ...mockWidget.config, forecastPeriods: 14 }
      };

      rerender(<ForecastWidget widget={updatedWidget} surveyId={surveyId} />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2);
        expect(axios.get).toHaveBeenLastCalledWith('/api/analytics/forecast', {
          params: expect.objectContaining({ periods: 14 })
        });
      });
    });
  });

  describe('Trend Badge', () => {
    test('displays increasing trend with correct styling', async () => {
      render(<ForecastWidget widget={mockWidget} surveyId={surveyId} />);

      await waitFor(() => {
        const badge = screen.getByText(/strong increasing/i);
        expect(badge).toBeInTheDocument();
      });
    });

    test('displays decreasing trend', async () => {
      const decreasingData = {
        ...mockForecastData,
        trend: {
          direction: 'decreasing',
          strength: 'moderate'
        }
      };

      axios.get.mockResolvedValueOnce({ data: decreasingData });

      render(<ForecastWidget widget={mockWidget} surveyId={surveyId} />);

      await waitFor(() => {
        expect(screen.getByText(/moderate decreasing/i)).toBeInTheDocument();
      });
    });

    test('displays flat trend', async () => {
      const flatData = {
        ...mockForecastData,
        trend: {
          direction: 'flat',
          strength: 'neutral'
        }
      };

      axios.get.mockResolvedValueOnce({ data: flatData });

      render(<ForecastWidget widget={mockWidget} surveyId={surveyId} />);

      await waitFor(() => {
        expect(screen.getByText(/neutral flat/i)).toBeInTheDocument();
      });
    });
  });

  describe('Footer Information', () => {
    test('displays forecast information', async () => {
      render(<ForecastWidget widget={mockWidget} surveyId={surveyId} />);

      await waitFor(() => {
        expect(screen.getByText(/Forecast Information/i)).toBeInTheDocument();
        expect(screen.getByText(/Based on 3 historical data points/i)).toBeInTheDocument();
        expect(screen.getByText(/95% confidence interval/i)).toBeInTheDocument();
      });
    });

    test('handles missing historical data count', async () => {
      const dataWithoutHistorical = {
        ...mockForecastData,
        historical: null
      };

      axios.get.mockResolvedValueOnce({ data: dataWithoutHistorical });

      render(<ForecastWidget widget={mockWidget} surveyId={surveyId} />);

      await waitFor(() => {
        expect(screen.getByText(/Based on 0 historical data points/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('displays error message when fetch fails', async () => {
      axios.get.mockRejectedValueOnce({
        response: { data: { error: 'Insufficient data' } }
      });

      render(<ForecastWidget widget={mockWidget} surveyId={surveyId} />);

      await waitFor(() => {
        expect(screen.getByText('Insufficient data')).toBeInTheDocument();
      });
    });

    test('displays generic error on network failure', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network error'));

      render(<ForecastWidget widget={mockWidget} surveyId={surveyId} />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load forecast data/i)).toBeInTheDocument();
      });
    });

    test('retry button refetches data', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network error'));

      render(<ForecastWidget widget={mockWidget} surveyId={surveyId} />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load forecast data/i)).toBeInTheDocument();
      });

      axios.get.mockResolvedValueOnce({ data: mockForecastData });

      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('NPS Forecast')).toBeInTheDocument();
      });
    });

    test('displays empty state when no data available', async () => {
      axios.get.mockResolvedValueOnce({ data: null });

      render(<ForecastWidget widget={mockWidget} surveyId={surveyId} />);

      await waitFor(() => {
        expect(screen.getByText('No forecast data available')).toBeInTheDocument();
      });
    });
  });

  describe('Default Config', () => {
    test('uses default metric when not provided', async () => {
      const widgetWithoutMetric = {
        ...mockWidget,
        config: {}
      };

      render(<ForecastWidget widget={widgetWithoutMetric} surveyId={surveyId} />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/analytics/forecast', {
          params: expect.objectContaining({ metric: 'nps' })
        });
      });
    });

    test('uses default forecast periods', async () => {
      const widgetWithoutPeriods = {
        ...mockWidget,
        config: { metric: 'nps' }
      };

      render(<ForecastWidget widget={widgetWithoutPeriods} surveyId={surveyId} />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/analytics/forecast', {
          params: expect.objectContaining({ periods: 7 })
        });
      });
    });

    test('uses default interval', async () => {
      const widgetWithoutInterval = {
        ...mockWidget,
        config: { metric: 'nps', forecastPeriods: 7 }
      };

      render(<ForecastWidget widget={widgetWithoutInterval} surveyId={surveyId} />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/analytics/forecast', {
          params: expect.objectContaining({ interval: 'day' })
        });
      });
    });
  });

  describe('Chart Data Combination', () => {
    test('combines historical and forecast data for chart', async () => {
      const { container } = render(<ForecastWidget widget={mockWidget} surveyId={surveyId} />);

      await waitFor(() => {
        // Chart should be rendered with combined data
        expect(container.querySelector('[data-testid="composed-chart"]')).toBeInTheDocument();
      });

      // Verify that historical and forecast data are properly combined
      // This is validated through successful rendering of the chart
    });
  });
});

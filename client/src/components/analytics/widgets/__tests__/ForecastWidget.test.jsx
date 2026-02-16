/**
 * Unit tests for ForecastWidget component
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import { ForecastWidget } from '../ForecastWidget';

jest.mock('axios');

describe('ForecastWidget', () => {
  const mockForecastData = {
    historical: [
      { period: 0, periodLabel: '2024-01-01', value: 70 },
      { period: 1, periodLabel: '2024-01-02', value: 72 },
      { period: 2, periodLabel: '2024-01-03', value: 75 },
      { period: 3, periodLabel: '2024-01-04', value: 73 },
      { period: 4, periodLabel: '2024-01-05', value: 76 }
    ],
    forecast: [
      { period: 5, periodLabel: '2024-01-06', predicted: 77, lowerBound: 72, upperBound: 82, confidence: 95 },
      { period: 6, periodLabel: '2024-01-07', predicted: 78, lowerBound: 73, upperBound: 83, confidence: 95 },
      { period: 7, periodLabel: '2024-01-08', predicted: 79, lowerBound: 74, upperBound: 84, confidence: 95 }
    ],
    regression: {
      slope: 1.2,
      intercept: 70,
      r2: 0.85,
      mse: 2.3
    },
    trend: {
      direction: 'increasing',
      description: 'Positive trend',
      strength: 'moderate'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render loading state', () => {
    axios.post.mockImplementation(() => new Promise(() => {}));

    render(
      <ForecastWidget
        surveyId="test-123"
        metric="nps"
        periods={7}
        interval="day"
      />
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('should fetch and display forecast data', async () => {
    axios.post.mockResolvedValue({ data: mockForecastData });

    render(
      <ForecastWidget
        surveyId="test-123"
        metric="nps"
        periods={7}
        interval="day"
      />
    );

    await waitFor(() => {
      // Should show historical and forecast data
      expect(screen.getByText(/forecast/i)).toBeInTheDocument();
    });
  });

  test('should display predicted values', async () => {
    axios.post.mockResolvedValue({ data: mockForecastData });

    render(
      <ForecastWidget
        surveyId="test-123"
        metric="nps"
        periods={3}
        interval="day"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/77/)).toBeInTheDocument();
    });
  });

  test('should show confidence intervals', async () => {
    axios.post.mockResolvedValue({ data: mockForecastData });

    render(
      <ForecastWidget
        surveyId="test-123"
        metric="nps"
        periods={3}
        interval="day"
      />
    );

    await waitFor(() => {
      // Confidence interval bounds should be visible
      expect(screen.getByText(/95%/)).toBeInTheDocument();
    });
  });

  test('should display trend information', async () => {
    axios.post.mockResolvedValue({ data: mockForecastData });

    render(
      <ForecastWidget
        surveyId="test-123"
        metric="nps"
        periods={7}
        interval="day"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/positive trend/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/moderate/i)).toBeInTheDocument();
  });

  test('should make API call with correct parameters', async () => {
    axios.post.mockResolvedValue({ data: mockForecastData });

    render(
      <ForecastWidget
        surveyId="survey-789"
        metric="csat"
        periods={14}
        interval="week"
      />
    );

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        '/api/analytics/forecast',
        expect.objectContaining({
          surveyId: 'survey-789',
          metric: 'csat',
          periods: 14,
          interval: 'week'
        })
      );
    });
  });

  test('should render chart with historical and forecast data', async () => {
    axios.post.mockResolvedValue({ data: mockForecastData });

    const { container } = render(
      <ForecastWidget
        surveyId="test-123"
        metric="nps"
        periods={7}
        interval="day"
      />
    );

    await waitFor(() => {
      // Recharts creates an SVG
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  test('should display regression metrics', async () => {
    axios.post.mockResolvedValue({ data: mockForecastData });

    render(
      <ForecastWidget
        surveyId="test-123"
        metric="nps"
        periods={7}
        interval="day"
      />
    );

    await waitFor(() => {
      // R² should be displayed
      expect(screen.getByText(/0\.85/)).toBeInTheDocument();
    });
  });

  test('should handle API error', async () => {
    axios.post.mockRejectedValue(new Error('Forecast failed'));

    render(
      <ForecastWidget
        surveyId="test-123"
        metric="nps"
        periods={7}
        interval="day"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  test('should handle insufficient data error', async () => {
    axios.post.mockRejectedValue(
      new Error('Insufficient data for forecasting')
    );

    render(
      <ForecastWidget
        surveyId="test-123"
        metric="nps"
        periods={7}
        interval="day"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/insufficient data/i)).toBeInTheDocument();
    });
  });

  test('should support different intervals', async () => {
    axios.post.mockResolvedValue({ data: mockForecastData });

    const { rerender } = render(
      <ForecastWidget
        surveyId="test-123"
        metric="nps"
        periods={7}
        interval="day"
      />
    );

    await waitFor(() => {
      expect(axios.post).toHaveBeenLastCalledWith(
        '/api/analytics/forecast',
        expect.objectContaining({ interval: 'day' })
      );
    });

    rerender(
      <ForecastWidget
        surveyId="test-123"
        metric="nps"
        periods={7}
        interval="month"
      />
    );

    await waitFor(() => {
      expect(axios.post).toHaveBeenLastCalledWith(
        '/api/analytics/forecast',
        expect.objectContaining({ interval: 'month' })
      );
    });
  });

  test('should update forecast when periods change', async () => {
    axios.post.mockResolvedValue({ data: mockForecastData });

    const { rerender } = render(
      <ForecastWidget
        surveyId="test-123"
        metric="nps"
        periods={7}
        interval="day"
      />
    );

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledTimes(1);
    });

    rerender(
      <ForecastWidget
        surveyId="test-123"
        metric="nps"
        periods={14}
        interval="day"
      />
    );

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledTimes(2);
      expect(axios.post).toHaveBeenLastCalledWith(
        '/api/analytics/forecast',
        expect.objectContaining({ periods: 14 })
      );
    });
  });

  test('should show decreasing trend', async () => {
    const decreasingData = {
      ...mockForecastData,
      trend: {
        direction: 'decreasing',
        description: 'Negative trend',
        strength: 'strong'
      }
    };

    axios.post.mockResolvedValue({ data: decreasingData });

    render(
      <ForecastWidget
        surveyId="test-123"
        metric="nps"
        periods={7}
        interval="day"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/negative trend/i)).toBeInTheDocument();
      expect(screen.getByText(/strong/i)).toBeInTheDocument();
    });
  });

  test('should show flat trend', async () => {
    const flatData = {
      ...mockForecastData,
      trend: {
        direction: 'flat',
        description: 'No significant trend',
        strength: 'neutral'
      }
    };

    axios.post.mockResolvedValue({ data: flatData });

    render(
      <ForecastWidget
        surveyId="test-123"
        metric="nps"
        periods={7}
        interval="day"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/no significant trend/i)).toBeInTheDocument();
    });
  });
});

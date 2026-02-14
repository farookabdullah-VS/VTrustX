/**
 * Sentiment Trend Chart - Line chart showing sentiment over time
 */

import React, { useState, useEffect } from 'react';
import { useSocialListening } from '../../../contexts/SocialListeningContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import LoadingSpinner from '../../common/LoadingSpinner';
import socialListeningApi from '../../../services/socialListeningApi';

const SentimentTrendChart = ({ dateRange }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const daysAgo = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const dateFrom = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      const response = await socialListeningApi.analytics.sentimentTrend({
        date_from: dateFrom.toISOString().split('T')[0],
        date_to: now.toISOString().split('T')[0]
      });

      // Transform data for Recharts
      const chartData = response.data.map(item => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        positive: parseFloat(item.avg_sentiment_positive || 0).toFixed(2),
        neutral: parseFloat(item.avg_sentiment_neutral || 0).toFixed(2),
        negative: parseFloat(item.avg_sentiment_negative || 0).toFixed(2),
        overall: parseFloat(item.avg_sentiment || 0).toFixed(2)
      }));

      setData(chartData);
    } catch (error) {
      console.error('Failed to fetch sentiment trend:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '350px' }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '350px',
        color: '#adb5bd',
        fontSize: '14px'
      }}>
        No sentiment data available for this period
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '350px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#6c757d', fontSize: 12 }}
            stroke="#dee2e6"
          />
          <YAxis
            domain={[-1, 1]}
            tick={{ fill: '#6c757d', fontSize: 12 }}
            stroke="#dee2e6"
            label={{
              value: 'Sentiment Score',
              angle: -90,
              position: 'insideLeft',
              style: { fill: '#6c757d', fontSize: 12 }
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #dee2e6',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
            labelStyle={{ color: '#495057', fontWeight: 600, marginBottom: '8px' }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
          />
          <Line
            type="monotone"
            dataKey="positive"
            name="Positive"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: '#10b981', r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="neutral"
            name="Neutral"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ fill: '#f59e0b', r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="negative"
            name="Negative"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ fill: '#ef4444', r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="overall"
            name="Overall"
            stroke="#667eea"
            strokeWidth={3}
            dot={{ fill: '#667eea', r: 4 }}
            activeDot={{ r: 6 }}
            strokeDasharray="5 5"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SentimentTrendChart;

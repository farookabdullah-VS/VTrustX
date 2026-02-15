/**
 * Volume Trend Chart - Stacked area chart showing mention volume by platform
 */

import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import socialListeningApi from '../../../services/socialListeningApi';

const VolumeTrendChart = ({ dateRange }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [platforms, setPlatforms] = useState([]);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const daysAgo = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const dateFrom = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      const response = await socialListeningApi.analytics.volumeTrend({
        date_from: dateFrom.toISOString().split('T')[0],
        date_to: now.toISOString().split('T')[0]
      });

      // Extract unique platforms
      const platformSet = new Set();
      response.data.forEach(item => {
        if (item.by_platform && Array.isArray(item.by_platform)) {
          item.by_platform.forEach(p => platformSet.add(p.platform));
        }
      });
      const uniquePlatforms = Array.from(platformSet);
      setPlatforms(uniquePlatforms);

      // Transform data for Recharts (stacked format)
      const chartData = response.data.map(item => {
        const point = {
          date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          total: item.total_mentions || 0
        };

        // Add each platform as a separate key
        if (item.by_platform && Array.isArray(item.by_platform)) {
          item.by_platform.forEach(p => {
            point[p.platform] = p.count;
          });
        }

        // Fill missing platforms with 0
        uniquePlatforms.forEach(platform => {
          if (!point[platform]) {
            point[platform] = 0;
          }
        });

        return point;
      });

      setData(chartData);
    } catch (error) {
      console.error('Failed to fetch volume trend:', error);
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
        No volume data available for this period
      </div>
    );
  }

  // Platform colors
  const platformColors = {
    twitter: '#1DA1F2',
    facebook: '#4267B2',
    instagram: '#E4405F',
    linkedin: '#0077B5',
    youtube: '#FF0000',
    tiktok: '#000000',
    reddit: '#FF4500',
    pinterest: '#E60023'
  };

  return (
    <div style={{ width: '100%', height: '350px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <defs>
            {platforms.map((platform, index) => (
              <linearGradient key={platform} id={`color${platform}`} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={platformColors[platform] || `hsl(${index * 60}, 70%, 50%)`}
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor={platformColors[platform] || `hsl(${index * 60}, 70%, 50%)`}
                  stopOpacity={0.1}
                />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#6c757d', fontSize: 12 }}
            stroke="#dee2e6"
          />
          <YAxis
            tick={{ fill: '#6c757d', fontSize: 12 }}
            stroke="#dee2e6"
            label={{
              value: 'Mentions',
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
            iconType="rect"
          />
          {platforms.map((platform, index) => (
            <Area
              key={platform}
              type="monotone"
              dataKey={platform}
              name={platform.charAt(0).toUpperCase() + platform.slice(1)}
              stackId="1"
              stroke={platformColors[platform] || `hsl(${index * 60}, 70%, 50%)`}
              fill={`url(#color${platform})`}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default VolumeTrendChart;

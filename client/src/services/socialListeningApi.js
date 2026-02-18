/**
 * Social Listening API Service
 *
 * All API calls to /api/v1/social-listening/*
 */

import axios from '../axiosConfig';

const BASE_URL = '/api/v1/social-listening';

// ============================================================================
// SOURCES - Platform Connections
// ============================================================================

export const socialListeningApi = {
  // Sources
  sources: {
    list: () => axios.get(`${BASE_URL}/sources`),

    create: (data) => axios.post(`${BASE_URL}/sources`, data),

    update: (id, data) => axios.put(`${BASE_URL}/sources/${id}`, data),

    delete: (id) => axios.delete(`${BASE_URL}/sources/${id}`),

    test: (id) => axios.post(`${BASE_URL}/sources/${id}/test`),

    sync: (id) => axios.post(`${BASE_URL}/sources/${id}/sync`)
  },

  // Queries (Keywords/Brands to listen for)
  queries: {
    list: () => axios.get(`${BASE_URL}/queries`),

    create: (data) => axios.post(`${BASE_URL}/queries`, data),

    update: (id, data) => axios.put(`${BASE_URL}/queries/${id}`, data),

    delete: (id) => axios.delete(`${BASE_URL}/queries/${id}`)
  },

  // Mentions (Core mention data)
  mentions: {
    list: (params) => axios.get(`${BASE_URL}/mentions`, { params }),

    get: (id) => axios.get(`${BASE_URL}/mentions/${id}`),

    update: (id, data) => axios.put(`${BASE_URL}/mentions/${id}`, data),

    respond: (id, data) => axios.post(`${BASE_URL}/mentions/${id}/respond`, data),

    import: (data) => axios.post(`${BASE_URL}/mentions/import`, data)
  },

  // Analytics
  analytics: {
    overview: (params) => axios.get(`${BASE_URL}/analytics/overview`, { params }),

    sentimentTrend: (params) => axios.get(`${BASE_URL}/analytics/sentiment-trend`, { params }),

    volumeTrend: (params) => axios.get(`${BASE_URL}/analytics/volume-trend`, { params }),

    topics: (params) => axios.get(`${BASE_URL}/analytics/topics`, { params }),

    geo: (params) => axios.get(`${BASE_URL}/analytics/geo`, { params }),

    shareOfVoice: (params) => axios.get(`${BASE_URL}/analytics/share-of-voice`, { params }),

    campaignImpact: (params) => axios.get(`${BASE_URL}/analytics/campaign-impact`, { params })
  },

  // Influencers
  influencers: {
    list: (params) => axios.get(`${BASE_URL}/influencers`, { params }),

    get: (id) => axios.get(`${BASE_URL}/influencers/${id}`)
  },

  // Competitors
  competitors: {
    list: () => axios.get(`${BASE_URL}/competitors`),

    create: (data) => axios.post(`${BASE_URL}/competitors`, data),

    update: (id, data) => axios.put(`${BASE_URL}/competitors/${id}`, data),

    delete: (id) => axios.delete(`${BASE_URL}/competitors/${id}`),

    benchmarks: () => axios.get(`${BASE_URL}/competitors/benchmarks`)
  },

  // Alerts
  alerts: {
    list: () => axios.get(`${BASE_URL}/alerts`),

    create: (data) => axios.post(`${BASE_URL}/alerts`, data),

    update: (id, data) => axios.put(`${BASE_URL}/alerts/${id}`, data),

    delete: (id) => axios.delete(`${BASE_URL}/alerts/${id}`),

    events: {
      list: (params) => axios.get(`${BASE_URL}/alerts/events`, { params }),

      action: (id, status) => axios.put(`${BASE_URL}/alerts/events/${id}`, { status })
    }
  },

  // Export
  export: {
    mentions: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return `${BASE_URL}/export/mentions?${qs}`;
    },
    influencers: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return `${BASE_URL}/export/influencers?${qs}`;
    },
    analytics: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return `${BASE_URL}/export/analytics?${qs}`;
    }
  },

  // Responses
  responses: {
    list: (params) => axios.get(`${BASE_URL}/responses`, { params }),

    create: (data) => axios.post(`${BASE_URL}/responses`, data),

    update: (id, data) => axios.put(`${BASE_URL}/responses/${id}`, data),

    delete: (id) => axios.delete(`${BASE_URL}/responses/${id}`),

    send: (id) => axios.post(`${BASE_URL}/responses/${id}/send`),

    aiGenerate: (data) => axios.post(`${BASE_URL}/responses/ai-generate`, data)
  }
};

export default socialListeningApi;

import { useState } from 'react'
import { Survey } from 'survey-react-ui'
import { Model } from 'survey-core'
import 'survey-core/defaultV2.min.css'
import './App.css'

// VTrustX API Client
class VTrustXClient {
  constructor(baseURL) {
    this.baseURL = baseURL
    this.token = null
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include'
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
    this.token = data.token
    return data
  }

  async getForms() {
    return this.request('/forms')
  }

  async getForm(id) {
    return this.request(`/forms/${id}`)
  }

  async submitForm(id, data) {
    return this.request('/submissions', {
      method: 'POST',
      body: JSON.stringify({
        formId: id,
        data,
        metadata: { platform: 'react', userAgent: navigator.userAgent }
      })
    })
  }
}

function App() {
  const [client] = useState(() => new VTrustXClient('/api'))
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [surveys, setSurveys] = useState([])
  const [currentSurvey, setCurrentSurvey] = useState(null)
  const [surveyModel, setSurveyModel] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.target)
    const email = formData.get('email')
    const password = formData.get('password')

    try {
      await client.login(email, password)
      setIsAuthenticated(true)

      // Load surveys
      const surveysData = await client.getForms()
      setSurveys(surveysData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectSurvey = async (surveyId) => {
    setLoading(true)
    setError(null)
    setSubmitted(false)

    try {
      const surveyData = await client.getForm(surveyId)
      setCurrentSurvey(surveyData)

      // Create SurveyJS model
      const model = new Model(surveyData.definition)

      // Handle completion
      model.onComplete.add(async (sender) => {
        try {
          await client.submitForm(surveyId, sender.data)
          setSubmitted(true)
          setSurveyModel(null)
        } catch (err) {
          setError('Failed to submit: ' + err.message)
        }
      })

      setSurveyModel(model)
    } catch (err) {
      setError('Failed to load survey: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBackToList = () => {
    setCurrentSurvey(null)
    setSurveyModel(null)
    setSubmitted(false)
    setError(null)
  }

  if (!isAuthenticated) {
    return (
      <div className="container">
        <div className="auth-card">
          <h1>🔐 VTrustX Survey</h1>
          <p>React Example - Login to continue</p>

          {error && <div className="error">{error}</div>}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                defaultValue="admin@vtrustx.com"
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                defaultValue="admin123"
                required
              />
            </div>

            <button type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="container">
        <div className="success-card">
          <h1>✅ Thank You!</h1>
          <p>Your response has been submitted successfully.</p>
          <button onClick={handleBackToList}>Take Another Survey</button>
        </div>
      </div>
    )
  }

  if (surveyModel) {
    return (
      <div className="container">
        <div className="survey-header">
          <button onClick={handleBackToList} className="back-button">
            ← Back to Surveys
          </button>
          <h2>{currentSurvey?.title}</h2>
        </div>

        {error && <div className="error">{error}</div>}

        <div className="survey-container">
          <Survey model={surveyModel} />
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="survey-list-header">
        <h1>📋 Available Surveys</h1>
        <p>Select a survey to begin</p>
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="loading">Loading surveys...</div>
      ) : (
        <div className="survey-grid">
          {surveys.map((survey) => (
            <div key={survey.id} className="survey-card">
              <h3>{survey.title}</h3>
              <p className="survey-id">ID: {survey.id}</p>
              {survey.description && (
                <p className="survey-desc">{survey.description}</p>
              )}
              <button onClick={() => handleSelectSurvey(survey.id)}>
                Take Survey →
              </button>
            </div>
          ))}

          {surveys.length === 0 && (
            <p className="no-surveys">No surveys available</p>
          )}
        </div>
      )}
    </div>
  )
}

export default App

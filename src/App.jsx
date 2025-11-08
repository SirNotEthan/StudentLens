import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AnalyticsProvider } from './contexts/AnalyticsContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import MainPage from './pages/MainPage'
import Profile from './pages/Profile'
import UserProfile from './pages/UserProfile'
import AccountSettings from './pages/AccountSettings'
import AuthCallback from './pages/AuthCallback'
import AccountSetup from './pages/AccountSetup'
import Welcome from './pages/Welcome'
import Analytics from './components/Analytics'
import AdminPanel from './pages/AdminPanel'
import WriteArticle from './pages/WriteArticle'
import PostDetail from './pages/PostDetail'
import AboutUs from './pages/AboutUs'
import ContactUs from './pages/ContactUs'
import TermsPrivacy from './pages/TermsPrivacy'
import ApplyWriter from './pages/ApplyWriter'
import NotFound from './pages/NotFound'

function App() {
  return (
    <AuthProvider>
      <AnalyticsProvider>
        <Router>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/setup" element={<AccountSetup />} />
          <Route
            path="/main"
            element={
              <ProtectedRoute>
                <MainPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account-settings"
            element={
              <ProtectedRoute>
                <AccountSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPanel />
              </ProtectedRoute>
            }
          />
          <Route
            path="/write"
            element={
              <ProtectedRoute>
                <WriteArticle />
              </ProtectedRoute>
            }
          />
          <Route
            path="/write/:id"
            element={
              <ProtectedRoute>
                <WriteArticle />
              </ProtectedRoute>
            }
          />
          <Route
            path="/post/:id"
            element={
              <ProtectedRoute>
                <PostDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/:username"
            element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/about"
            element={
              <ProtectedRoute>
                <AboutUs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contact"
            element={
              <ProtectedRoute>
                <ContactUs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/terms-privacy"
            element={
              <ProtectedRoute>
                <TermsPrivacy />
              </ProtectedRoute>
            }
          />
          <Route
            path="/apply-writer"
            element={
              <ProtectedRoute>
                <ApplyWriter />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/main" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
      </AnalyticsProvider>
    </AuthProvider>
  )
}

export default App
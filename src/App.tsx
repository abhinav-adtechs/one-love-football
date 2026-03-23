import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import OtpVerifyPage from './pages/OtpVerifyPage'
import ProfileSetupPage from './pages/ProfileSetupPage'
import DashboardPage from './pages/DashboardPage'
import PaymentsPage from './pages/PaymentsPage'
import PaymentApprovalPage from './pages/PaymentApprovalPage'
import MatchBillingPage from './pages/MatchBillingPage'
import MatchCreatePage from './pages/MatchCreatePage'
import MatchDetailPage from './pages/MatchDetailPage'
import CommunityPage from './pages/CommunityPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/verify" element={<OtpVerifyPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/profile-setup" element={<ProfileSetupPage />} />
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/payments/approve" element={<PaymentApprovalPage />} />
          <Route path="/matches/new" element={<MatchCreatePage />} />
          <Route path="/matches/:matchId" element={<MatchDetailPage />} />
          <Route path="/matches/:matchId/billing" element={<MatchBillingPage />} />
          <Route path="/community" element={<CommunityPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LoadingProvider } from './context/LoadingContext'
import GlobalLoader        from './components/GlobalLoader'
import Landing             from './pages/Landing'
import Dashboard           from './pages/Dashboard'
import AdminDashboard      from './pages/AdminDashboard'
import AllTickets          from './pages/AllTickets'
import MyTickets           from './pages/MyTickets'
import TicketDetail        from './pages/TicketDetail'
import ReportedTickets     from './pages/ReportedTickets'

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/" replace />
}

function DefaultDashboard() {
  const { user } = useAuth()
  return user?.roles?.includes('ROLE_ADMIN') ? <AdminDashboard /> : <AllTickets />
}

export default function App() {
  return (
    <AuthProvider>
      <LoadingProvider>
        <GlobalLoader />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>}>
              <Route index element={<DefaultDashboard />} />
              <Route path="tickets"          element={<AllTickets />} />
              <Route path="tickets/:id"      element={<TicketDetail />} />
              <Route path="my-tickets"       element={<MyTickets />} />
              <Route path="reported-tickets" element={<ReportedTickets />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </LoadingProvider>
    </AuthProvider>
  )
}
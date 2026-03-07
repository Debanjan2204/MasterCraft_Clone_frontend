import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Landing          from './pages/Landing'
import Dashboard        from './pages/Dashboard'
import AdminDashboard   from './pages/AdminDashboard'
import AllTickets       from './pages/AllTickets'
import MyTickets        from './pages/MyTickets'
import TicketDetail     from './pages/TicketDetail'
import ReportedTickets  from './pages/ReportedTickets'

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/" replace />
}

// Renders admin overview or all tickets depending on role
function DefaultDashboard() {
  const { user } = useAuth()
  return user?.roles?.includes('ROLE_ADMIN')
    ? <AdminDashboard />
    : <AllTickets />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>}>
            {/* Default: admin → overview, others → all tickets */}
            <Route index element={<DefaultDashboard />} />
            {/* Explicit all-tickets route (used by admin nav + admin overview links) */}
            <Route path="tickets"     element={<AllTickets />} />
            <Route path="tickets/:id" element={<TicketDetail />} />
            <Route path="my-tickets"       element={<MyTickets />} />
            <Route path="reported-tickets" element={<ReportedTickets />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
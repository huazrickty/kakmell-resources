import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import AppLayout from '@/components/layout/AppLayout'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Pending from '@/pages/Pending'
import Dashboard from '@/pages/Dashboard'
import Events from '@/pages/Events'
import NewEvent from '@/pages/events/NewEvent'
import EventDetail from '@/pages/events/EventDetail'
import Ingredients from '@/pages/Ingredients'
import Checklist from '@/pages/Checklist'
import Invoices from '@/pages/Invoices'
import NewInvoice from '@/pages/invoices/NewInvoice'
import InvoiceDetail from '@/pages/invoices/InvoiceDetail'
import Settings from '@/pages/Settings'

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-[#1B4332]" />
    </div>
  )
}

function RequireAuth() {
  const { user, userDoc, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (!userDoc || userDoc.role === 'pending') return <Navigate to="/pending" replace />
  return <Outlet />
}

function PublicOnly() {
  const { user, userDoc, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user) return <Outlet />
  if (!userDoc || userDoc.role === 'pending') return <Navigate to="/pending" replace />
  return <Navigate to="/dashboard" replace />
}

export const router = createBrowserRouter([
  {
    element: <PublicOnly />,
    children: [
      { path: '/login', element: <Login /> },
      { path: '/register', element: <Register /> },
    ],
  },
  {
    path: '/pending',
    element: <Pending />,
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard',   element: <Dashboard /> },
          { path: '/events/new',  element: <NewEvent /> },
          { path: '/events/:id',  element: <EventDetail /> },
          { path: '/events',      element: <Events /> },
          { path: '/ingredients', element: <Ingredients /> },
          { path: '/checklist',   element: <Checklist /> },
          { path: '/invoices/new', element: <NewInvoice /> },
          { path: '/invoices/:id', element: <InvoiceDetail /> },
          { path: '/invoices',    element: <Invoices /> },
          { path: '/settings',    element: <Settings /> },
        ],
      },
    ],
  },
])

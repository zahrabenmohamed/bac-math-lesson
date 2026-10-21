import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom'
import { Layout } from './components/Layout'
import { useAuthenticated } from './lib/auth'
import { ChapterMap } from './pages/ChapterMap'
import { Home } from './pages/Home'
import { LessonPlayer } from './pages/LessonPlayer'
import { Login } from './pages/Login'
import { Mistakes } from './pages/Mistakes'
import { Profile } from './pages/Profile'

function RequireAuth() {
  return useAuthenticated() ? <Outlet /> : <Navigate to="/connexion" replace />
}

const router = createBrowserRouter([
  { path: '/connexion', element: <Login /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: '/', element: <Home /> },
          { path: '/chapitres/:id', element: <ChapterMap /> },
          { path: '/erreurs', element: <Mistakes /> },
          { path: '/profil', element: <Profile /> },
        ],
      },
      { path: '/lecons/:id', element: <LessonPlayer /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}

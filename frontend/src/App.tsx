import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ChapterMap } from './pages/ChapterMap'
import { LessonPlayer } from './pages/LessonPlayer'
import { Mistakes } from './pages/Mistakes'
import { Profile } from './pages/Profile'

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <ChapterMap /> },
      { path: '/erreurs', element: <Mistakes /> },
      { path: '/profil', element: <Profile /> },
    ],
  },
  { path: '/lecons/:id', element: <LessonPlayer /> },
])

export default function App() {
  return <RouterProvider router={router} />
}

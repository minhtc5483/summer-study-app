import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import Login from './pages/Login'
import ParentDashboard from './pages/ParentDashboard'
import Students from './pages/parent/Students'
import KidsHome from './pages/kids/KidsHome'
import Quiz from './pages/kids/Quiz'

import Home from './pages/Home'

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: "login", element: <Login /> },
      { 
        path: "parent", 
        element: <ParentDashboard />,
        children: [
          { index: true, element: <div>Overview Content</div> },
          { path: "students", element: <Students /> },
          { path: "subjects", element: <div>Subjects Management</div> },
          { path: "settings", element: <div>Settings</div> },
        ]
      },
      { 
        path: "kids",
        children: [
          { index: true, element: <KidsHome /> },
          { path: "quiz/:subject", element: <Quiz /> },
        ]
      },
    ]
  }
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)

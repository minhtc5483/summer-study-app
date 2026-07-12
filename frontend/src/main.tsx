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
import Overview from './pages/parent/Overview'
import StudentDetailStats from './pages/parent/StudentDetailStats'
import Settings from './pages/parent/Settings'
import QuestionBank from './pages/parent/QuestionBank'
import SubjectExams from './pages/kids/SubjectExams'
import Rewards from './pages/kids/Rewards'

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
          { index: true, element: <Overview /> },
          { path: "students", element: <Students /> },
          { path: "students/:id/stats", element: <StudentDetailStats /> },
          { path: "question-bank", element: <QuestionBank /> },
          { path: "settings", element: <Settings /> },
        ]
      },
      { 
        path: "kids",
        children: [
          { index: true, element: <KidsHome /> },
          { path: "subject/:subjectId", element: <SubjectExams /> },
          { path: "quiz/:examId", element: <Quiz /> },
          { path: "rewards", element: <Rewards /> }
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

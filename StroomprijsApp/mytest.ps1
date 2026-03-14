# Quick fix - overwrite main.jsx with the safe version
Set-Content "C:\Users\kvmou\OneDrive\Documents\GitHub\Smart Energy\StroomprijsApp\frontend\src\main.jsx" @"
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
"@

cd "C:\Users\kvmou\OneDrive\Documents\GitHub\Smart Energy"
git add StroomprijsApp/frontend/src/main.jsx
git add StroomprijsApp/frontend/src/pages/AdminDashboard.jsx
git add StroomprijsApp/frontend/src/App.jsx
git add StroomprijsApp/frontend/src/pages/AuthPage.jsx
git add StroomprijsApp/frontend/src/pages/Dashboard.jsx
git commit -m "fix: revert main.jsx, add AdminDashboard - fix blank page"
git push origin main
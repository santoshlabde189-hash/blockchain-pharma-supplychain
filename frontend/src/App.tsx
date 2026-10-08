import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { PublicVerify } from './pages/PublicVerify';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { apiRequest } from './services/api';

export function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const data = await apiRequest('/auth/me');
          setUser(data.user);
        } catch {
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    }
    checkAuth();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Initializing PharmaTrace...</div>;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="font-bold text-xl text-blue-600">PharmaTrace</span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                Blockchain Supply Chain
              </span>
            </div>
            <nav className="flex items-center space-x-4 text-sm font-medium">
              <Link to="/verify" className="text-slate-600 hover:text-blue-600">
                Public Verify
              </Link>
              {user ? (
                <>
                  <Link to="/dashboard" className="text-slate-600 hover:text-blue-600">
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-rose-600 hover:text-rose-700 font-semibold"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link to="/login" className="text-blue-600 hover:text-blue-700">
                  Login
                </Link>
              )}
            </nav>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/verify" element={<PublicVerify />} />
            <Route
              path="/login"
              element={user ? <Navigate to="/dashboard" /> : <Login onLogin={setUser} />}
            />
            <Route
              path="/dashboard"
              element={user ? <Dashboard user={user} /> : <Navigate to="/login" />}
            />
            <Route path="*" element={<Navigate to="/verify" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;

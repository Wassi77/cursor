import { Routes, Route, Navigate } from 'react-router-dom';
import { useThemeStore } from './store/themeStore';
import { useEffect } from 'react';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import VideoPractice from './pages/VideoPractice';
import SessionReview from './pages/SessionReview';
import ExportDownload from './pages/ExportDownload';
import Settings from './pages/Settings';

function App() {
  const { theme } = useThemeStore();

  // Apply theme to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [theme]);

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-neutral-900' : 'bg-neutral-50'}`}>
      <Navigation />
      <main className="container mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/practice/:sessionId" element={<VideoPractice />} />
          <Route path="/review/:sessionId" element={<SessionReview />} />
          <Route path="/export/:sessionId" element={<ExportDownload />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;

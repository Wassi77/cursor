/**
 * Navigation component
 * Main navigation bar with links to all pages
 */

import { Link, useLocation } from 'react-router-dom';
import { Film, Mic, Download, Settings, Home } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';

const Navigation = () => {
  const location = useLocation();
  const { theme, toggleTheme } = useThemeStore();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/practice/:sessionId', label: 'Practice', icon: Mic, disabled: true },
    { path: '/review/:sessionId', label: 'Review', icon: Film, disabled: true },
    { path: '/export/:sessionId', label: 'Export', icon: Download, disabled: true },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  // Check if current path is a dynamic route
  const isActivePath = (path: string) => {
    if (path.includes(':')) {
      const base = path.split('/:')[0];
      return location.pathname.startsWith(base);
    }
    return location.pathname === path;
  };

  return (
    <nav className="bg-neutral-800 border-b border-neutral-700 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Film className="w-8 h-8 text-primary-500" />
            <span className="text-xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
              Movie Mimic
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActivePath(item.path);
              const isDisabled = item.disabled && !location.pathname.includes(item.path.split('/:')[0]);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : isDisabled
                      ? 'text-neutral-500 cursor-not-allowed'
                      : 'text-neutral-300 hover:bg-neutral-700 hover:text-white'
                  }`}
                  aria-disabled={isDisabled}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 transition-colors duration-200"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <span className="text-xl">☀️</span>
            ) : (
              <span className="text-xl">🌙</span>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;

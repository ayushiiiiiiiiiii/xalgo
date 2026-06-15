import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const NavigationHeader = () => {
  const { user, logoutAction } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!user) return null;

  const handleLogout = async () => {
    setIsOpen(false);
    await logoutAction();
    navigate('/login');
  };

  const handleProfileNavigation = () => {
    setIsOpen(false);
    navigate('/profile');
  };

  return (
    <header className="w-full bg-white/[0.03] backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <div 
        className="flex items-center gap-2 cursor-pointer select-none group" 
        onClick={() => navigate('/dashboard')}
      >
        <span className="text-xl font-black tracking-widest font-sans text-blue-500 group-hover:text-blue-400 transition-colors duration-300">
          XALGO
        </span>
      </div>

      <div className="relative" ref={dropdownRef}>
        {}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/[0.03] border border-white/10 hover:border-white/20 focus:outline-none transition-all duration-300 relative group cursor-pointer"
          aria-expanded={isOpen}
          aria-haspopup="menu"
        >
          <span className="text-sm font-semibold text-[#F9FAFB] uppercase">
            {user.username ? user.username.charAt(0) : 'U'}
          </span>
        </button>

        {}
        {isOpen && (
          <div
            className="absolute right-0 mt-2.5 w-60 rounded-xl bg-black/85 backdrop-blur-xl border border-white/10 p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.6)] z-50 flex flex-col gap-0.5"
            role="menu"
          >
            {}
            <div className="px-3 py-2 border-b border-white/10 mb-1">
              <span className="block text-xs font-bold text-[#F9FAFB] truncate">{user.username}</span>
              <span className="block text-[10px] text-[#6B7280] truncate mt-0.5">{user.email}</span>
            </div>

            <button
              onClick={handleProfileNavigation}
              className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-[#F9FAFB] hover:bg-[#2563EB]/10 hover:text-blue-400 transition-colors duration-200 cursor-pointer flex items-center gap-2"
              role="menuitem"
            >
              <svg className="w-4 h-4 text-blue-500/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profile
            </button>

            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors duration-200 cursor-pointer flex items-center gap-2"
              role="menuitem"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Log Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default NavigationHeader;

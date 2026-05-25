import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const LoginView = () => {
  const { loginAction } = useAuth();
  const navigate = useNavigate();
  
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const credentials = isRegister 
        ? { username, email, password }
        : { identifier: username, password }; // username acts as identifier field in login

      await loginAction(credentials, isRegister);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Access denied. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] bg-dot-grid text-[#F9FAFB] flex flex-col items-center justify-center p-4 relative select-none font-sans overflow-hidden">
      
      {/* Subtle ambient light backdrops */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-blue-600/[0.03] blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-purple-600/[0.03] blur-[150px] pointer-events-none" />

      {/* Main Console Box */}
      <div className="w-full max-w-md bg-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-blue-500/20 rounded-2xl p-8 shadow-[0_8px_30px_rgba(0,0,0,0.5)] relative overflow-hidden transition-all duration-500 hover:shadow-[0_0_40px_rgba(59,130,246,0.05)]">
        
        {/* Subtle top light line to give the card a premium finish */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
        
        <div className="text-center mb-8 mt-2">
          <div className="inline-block text-xs text-blue-400 border border-blue-500/20 bg-blue-500/5 px-8 py-2 rounded font-bold uppercase tracking-wider mb-4">
            XALGO 
          </div>
          <h1 className="text-2xl font-extrabold uppercase tracking-wider text-[#F9FAFB]">
           {isRegister ? 'Sign Up' : 'Sign In'}
          </h1>
        </div>

        {error && (
          <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] rounded-xl p-4 text-xs mb-6 flex items-start gap-2.5 animate-fadeIn">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <span className="font-bold block uppercase tracking-wide mb-0.5">Authentication Error</span>
              {error}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#6B7280] font-bold mb-2">
              {isRegister ? 'Username' : 'Username / Email'}
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={isRegister ? 'e.g. CodeCommander' : 'e.g. xyz@gmail.com'}
              className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#F9FAFB] placeholder-[#6B7280]/60 focus:outline-none focus:border-blue-500 transition duration-300"
            />
          </div>

          {isRegister && (
            <div className="animate-fadeIn">
              <label className="block text-xs uppercase tracking-wider text-[#6B7280] font-bold mb-2">
                Email 
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. xyz@gmail.com"
                className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#F9FAFB] placeholder-[#6B7280]/60 focus:outline-none focus:border-blue-500 transition duration-300"
              />
            </div>
          )}

          <div>
            <label className="block text-xs uppercase tracking-wider text-[#6B7280] font-bold mb-2">
              Password 
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#F9FAFB] placeholder-[#6B7280]/60 focus:outline-none focus:border-blue-500 transition duration-300"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full glow-btn bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 px-4 rounded-xl text-sm transition duration-300 uppercase tracking-wider cursor-pointer disabled:opacity-50 disabled:pointer-events-none mt-2 shadow-[0_4px_20px_rgba(37,99,235,0.2)]"
          >
             {loading ? (isRegister ? 'Creating Account...' : 'Signing In...') : isRegister ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-white/10 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-xs text-[#6B7280] hover:text-[#F9FAFB] uppercase tracking-wider underline cursor-pointer decoration-[#223147] bg-transparent border-none"
          >
             {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default LoginView;

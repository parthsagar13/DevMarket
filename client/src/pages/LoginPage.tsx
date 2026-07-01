import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Layers, KeyRound, Mail, Loader2 } from 'lucide-react';
import { apiService } from '../services/api.ts';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>('admin@codemarket.ai');
  const [password, setPassword] = useState<string>('Admin@123');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    // If already logged in, redirect immediately to dashboard
    if (localStorage.getItem('token')) {
      navigate('/admin');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      const data = await apiService.login(email, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('admin', JSON.stringify(data.admin));
      toast.success('Admin login successful!');
      navigate('/admin');
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50/70 px-4 py-12 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md space-y-6 rounded-xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        {/* Branding Header */}
        <div className="text-center">
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950">
            <div className="w-3 h-3 bg-white rotate-45"></div>
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">
            Admin Access Portal
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Enter admin credentials to manage market templates
          </p>
        </div>

        {/* Form */}
        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@codemarket.ai"
                  className="block w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <KeyRound className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full h-10 items-center justify-center rounded-lg bg-slate-950 text-xs font-bold text-white transition-colors hover:bg-slate-800 focus:outline-none disabled:bg-slate-700"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </div>
        </form>

        {/* Helpful Info Panel */}
        <div className="rounded-lg bg-slate-50 border border-slate-150 p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Default credentials for evaluation
          </p>
          <div className="mt-2.5 grid grid-cols-2 text-[11px] font-mono text-slate-600 gap-2 border-t border-slate-200/60 pt-2.5">
            <div>
              <span className="text-slate-400 block font-sans font-bold text-[9px] uppercase tracking-wider mb-0.5">EMAIL</span>
              admin@codemarket.ai
            </div>
            <div>
              <span className="text-slate-400 block font-sans font-bold text-[9px] uppercase tracking-wider mb-0.5">PASSWORD</span>
              Admin@123
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldX, ArrowLeft, Lock } from 'lucide-react';

export const AccessDeniedPage: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full glass-panel p-8 rounded-2xl border border-red-500/30 text-center space-y-4 shadow-2xl">
        <div className="inline-flex p-4 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
          <ShieldX className="w-10 h-10" />
        </div>

        <h1 className="text-xl font-black text-white">Access Denied</h1>
        
        <p className="text-xs text-slate-300 leading-relaxed">
          Your current user role does not possess permissions to execute this operational modification.
          Consequential actions such as verifying incidents, editing coordinates, and merging clusters require Coordinator or Administrator authorization.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-all"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Switch Role / Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
};


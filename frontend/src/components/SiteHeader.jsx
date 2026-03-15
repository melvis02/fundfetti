import React from 'react';
import { Link } from 'react-router-dom';

export default function SiteHeader() {
    return (
        <header className="bg-white border-b border-slate-200">
            <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2 group">
                    <span className="text-2xl" role="img" aria-label="party popper">🎉</span>
                    <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-teal-600 transition-colors">
                        Fundfetti
                    </span>
                </Link>
                
                <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
                    <Link to="/about" className="hover:text-teal-600 transition-colors">
                        About
                    </Link>
                    <Link to="/login" className="hover:text-teal-600 transition-colors">
                        Admin Login
                    </Link>
                </nav>
            </div>
        </header>
    );
}

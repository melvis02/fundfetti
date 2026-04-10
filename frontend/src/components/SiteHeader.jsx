import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

export default function SiteHeader() {
    const { isDarkMode, toggleTheme } = useTheme();
    return (
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
            <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2 group">
                    <span className="text-2xl" role="img" aria-label="party popper">🎉</span>
                    <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                        Fundfetti
                    </span>
                </Link>
                
                <nav className="flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
                    <button
                        onClick={toggleTheme}
                        className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors text-lg leading-none"
                        title="Toggle Dark Mode"
                    >
                        {isDarkMode ? '☀️' : '🌙'}
                    </button>
                    <Link to="/about" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                        About
                    </Link>
                    <Link to="/login" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                        Admin Login
                    </Link>
                </nav>
            </div>
        </header>
    );
}

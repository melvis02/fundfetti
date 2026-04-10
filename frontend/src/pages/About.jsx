import React from 'react';
import { Link } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';

export default function About() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-100 flex flex-col transition-colors duration-200">
            <SiteHeader />
            <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white">
                <div className="container mx-auto px-6 py-12 text-center">
                    <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight drop-shadow-sm">
                        About Fundfetti
                    </h1>
                </div>
            </div>

            <div className="container mx-auto px-6 py-12 flex-grow max-w-3xl">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 transition-colors">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">What is Fundfetti?</h2>
                    <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                        Fundfetti is an open-source platform designed to help local schools, clubs, and organizations 
                        manage their fundraisers online. It provides a simple, beautiful, and easy-to-use interface 
                        for supporters to purchase items and for organizers to track their progress.
                    </p>

                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Open Source</h2>
                    <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                        Fundfetti is proudly open-source. You can view the code, report issues, or contribute 
                        to the project on GitHub.
                    </p>
                    
                    <a 
                        href="https://github.com/melvis02/fundfetti" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-slate-800 hover:bg-slate-700 transition duration-150 ease-in-out"
                    >
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                        </svg>
                        View on GitHub
                    </a>
                    
                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 flex justify-center">
                        <Link to="/" className="text-teal-600 font-semibold hover:text-teal-700 transition-colors">
                            &larr; Back to Home
                        </Link>
                    </div>
                </div>
            </div>

            <footer className="bg-slate-900 text-slate-400 py-8 text-center text-sm mt-auto">
                <div className="container mx-auto px-6">
                    <p>&copy; {new Date().getFullYear()} Fundfetti. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}

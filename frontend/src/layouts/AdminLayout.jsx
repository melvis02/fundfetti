import React from 'react';
import { Outlet, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function AdminLayout() {
    const { orgs, currentOrg, setCurrentOrg, loading } = useAdmin();
    const { user, logout } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">Loading Admin Config...</div>;

    if (location.pathname === '/admin' || location.pathname === '/admin/') {
        if (currentOrg) {
            return <Navigate to={`/admin/organizations/${currentOrg.id}`} replace />;
        } else if (user?.role === 'global_admin') {
            return <Navigate to="/admin/organizations" replace />;
        }
    }

    const navClass = (path) => `px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === path
        ? 'bg-slate-900 text-white'
        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
        }`;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-white transition-colors duration-200">
            {/* Top Navigation Bar */}
            <nav className="bg-slate-800 text-white shadow-md">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row items-center justify-between py-3 gap-4 md:gap-0 min-h-[4rem]">
                        {/* Left: Brand & Primary Nav */}
                        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 w-full md:w-auto">
                            <div className="flex-shrink-0">
                                <span className="text-xl font-bold tracking-tight">🎉 Fundfetti Admin</span>
                            </div>
                            <div className="flex flex-wrap justify-center gap-2">
                                {currentOrg && (
                                    <Link to={`/admin/organizations/${currentOrg.id}`} className={navClass(`/admin/organizations/${currentOrg.id}`)}>
                                        Current Org ({currentOrg.slug})
                                    </Link>
                                )}
                                {user?.role === 'global_admin' && (
                                    <>
                                        <Link to="/admin/organizations" className={navClass('/admin/organizations')}>All Orgs</Link>
                                        <Link to="/admin/users" className={navClass('/admin/users')}>Users</Link>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Right: Org Switcher & User Profile */}
                        <div className="flex flex-wrap items-center justify-center gap-4 w-full md:w-auto">
                            {orgs.length > 0 && user?.role === 'global_admin' ? (
                                <div className="relative">
                                    <select
                                        className="appearance-none bg-slate-700 border border-slate-600 text-white py-1.5 pl-3 pr-8 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 max-w-[200px] truncate"
                                        value={currentOrg?.id || ''}
                                        onChange={(e) => {
                                            const selected = orgs.find(o => o.id === parseInt(e.target.value));
                                            if (selected) {
                                                setCurrentOrg(selected);
                                                navigate(`/admin/organizations/${selected.id}`);
                                            }
                                        }}
                                    >
                                        {orgs.map(org => (
                                            <option key={org.id} value={org.id}>{org.name}</option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            ) : (
                                <span className="text-sm text-slate-400">No Orgs Found</span>
                            )}
                            <div className="flex items-center gap-3 pl-4 border-l border-slate-700">
                                <div className="text-xs text-right hidden lg:block">
                                    <div className="font-medium text-white">{user?.email}</div>
                                    <div className="text-slate-400 capitalize">{user?.role?.replace('_', ' ')}</div>
                                </div>
                                <button
                                    onClick={toggleTheme}
                                    className="p-1.5 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors text-lg line-height-[1]"
                                    title="Toggle Dark Mode"
                                >
                                    {isDarkMode ? '☀️' : '🌙'}
                                </button>
                                <button
                                    onClick={logout}
                                    className="p-1.5 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                                    title="Logout"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 01-3-3h4a3 3 0 01 3 3v1" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content Area */}
            <main>
                <Outlet />
            </main>
        </div>
    );
}

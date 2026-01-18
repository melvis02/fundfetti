import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';

export default function AdminLayout() {
    const { orgs, currentOrg, setCurrentOrg, loading } = useAdmin();
    const location = useLocation();

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Loading Admin Config...</div>;

    const navClass = (path) => `px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === path
        ? 'bg-slate-900 text-white'
        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
        }`;

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* Top Navigation Bar */}
            <nav className="bg-slate-800 text-white shadow-md">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between h-16">
                        {/* Left: Brand & Primary Nav */}
                        <div className="flex items-center gap-8">
                            <div className="flex-shrink-0">
                                <span className="text-xl font-bold tracking-tight">🎉 Fundfetti Admin</span>
                            </div>
                            <div className="hidden md:block">
                                <div className="flex items-baseline space-x-4">
                                    <Link to="/admin" className={navClass('/admin')}>Orders Dashboard</Link>
                                    {currentOrg && (
                                        <Link to={`/admin/organizations/${currentOrg.id}`} className={navClass(`/admin/organizations/${currentOrg.id}`)}>
                                            Current Org ({currentOrg.slug})
                                        </Link>
                                    )}
                                    <Link to="/admin/organizations" className={navClass('/admin/organizations')}>All Orgs</Link>
                                </div>
                            </div>
                        </div>

                        {/* Right: Org Switcher & User Profile (Placeholder) */}
                        <div className="flex items-center gap-4">
                            {orgs.length > 0 ? (
                                <div className="relative">
                                    <select
                                        className="appearance-none bg-slate-700 border border-slate-600 text-white py-1.5 pl-3 pr-8 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
                                        value={currentOrg?.id || ''}
                                        onChange={(e) => {
                                            const selected = orgs.find(o => o.id === parseInt(e.target.value));
                                            if (selected) setCurrentOrg(selected);
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
                            <div className="h-8 w-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-medium">
                                AD
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

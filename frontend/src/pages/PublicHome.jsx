import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

export default function PublicHome() {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchCampaigns = async () => {
            try {
                const data = await api.getPublicCampaigns();
                setCampaigns(data);
            } catch (err) {
                console.error(err);
                setError('Failed to load campaigns.');
            } finally {
                setLoading(false);
            }
        };
        fetchCampaigns();
    }, []);

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white">
                <div className="container mx-auto px-6 py-20 text-center">
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 drop-shadow-sm">
                        Support Local Growth
                    </h1>
                    <p className="text-lg md:text-xl text-teal-100 max-w-2xl mx-auto mb-10">
                        Purchase beautiful plants and support your local schools, clubs, and organizations.
                        Find an active campaign below to get started.
                    </p>
                    <a href="#campaigns" className="inline-block bg-white text-teal-700 font-bold py-3 px-8 rounded-full shadow-lg hover:bg-teal-50 hover:shadow-xl transition-all transform hover:-translate-y-1">
                        Find a Campaign
                    </a>
                </div>
            </div>

            {/* Campaign List */}
            <div id="campaigns" className="container mx-auto px-6 py-16">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl font-bold text-slate-900 mb-8 border-l-4 border-teal-500 pl-4">Active Campaigns</h2>

                    {loading && (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
                        </div>
                    )}

                    {!loading && error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center">{error}</div>
                    )}

                    {!loading && !error && campaigns.length === 0 && (
                        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-200">
                            <p className="text-slate-500 text-lg">No active campaigns at the moment. Please check back later!</p>
                        </div>
                    )}

                    <div className="grid gap-6 md:grid-cols-2">
                        {campaigns.map(campaign => (
                            <Link
                                key={campaign.id}
                                to={`/c/${campaign.id}`}
                                className="group block bg-white rounded-xl shadow-sm hover:shadow-md border border-slate-200 overflow-hidden transition-all duration-300 hover:border-teal-300 transform hover:-translate-y-1"
                            >
                                <div className="h-3 bg-gradient-to-r from-teal-400 to-emerald-400 group-hover:h-4 transition-all"></div>
                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-teal-700 transition-colors">
                                        {campaign.name}
                                    </h3>
                                    <p className="text-slate-500 text-sm mb-4 line-clamp-2">
                                        {campaign.description || "Support this fundraiser by purchasing quality plants."}
                                    </p>

                                    <div className="flex items-center justify-between text-sm">
                                        <div className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                                            Ends: <span className="font-semibold">{formatDate(campaign.end_date)}</span>
                                        </div>
                                        <span className="text-teal-600 font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center">
                                            Order Now <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-slate-900 text-slate-400 py-8 text-center text-sm">
                <div className="container mx-auto px-6">
                    <p>&copy; {new Date().getFullYear()} Fundfetti. All rights reserved.</p>
                    <div className="mt-4 space-x-4">
                        <Link to="/login" className="hover:text-white transition-colors">Admin Login</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}

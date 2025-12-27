import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Link } from 'react-router-dom';

export default function Organizations() {
    const [orgs, setOrgs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newOrg, setNewOrg] = useState({ name: '', slug: '', contact_email: '' });
    const [createLoading, setCreateLoading] = useState(false);

    useEffect(() => {
        fetchOrgs();
    }, []);

    const fetchOrgs = async () => {
        try {
            const data = await api.getOrganizations();
            setOrgs(data || []);
        } catch (error) {
            console.error("Failed to fetch organizations", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setCreateLoading(true);
        try {
            await api.createOrganization(newOrg);
            setNewOrg({ name: '', slug: '', contact_email: '' });
            fetchOrgs();
        } catch (error) {
            alert('Failed to create organization');
        } finally {
            setCreateLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-slate-200">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Organizations</h1>
                        <Link to="/" className="text-primary-600 hover:text-primary-700 font-medium text-sm">
                            ← Back to Dashboard
                        </Link>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 py-8">
                {/* Create Form */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4">Add New Organization</h2>
                    <form onSubmit={handleCreate} className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                            <input
                                type="text"
                                required
                                className="w-full rounded-lg border-slate-200 focus:border-primary-500 focus:ring-primary-500"
                                placeholder="Acme Corp"
                                value={newOrg.name}
                                onChange={e => setNewOrg({ ...newOrg, name: e.target.value })}
                            />
                        </div>
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
                            <input
                                type="text"
                                required
                                className="w-full rounded-lg border-slate-200 focus:border-primary-500 focus:ring-primary-500"
                                placeholder="acme-corp"
                                value={newOrg.slug}
                                onChange={e => setNewOrg({ ...newOrg, slug: e.target.value })}
                            />
                        </div>
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Contact Email</label>
                            <input
                                type="email"
                                required
                                className="w-full rounded-lg border-slate-200 focus:border-primary-500 focus:ring-primary-500"
                                placeholder="admin@acme.com"
                                value={newOrg.contact_email}
                                onChange={e => setNewOrg({ ...newOrg, contact_email: e.target.value })}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={createLoading}
                            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 min-w-[120px]"
                        >
                            {createLoading ? 'Adding...' : 'Add Org'}
                        </button>
                    </form>
                </div>

                {/* List */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Slug</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-500">Loading...</td></tr>
                            ) : orgs.length === 0 ? (
                                <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-500">No organizations found.</td></tr>
                            ) : (
                                orgs.map(org => (
                                    <tr key={org.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{org.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-500">{org.slug}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-500">{org.contact_email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <Link
                                                to={`/organizations/${org.id}`}
                                                className="text-primary-600 hover:text-primary-900 font-medium"
                                            >
                                                Manage →
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

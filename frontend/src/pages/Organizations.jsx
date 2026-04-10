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

    const [editingOrg, setEditingOrg] = useState(null);

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this organization? This action cannot be undone and will delete all associated campaigns and products.")) return;
        try {
            await api.deleteOrganization(id);
            fetchOrgs();
        } catch (error) {
            console.error(error);
            alert('Failed to delete organization');
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await api.updateOrganization(editingOrg.id, editingOrg);
            setEditingOrg(null);
            fetchOrgs();
        } catch (error) {
            console.error(error);
            alert('Failed to update organization');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-200">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700 transition-colors">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Organizations</h1>
                        <Link to="/" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium text-sm transition-colors">
                            ← Back to Dashboard
                        </Link>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 py-8">
                {/* Create Form */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8 transition-colors">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Add New Organization</h2>
                    <form onSubmit={handleCreate} className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
                            <input
                                type="text"
                                required
                                className="w-full rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-primary-500 focus:ring-primary-500 transition-colors"
                                placeholder="Acme Corp"
                                value={newOrg.name}
                                onChange={e => setNewOrg({ ...newOrg, name: e.target.value })}
                            />
                        </div>
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Slug</label>
                            <input
                                type="text"
                                required
                                className="w-full rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-primary-500 focus:ring-primary-500 transition-colors"
                                placeholder="acme-corp"
                                value={newOrg.slug}
                                onChange={e => setNewOrg({ ...newOrg, slug: e.target.value })}
                            />
                        </div>
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contact Email</label>
                            <input
                                type="email"
                                required
                                className="w-full rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-primary-500 focus:ring-primary-500 transition-colors"
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
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
                    <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Slug</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
                            {loading ? (
                                <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">Loading...</td></tr>
                            ) : orgs.length === 0 ? (
                                <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">No organizations found.</td></tr>
                            ) : (
                                orgs.map(org => (
                                    <tr key={org.id} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900 dark:text-white">{org.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400">{org.slug}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400">{org.contact_email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right flex justify-end gap-3 items-center">
                                            <button onClick={() => setEditingOrg(org)} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-sm font-medium transition-colors">Edit</button>
                                            <button onClick={() => handleDelete(org.id)} className="text-red-500 hover:text-red-700 dark:hover:text-red-400 text-sm font-medium transition-colors">Delete</button>
                                            <Link
                                                to={`/admin/organizations/${org.id}`}
                                                className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300 font-medium text-sm transition-colors"
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

            {/* Edit Modal */}
            {editingOrg && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl dark:shadow-2xl max-w-lg w-full p-6 transition-colors">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Organization</h3>
                            <button onClick={() => setEditingOrg(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-2xl leading-none transition-colors">&times;</button>
                        </div>
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-primary-500 focus:ring-primary-500 transition-colors"
                                    value={editingOrg.name}
                                    onChange={e => setEditingOrg({ ...editingOrg, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Slug</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-primary-500 focus:ring-primary-500 transition-colors"
                                    value={editingOrg.slug}
                                    onChange={e => setEditingOrg({ ...editingOrg, slug: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contact Email</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-primary-500 focus:ring-primary-500 transition-colors"
                                    value={editingOrg.contact_email}
                                    onChange={e => setEditingOrg({ ...editingOrg, contact_email: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setEditingOrg(null)} className="px-4 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-colors">Cancel</button>
                                <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium transition-colors">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

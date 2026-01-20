import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function UserModal({ user, onClose, onSave, orgs, currentOrg }) {
    const { user: currentUser } = useAuth();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        role: 'reader',
        org_id: currentOrg ? currentOrg.id : (orgs.length > 0 ? orgs[0].id : '')
    });

    useEffect(() => {
        if (user) {
            setFormData({
                email: user.email,
                password: '', // Password not shown
                role: user.role,
                org_id: user.org_id || ''
            });
        }
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Convert org_id to int/null
        const data = {
            ...formData,
            org_id: formData.org_id ? parseInt(formData.org_id) : null
        };
        onSave(data);
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="text-xl font-semibold text-gray-900">
                        {user ? 'Edit User' : 'Add New User'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <span className="sr-only">Close</span>
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            name="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Password {user && <span className="text-gray-500 font-normal">(Leave blank to keep current)</span>}
                        </label>
                        <input
                            type="password"
                            name="password"
                            required={!user}
                            value={formData.password}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Role</label>
                        <select
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                        >
                            <option value="reader">Reader</option>
                            <option value="org_admin">Organization Admin</option>
                            {currentUser?.role === 'global_admin' && (
                                <option value="global_admin">Global Admin</option>
                            )}
                        </select>
                    </div>

                    {formData.role !== 'global_admin' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Organization</label>
                            <select
                                name="org_id"
                                value={formData.org_id}
                                onChange={handleChange}
                                disabled={!!currentOrg} // Disabled if scoped to current org
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2 disabled:bg-slate-100 disabled:text-slate-500"
                            >
                                <option value="">Select Organization...</option>
                                {orgs.map(org => (
                                    <option key={org.id} value={org.id}>{org.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex justify-end pt-4 gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

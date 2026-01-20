import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import UserModal from './UserModal';
import { useAuth } from '../context/AuthContext';
import { useAdmin } from '../context/AdminContext';

export default function UserManagement({ orgId = null }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const { user: currentUser } = useAuth();
    const { orgs } = useAdmin(); // Needed for dropdown in modal

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await api.getUsers(orgId);
            setUsers(data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [orgId]);

    const handleAddUser = () => {
        setEditingUser(null);
        setIsModalOpen(true);
    };

    const handleEditUser = (user) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        try {
            await api.deleteUser(id);
            fetchUsers();
        } catch (err) {
            alert('Failed to delete user: ' + err.message);
        }
    };

    const handleSaveUser = async (userData) => {
        try {
            if (editingUser) {
                await api.updateUser(editingUser.id, userData);
            } else {
                await api.createUser(userData);
            }
            setIsModalOpen(false);
            fetchUsers();
        } catch (err) {
            alert('Failed to save user: ' + err.message);
        }
    };

    if (loading) return <div className="text-center py-4">Loading users...</div>;
    if (error) return <div className="text-red-500 py-4">Error: {error}</div>;

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Users</h3>
                {currentUser?.role !== 'reader' && (
                    <button
                        onClick={handleAddUser}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                    >
                        Add User
                    </button>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                            {!orgId && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>}
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Added</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((u) => (
                            <tr key={u.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{u.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{u.role.replace('_', ' ')}</td>
                                {!orgId && (
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {u.org_id ? orgs.find(o => o.id === u.org_id)?.name || 'Unknown' : 'Global (None)'}
                                    </td>
                                )}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(u.created_at || Date.now()).toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {currentUser?.role !== 'reader' && (
                                        <>
                                            <button onClick={() => handleEditUser(u)} className="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
                                            <button onClick={() => handleDeleteUser(u.id)} className="text-red-600 hover:text-red-900">Delete</button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <UserModal
                    user={editingUser}
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveUser}
                    orgs={orgs}
                    currentOrg={orgId ? orgs.find(o => o.id === orgId) : null}
                />
            )}
        </div>
    );
}

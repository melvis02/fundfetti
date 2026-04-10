import React from 'react';
import UserManagement from '../components/UserManagement';

export default function Users() {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Global User Management</h1>
            <UserManagement />
        </div>
    );
}

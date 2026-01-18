import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AdminContext = createContext();

export function AdminProvider({ children }) {
    const [orgs, setOrgs] = useState([]);
    const [currentOrg, setCurrentOrg] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Initial fetch of organizations
        const init = async () => {
            try {
                const data = await api.getOrganizations();
                setOrgs(data || []);
                // Default to first org if available and none selected
                if (data && data.length > 0) {
                    // TODO: Persist selection in localStorage
                    setCurrentOrg(data[0]);
                }
            } catch (e) {
                console.error("Failed to load orgs for admin context", e);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    const value = {
        orgs,
        currentOrg,
        setCurrentOrg,
        loading,
        refreshOrgs: async () => {
            const data = await api.getOrganizations();
            setOrgs(data || []);
        }
    };

    return (
        <AdminContext.Provider value={value}>
            {children}
        </AdminContext.Provider>
    );
}

export function useAdmin() {
    return useContext(AdminContext);
}

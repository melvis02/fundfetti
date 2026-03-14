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
                // Default to saved org or first org if available and none selected
                if (data && data.length > 0) {
                    const savedOrgId = localStorage.getItem('fundfetti_admin_org_id');
                    if (savedOrgId) {
                        const saved = data.find(o => o.id.toString() === savedOrgId);
                        if (saved) {
                            setCurrentOrg(saved);
                            return;
                        }
                    }
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
        setCurrentOrg: (org) => {
            setCurrentOrg(org);
            if (org) {
                localStorage.setItem('fundfetti_admin_org_id', org.id.toString());
            } else {
                localStorage.removeItem('fundfetti_admin_org_id');
            }
        },
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

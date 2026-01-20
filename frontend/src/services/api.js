const API_BASE = '/api';

export const api = {
    // Organizations
    getOrganizations: async () => {
        const res = await fetch(`${API_BASE}/organizations`);
        if (!res.ok) throw new Error('Failed to fetch organizations');
        return res.json();
    },
    createOrganization: async (org) => {
        const res = await fetch(`${API_BASE}/organizations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(org),
        });
        if (!res.ok) throw new Error('Failed to create organization');
        return res.json();
    },
    getOrganization: async (id) => {
        const res = await fetch(`${API_BASE}/organizations/${id}`);
        if (!res.ok) throw new Error('Failed to fetch organization');
        return res.json();
    },
    updateOrganization: async (id, org) => {
        const res = await fetch(`${API_BASE}/organizations/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(org),
        });
        if (!res.ok) throw new Error('Failed to update organization');
        return res.json();
    },
    deleteOrganization: async (id) => {
        const res = await fetch(`${API_BASE}/organizations/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete organization');
    },

    // Products (Scoped)
    getOrgProducts: async (orgId) => {
        const res = await fetch(`${API_BASE}/organizations/${orgId}/products`);
        if (!res.ok) throw new Error('Failed to fetch products');
        return res.json();
    },
    createProduct: async (orgId, product) => {
        const res = await fetch(`${API_BASE}/organizations/${orgId}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product),
        });
        if (!res.ok) throw new Error('Failed to create product');
        return res.json();
    },
    deleteProduct: async (id) => {
        const res = await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete product');
    },

    // Campaigns (Scoped)
    getOrgCampaigns: async (orgId) => {
        const res = await fetch(`${API_BASE}/organizations/${orgId}/campaigns`);
        if (!res.ok) throw new Error('Failed to fetch campaigns');
        return res.json();
    },
    createCampaign: async (orgId, campaign) => {
        const res = await fetch(`${API_BASE}/organizations/${orgId}/campaigns`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(campaign),
        });
        if (!res.ok) throw new Error('Failed to create campaign');
        return res.json();
    },
    updateCampaign: async (id, campaign) => {
        const res = await fetch(`${API_BASE}/campaigns/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(campaign),
        });
        if (!res.ok) throw new Error('Failed to update campaign');
        return res.json();
    },
    deleteCampaign: async (id) => {
        const res = await fetch(`${API_BASE}/campaigns/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete campaign');
    },
    addCampaignProduct: async (campaignId, productId) => {
        const res = await fetch(`${API_BASE}/campaigns/${campaignId}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: productId })
        });
        if (!res.ok) throw new Error('Failed to link product');
    },
    removeCampaignProduct: async (campaignId, productId) => {
        const res = await fetch(`${API_BASE}/campaigns/${campaignId}/products/${productId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to unlink product');
    },

    // Public / Ordering
    getCampaignPublic: async (id) => {
        // Using existing endpoint as it returns products too
        const res = await fetch(`${API_BASE}/campaigns/${id}`);
        if (!res.ok) throw new Error('Failed to fetch campaign');
        return res.json();
    },
    getOrgOrders: async (orgId) => {
        const res = await fetch(`${API_BASE}/orders?org_id=${orgId}`);
        if (!res.ok) throw new Error('Failed to fetch orders');
        return res.json();
    },
    updateOrderStatus: async (id, status) => {
        const res = await fetch(`${API_BASE}/orders/${id}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(status),
        });
        if (!res.ok) throw new Error('Failed to update order status');
        return res.json();
    },
    submitOrder: async (order) => {
        const res = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order),
        });
        if (!res.ok) throw new Error('Failed to submit order');
        return res.json();
    },

    // Users
    getUsers: async (orgId = null) => {
        let url = `${API_BASE}/users`;
        if (orgId) url += `?org_id=${orgId}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch users');
        return res.json();
    },
    createUser: async (user) => {
        const res = await fetch(`${API_BASE}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user),
        });
        if (!res.ok) throw new Error('Failed to create user');
        return res.json();
    },
    updateUser: async (id, user) => {
        const res = await fetch(`${API_BASE}/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user),
        });
        if (!res.ok) throw new Error('Failed to update user');
        return res.json();
    },
    deleteUser: async (id) => {
        const res = await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete user');
    }
};

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import UserManagement from '../components/UserManagement';
import UploadForm from '../components/UploadForm';
import { useAuth } from '../context/AuthContext';

export default function OrganizationDashboard() {
    const { id } = useParams();
    const { user } = useAuth();
    const [org, setOrg] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('campaigns');

    // Sub-data
    const [campaigns, setCampaigns] = useState([]);
    const [products, setProducts] = useState([]);
    const [subLoading, setSubLoading] = useState(false);

    // Form states
    const [newCampaign, setNewCampaign] = useState({ name: '', description: '', start_date: '', end_date: '' });
    const [newProduct, setNewProduct] = useState({ name: '', price_cents: 0 });

    const fetchOrgDetails = async () => {
        try {
            const data = await api.getOrganization(id);
            setOrg(data);
        } catch (error) {
            console.error("Failed to fetch org", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrgDetails();
    }, [id]);

    const fetchCampaigns = async () => {
        setSubLoading(true);
        try {
            const data = await api.getOrgCampaigns(id);
            setCampaigns(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setSubLoading(false);
        }
    };

    const fetchProducts = async () => {
        setSubLoading(true);
        try {
            const data = await api.getOrgProducts(id);
            setProducts(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setSubLoading(false);
        }
    };

    const handleCreateCampaign = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...newCampaign,
                start_date: new Date(newCampaign.start_date).toISOString(),
                end_date: new Date(newCampaign.end_date).toISOString(),
                is_active: true
            };
            await api.createCampaign(id, payload);
            setNewCampaign({ name: '', description: '', start_date: '', end_date: '' });
            fetchCampaigns();
        } catch (e) {
            console.error(e);
            alert('Failed to create campaign');
        }
    };

    const handleCreateProduct = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...newProduct,
                price_cents: Math.round(parseFloat(newProduct.price_cents) * 100)
            };
            await api.createProduct(id, payload);
            setNewProduct({ name: '', price_cents: 0 });
            fetchProducts();
        } catch (e) {
            console.error(e);
            alert('Failed to create product');
        }
    };

    const [selectedCampaign, setSelectedCampaign] = useState(null);

    const toggleCampaignProduct = async (productId, isLinked) => {
        if (!selectedCampaign) return;
        try {
            if (isLinked) {
                await api.addCampaignProduct(selectedCampaign.id, productId);
                setSelectedCampaign(prev => ({
                    ...prev,
                    products: [...(prev.products || []), { id: productId }]
                }));
            } else {
                await api.removeCampaignProduct(selectedCampaign.id, productId);
                setSelectedCampaign(prev => ({
                    ...prev,
                    products: (prev.products || []).filter(p => p.id !== productId)
                }));
            }
            fetchCampaigns();
        } catch (e) {
            console.error(e);
            alert("Failed to update link");
        }
    };

    const openManageProducts = (campaign) => {
        if (products.length === 0) fetchProducts();
        setSelectedCampaign(campaign);
    };

    const [editingCampaign, setEditingCampaign] = useState(null);

    const handleUpdateCampaign = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...editingCampaign,
                start_date: new Date(editingCampaign.start_date).toISOString(),
                end_date: new Date(editingCampaign.end_date).toISOString(),
            };
            await api.updateCampaign(editingCampaign.id, payload);
            setEditingCampaign(null);
            fetchCampaigns();
        } catch (e) {
            console.error(e);
            alert("Failed to update campaign");
        }
    };

    const handleDeleteCampaign = async (id) => {
        if (!window.confirm("Are you sure? This will delete the campaign.")) return;
        try {
            await api.deleteCampaign(id);
            fetchCampaigns();
        } catch (e) {
            console.error(e);
            alert("Failed to delete campaign");
        }
    };

    const openEditCampaign = (c) => {
        setEditingCampaign({
            ...c,
            start_date: new Date(c.start_date).toISOString().split('T')[0],
            end_date: new Date(c.end_date).toISOString().split('T')[0]
        });
    };

    const [orders, setOrders] = useState([]);
    const [orderFilter, setOrderFilter] = useState('all'); // all, pending_pickup, unpaid
    const [searchQuery, setSearchQuery] = useState('');
    const [campaignFilter, setCampaignFilter] = useState('all');

    useEffect(() => {
        if (org) {
            if (activeTab === 'campaigns') fetchCampaigns();
            if (activeTab === 'products') fetchProducts();
            if (activeTab === 'orders') fetchOrders();
        }
    }, [org, activeTab]);

    const fetchOrders = async () => {
        setSubLoading(true);
        try {
            const data = await api.getOrgOrders(id);
            setOrders(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setSubLoading(false);
        }
    };

    const toggleOrderStatus = async (order, field) => {
        // field is 'picked_up' or 'paid' (API expects snake_case)
        // order object uses PascalCase (PickedUp, Paid) from Go backend
        const propName = field === 'picked_up' ? 'PickedUp' : 'Paid';
        const newVal = !order[propName];

        const payload = {
            picked_up: field === 'picked_up' ? newVal : order.PickedUp,
            paid: field === 'paid' ? newVal : order.Paid
        };

        try {
            await api.updateOrderStatus(order.ID, payload);
            // Optimistic update
            setOrders(prev => prev.map(o => o.ID === order.ID ? { ...o, [propName]: newVal } : o));
        } catch (e) {
            console.error(e);
            alert("Failed to update status");
        }
    };

    const filteredOrders = orders.filter(o => {
        // Text Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const matchesName = o.Name?.toLowerCase().includes(q);
            const matchesEmail = o.Email?.toLowerCase().includes(q);
            const matchesId = o.ID?.toString().includes(q);
            if (!matchesName && !matchesEmail && !matchesId) return false;
        }

        // Campaign Filter
        if (campaignFilter !== 'all') {
            if (o.CampaignID !== parseInt(campaignFilter)) return false;
        }

        // Status Filter
        if (orderFilter === 'pending_pickup') return !o.PickedUp;
        if (orderFilter === 'unpaid') return !o.Paid;
        return true;
    });

    if (loading) return <div className="p-8 text-center">Loading Organization...</div>;
    if (!org) return <div className="p-8 text-center text-red-600">Organization not found</div>;

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-slate-200">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{org.name}</h1>
                            <div className="text-sm text-slate-500 mt-1">Dashboard • {org.contact_email}</div>
                        </div>
                        <Link to="/admin/organizations" className="text-primary-600 hover:text-primary-700 font-medium text-sm">
                            ← All Organizations
                        </Link>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 py-8">
                {/* Tabs */}
                <div className="border-b border-slate-200 mb-6">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('campaigns')}
                            className={`${activeTab === 'campaigns'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Campaigns
                        </button>
                        <button
                            onClick={() => setActiveTab('products')}
                            className={`${activeTab === 'products'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Products
                        </button>
                        <button
                            onClick={() => setActiveTab('orders')}
                            className={`${activeTab === 'orders'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Orders
                        </button>
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`${activeTab === 'users'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Users
                        </button>
                    </nav>
                </div>

                {/* Content */}
                {activeTab === 'campaigns' && (
                    <div>
                        {/* Create Campaign */}
                        {user?.role !== 'reader' && (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">Launch New Campaign</h3>
                                <form onSubmit={handleCreateCampaign} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                        <input type="text" required className="form-input w-full rounded-lg border-slate-200" value={newCampaign.name} onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })} placeholder="Spring Sale" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                                        <input type="date" required className="form-input w-full rounded-lg border-slate-200" value={newCampaign.start_date} onChange={e => setNewCampaign({ ...newCampaign, start_date: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                                        <input type="date" required className="form-input w-full rounded-lg border-slate-200" value={newCampaign.end_date} onChange={e => setNewCampaign({ ...newCampaign, end_date: e.target.value })} />
                                    </div>
                                    <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700">Create Campaign</button>
                                </form>
                            </div>
                        )}

                        {/* Campaign List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {campaigns.map(c => (
                                <div key={c.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow relative group">
                                    <div className="flex justify-between items-start mb-4">
                                        <h4 className="text-lg font-semibold text-slate-900">{c.name}</h4>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
                                            {c.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <div className="text-sm text-slate-500 mb-4 space-y-1">
                                        <div className="flex justify-between">
                                            <span>Start:</span>
                                            <span className="text-slate-700">{new Date(c.start_date).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>End:</span>
                                            <span className="text-slate-700">{new Date(c.end_date).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex justify-between border-t border-slate-100 pt-1 mt-2">
                                            <span>Products:</span>
                                            <span className="text-slate-700 font-medium">{c.products ? c.products.length : 0}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 text-sm font-medium pt-2 border-t border-slate-50">
                                        {user?.role !== 'reader' && (
                                            <button onClick={() => openManageProducts(c)} className="text-primary-600 hover:text-primary-700 flex-1 text-left">Manage Products</button>
                                        )}
                                        <Link to={`/c/${c.id}`} target="_blank" className="text-slate-500 hover:text-slate-700 mr-2">View</Link>
                                        {user?.role !== 'reader' && (
                                            <>
                                                <button onClick={() => openEditCampaign(c)} className="text-slate-400 hover:text-slate-600">✎</button>
                                                <button onClick={() => handleDeleteCampaign(c.id)} className="text-red-300 hover:text-red-500 ml-1">🗑</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {campaigns.length === 0 && !subLoading && (
                                <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                                    No campaigns yet. Launch one above!
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'products' && (
                    <div>
                        {/* Create Product */}
                        {user?.role !== 'reader' && (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">Add Product</h3>
                                <form onSubmit={handleCreateProduct} className="flex gap-4 items-end">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                        <input type="text" required className="form-input w-full rounded-lg border-slate-200" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="Potted Tulip" />
                                    </div>
                                    <div className="w-32">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Price ($)</label>
                                        <input type="number" step="0.01" required className="form-input w-full rounded-lg border-slate-200" value={newProduct.price_cents} onChange={e => setNewProduct({ ...newProduct, price_cents: e.target.value })} placeholder="10.00" />
                                    </div>
                                    <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700">Add Product</button>
                                </form>
                            </div>
                        )}

                        {/* Product List */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Product</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Price</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Stock</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {products.map(p => (
                                        <tr key={p.id}>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-900">{p.name}</td>
                                            <td className="px-6 py-4 text-sm text-slate-600">${(p.price_cents / 100).toFixed(2)}</td>
                                            <td className="px-6 py-4 text-sm text-slate-600">{p.stock_quantity === -1 ? 'Unlimited' : p.stock_quantity}</td>
                                            <td className="px-6 py-4 text-sm text-right">
                                                {user?.role !== 'reader' && (
                                                    <button onClick={() => api.deleteProduct(p.id).then(fetchProducts)} className="text-red-600 hover:text-red-900">Delete</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {products.length === 0 && (
                                        <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-500">No products added yet.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'orders' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center bg-slate-50 gap-4">
                            <h3 className="font-semibold text-slate-700">Order Management</h3>
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Search orders..."
                                        className="pl-8 pr-4 py-1.5 text-sm border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 w-full sm:w-64"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    <svg className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <select
                                    className="text-sm border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                    value={campaignFilter}
                                    onChange={(e) => setCampaignFilter(e.target.value)}
                                >
                                    <option value="all">All Campaigns</option>
                                    {campaigns.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                <select
                                    className="text-sm border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                    value={orderFilter}
                                    onChange={(e) => setOrderFilter(e.target.value)}
                                >
                                    <option value="all">Any Status</option>
                                    <option value="pending_pickup">Pending Pickup</option>
                                    <option value="unpaid">Unpaid</option>
                                </select>
                            </div>
                        </div>

                        {/* Import and Print Actions */}
                        <div className="p-4 border-b border-slate-100 bg-white grid gap-4 grid-cols-1 md:grid-cols-2">
                            <div className="p-4 border border-dashed border-slate-300 rounded-lg bg-slate-50">
                                <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                    <span>📥</span> Import Orders CSV
                                </h4>
                                <UploadForm onUploadSuccess={fetchOrders} campaigns={campaigns} />
                            </div>
                            <div className="flex flex-col justify-center gap-3">
                                <h4 className="text-sm font-semibold text-slate-700">Print Options</h4>
                                <div className="flex gap-3">
                                    <a
                                        href={`/print/summary?org_id=${id}`}
                                        target="_blank"
                                        className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-lg transition-colors font-medium border border-slate-200 text-sm"
                                    >
                                        <span>📄</span> Print Summary
                                    </a>
                                    <a
                                        href={`/print/orders?org_id=${id}`}
                                        target="_blank"
                                        className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-lg transition-colors font-medium border border-slate-200 text-sm"
                                    >
                                        <span>🏷️</span> Print Labels
                                    </a>
                                </div>
                                <p className="text-xs text-slate-500">
                                    Opens a printer-friendly view in a new tab. Use browser print (Cmd+P) to save as PDF or print.
                                </p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Customer</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Items</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredOrders.length === 0 ? (
                                        <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">No orders found.</td></tr>
                                    ) : (
                                        filteredOrders.map(order => (
                                            <tr key={order.ID} className="hover:bg-slate-50">
                                                <td className="px-6 py-4 text-sm text-slate-500">#{order.ID}</td>
                                                <td className="px-6 py-4 text-sm">
                                                    <div className="font-medium text-slate-900">{order.Name}</div>
                                                    <div className="text-slate-500 text-xs">{order.Email}</div>
                                                    {order.Phone && <div className="text-slate-500 text-xs">{order.Phone}</div>}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">
                                                    {order.Items && order.Items.length > 0 ? (
                                                        <ul className="list-disc list-inside text-xs">
                                                            {order.Items.map((item, idx) => (
                                                                <li key={idx}>{item.Quantity}x {item.PlantType}</li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <span className="text-slate-400 italic">No items</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-sm">
                                                    <div className="flex flex-col gap-2">
                                                        <button
                                                            onClick={user?.role !== 'reader' ? () => toggleOrderStatus(order, 'paid') : undefined}
                                                            disabled={user?.role === 'reader'}
                                                            className={`text-xs px-2 py-1 rounded-full border transition-colors ${order.Paid
                                                                ? 'bg-green-100 text-green-700 border-green-200'
                                                                : 'bg-red-50 text-red-600 border-red-100'} ${user?.role !== 'reader' ? 'hover:bg-green-200 hover:bg-red-100 cursor-pointer' : 'cursor-default opacity-80'}`}
                                                        >
                                                            {order.Paid ? 'Paid' : 'Unpaid'}
                                                        </button>
                                                        <button
                                                            onClick={user?.role !== 'reader' ? () => toggleOrderStatus(order, 'picked_up') : undefined}
                                                            disabled={user?.role === 'reader'}
                                                            className={`text-xs px-2 py-1 rounded-full border transition-colors ${order.PickedUp
                                                                ? 'bg-blue-100 text-blue-700 border-blue-200'
                                                                : 'bg-amber-50 text-amber-600 border-amber-100'} ${user?.role !== 'reader' ? 'hover:bg-blue-200 hover:bg-amber-100 cursor-pointer' : 'cursor-default opacity-80'}`}
                                                        >
                                                            {order.PickedUp ? ' picked up' : 'Pending Pickup'}
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-right">

                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <UserManagement orgId={parseInt(id)} />
                )}
            </div>

            {/* Campaign Edit Modal */}
            {editingCampaign && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-900">Edit Campaign</h3>
                            <button onClick={() => setEditingCampaign(null)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleUpdateCampaign} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                <input type="text" required className="w-full rounded-lg border-slate-200" value={editingCampaign.name} onChange={e => setEditingCampaign({ ...editingCampaign, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                                    <input type="date" required className="w-full rounded-lg border-slate-200" value={editingCampaign.start_date} onChange={e => setEditingCampaign({ ...editingCampaign, start_date: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                                    <input type="date" required className="w-full rounded-lg border-slate-200" value={editingCampaign.end_date} onChange={e => setEditingCampaign({ ...editingCampaign, end_date: e.target.value })} />
                                </div>
                            </div>

                            <div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editingCampaign.is_active}
                                        onChange={e => setEditingCampaign({ ...editingCampaign, is_active: e.target.checked })}
                                        className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 h-5 w-5"
                                    />
                                    <span className="text-sm font-medium text-slate-700">Active (Visible to public)</span>
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setEditingCampaign(null)} className="px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-50 font-medium">Cancel</button>
                                <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Manage Products Modal */}
            {selectedCampaign && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900">Manage Products for {selectedCampaign.name}</h3>
                            <button onClick={() => setSelectedCampaign(null)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            {products.length === 0 ? (
                                <p className="text-slate-500 text-center">No products in organization. Add some in the Products tab first.</p>
                            ) : (
                                <div className="space-y-3">
                                    {products.map(p => {
                                        const isLinked = selectedCampaign.products?.some(cp => cp.id === p.id);
                                        return (
                                            <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
                                                <div>
                                                    <div className="font-medium text-slate-900">{p.name}</div>
                                                    <div className="text-xs text-slate-500">${(p.price_cents / 100).toFixed(2)}</div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={!!isLinked}
                                                    onChange={(e) => toggleCampaignProduct(p.id, e.target.checked)}
                                                    className="h-5 w-5 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                                                />
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end">
                            <button onClick={() => setSelectedCampaign(null)} className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700">Done</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

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
    const [categories, setCategories] = useState([]);
    const [subLoading, setSubLoading] = useState(false);

    // Form states
    const [newCampaign, setNewCampaign] = useState({ name: '', description: '', start_date: '', end_date: '', payment_metadata: '', order_email_cc: '', slug: '', catalog_url: '', header_text: '', custom_email_text: '' });
    const [newProduct, setNewProduct] = useState({ name: '', price_cents: 0, category_id: '' });
    const [newCategory, setNewCategory] = useState({ name: '' });
    const [editingProduct, setEditingProduct] = useState(null);
    const [editingOrg, setEditingOrg] = useState(null);
    const [editingCategory, setEditingCategory] = useState(null);

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

    const fetchCategories = async () => {
        try {
            const data = await api.getOrgCategories(id);
            setCategories(data || []);
        } catch (e) {
            console.error(e);
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
            setNewCampaign({ name: '', description: '', start_date: '', end_date: '', payment_metadata: '', order_email_cc: '', slug: '', catalog_url: '', header_text: '', custom_email_text: '' });
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
                price_cents: Math.round(parseFloat(newProduct.price_cents) * 100),
                category_id: newProduct.category_id ? parseInt(newProduct.category_id) : null
            };
            await api.createProduct(id, payload);
            setNewProduct({ name: '', price_cents: 0, category_id: '' });
            fetchProducts();
        } catch (e) {
            console.error(e);
            alert('Failed to create product');
        }
    };

    const handleImportProducts = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            setSubLoading(true);
            const res = await api.importProducts(id, file);
            alert(`Successfully imported ${res.count} products!`);
            fetchProducts();
        } catch (err) {
            console.error(err);
            alert('Failed to import products');
        } finally {
            setSubLoading(false);
            e.target.value = null; // reset input
        }
    };

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        try {
            await api.createCategory(id, newCategory);
            setNewCategory({ name: '' });
            fetchCategories();
        } catch (e) {
            console.error(e);
            alert('Failed to create category');
        }
    };

    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [helpModalOpen, setHelpModalOpen] = useState(false);

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

    const openEditProduct = (p) => {
        setEditingProduct({
            ...p,
            price_dollars: (p.price_cents / 100).toFixed(2)
        });
    };

    const handleUpdateProduct = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...editingProduct,
                price_cents: Math.round(parseFloat(editingProduct.price_dollars) * 100),
                stock_quantity: parseInt(editingProduct.stock_quantity),
                category_id: editingProduct.category_id ? parseInt(editingProduct.category_id) : null
            };
            await api.updateProduct(editingProduct.id, payload);
            setEditingProduct(null);
            fetchProducts();
        } catch (e) {
            console.error(e);
            alert("Failed to update product");
        }
    };

    const handleUpdateOrganization = async (e) => {
        e.preventDefault();
        try {
            await api.updateOrganization(org.id, editingOrg);
            setOrg(editingOrg);
            setEditingOrg(null);
        } catch (e) {
            console.error(e);
            alert("Failed to update organization");
        }
    };

    const [orders, setOrders] = useState([]);
    const [orderFilter, setOrderFilter] = useState('all'); // all, pending_pickup, unpaid
    const [searchQuery, setSearchQuery] = useState('');
    const [campaignFilter, setCampaignFilter] = useState('all');

    useEffect(() => {
        if (org) {
            if (activeTab === 'campaigns') fetchCampaigns();
            if (activeTab === 'products') { fetchProducts(); fetchCategories(); }
            if (activeTab === 'orders') fetchOrders();
            if (activeTab === 'categories') fetchCategories();
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
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{org.name}</h1>
                                {user?.role !== 'reader' && (
                                    <button onClick={() => setEditingOrg(org)} className="text-slate-400 hover:text-slate-600 text-sm">✎ Edit Details</button>
                                )}
                            </div>
                            <div className="text-sm text-slate-500 mt-1">Dashboard • {org.contact_email}</div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button onClick={() => setHelpModalOpen(true)} className="text-slate-500 hover:text-slate-700 font-medium text-sm flex items-center gap-1">
                                <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-xs">?</span> Help
                            </button>
                            <Link to="/admin/organizations" className="text-primary-600 hover:text-primary-700 font-medium text-sm">
                                ← All Organizations
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 py-8">
                {/* Tabs */}
                <div className="border-b border-slate-200 mb-6 overflow-x-auto">
                    <nav className="-mb-px flex space-x-4 md:space-x-8 px-1">
                        <button
                            onClick={() => setActiveTab('categories')}
                            className={`${activeTab === 'categories'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Categories
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
                            onClick={() => setActiveTab('campaigns')}
                            className={`${activeTab === 'campaigns'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Campaigns
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
                        <button
                            onClick={() => setActiveTab('orders')}
                            className={`${activeTab === 'orders'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Orders
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
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">URL Slug (Friendly URL)</label>
                                        <input type="text" className="form-input w-full rounded-lg border-slate-200" value={newCampaign.slug} onChange={e => setNewCampaign({ ...newCampaign, slug: e.target.value })} placeholder="spring-sale" />
                                    </div>
                                    <div className="col-span-full md:col-span-2 lg:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Catalog PDF Link (Optional)</label>
                                        <input type="url" className="form-input w-full rounded-lg border-slate-200" value={newCampaign.catalog_url} onChange={e => setNewCampaign({ ...newCampaign, catalog_url: e.target.value })} placeholder="https://drive.google.com/..." />
                                    </div>
                                    <div className="col-span-full">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Header Text (Order emails)</label>
                                        <textarea className="form-input w-full rounded-lg border-slate-200" rows="2" value={newCampaign.header_text} onChange={e => setNewCampaign({ ...newCampaign, header_text: e.target.value })} placeholder="Pick up dates are March 1st to 3rd..."></textarea>
                                    </div>
                                    <div className="col-span-full">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Custom Email Text (Order emails)</label>
                                        <textarea className="form-input w-full rounded-lg border-slate-200" rows="2" value={newCampaign.custom_email_text} onChange={e => setNewCampaign({ ...newCampaign, custom_email_text: e.target.value })} placeholder="Thank you for supporting our troop..."></textarea>
                                    </div>
                                    <div className="col-span-full">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Order Email CCs</label>
                                        <input type="text" className="form-input w-full rounded-lg border-slate-200" value={newCampaign.order_email_cc} onChange={e => setNewCampaign({ ...newCampaign, order_email_cc: e.target.value })} placeholder="email1@example.com, email2@example.com" />
                                        <p className="text-xs text-slate-500 mt-1">Comma-separated list of emails to receive order confirmations.</p>
                                    </div>
                                    <div className="col-span-full">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Payment Instructions (Optional override)</label>
                                        <textarea className="form-input w-full rounded-lg border-slate-200" rows="2" value={newCampaign.payment_metadata} onChange={e => setNewCampaign({ ...newCampaign, payment_metadata: e.target.value })} placeholder="Override organization payment instructions for this campaign..."></textarea>
                                    </div>
                                    <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 mt-2">Create Campaign</button>
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
                                        <Link to={c.slug && org.slug ? `/c/${org.slug}/${c.slug}` : `/c/${c.id}`} target="_blank" className="text-slate-500 hover:text-slate-700 mr-2">View</Link>
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
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold text-slate-800">Add Product</h3>
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm font-medium text-primary-600 hover:text-primary-800 cursor-pointer bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-100 flex items-center">
                                            <span>📤 Import CSV</span>
                                            <input type="file" accept=".csv" className="hidden" onChange={handleImportProducts} />
                                        </label>
                                    </div>
                                </div>
                                <form onSubmit={handleCreateProduct} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                        <input type="text" required className="form-input w-full rounded-lg border-slate-200" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="Potted Tulip" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                                        <select className="form-input w-full rounded-lg border-slate-200" value={newProduct.category_id} onChange={e => setNewProduct({ ...newProduct, category_id: e.target.value })}>
                                            <option value="">Uncategorized</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Price ($)</label>
                                        <input type="number" step="0.01" required className="form-input w-full rounded-lg border-slate-200" value={newProduct.price_cents} onChange={e => setNewProduct({ ...newProduct, price_cents: e.target.value })} placeholder="10.00" />
                                    </div>
                                    <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 mt-2 col-span-1 md:col-span-4 lg:col-span-1">Add Product</button>
                                </form>
                            </div>
                        )}

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-blue-800 text-sm flex items-start gap-3">
                            <span className="text-xl leading-none">💡</span>
                            <div>
                                <strong>Did you link your products?</strong> After adding products here, you must go to the <strong>Campaigns</strong> tab and click <em>Manage Products</em> to explicitly add them to an active campaign so customers can see them.
                            </div>
                        </div>

                        {/* Product List */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="overflow-x-auto">
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
                                                    <div className="flex justify-end gap-3 font-medium">
                                                        <button onClick={() => openEditProduct(p)} className="text-slate-400 hover:text-slate-600">✎ Edit</button>
                                                        <button onClick={() => api.deleteProduct(p.id).then(fetchProducts)} className="text-red-300 hover:text-red-500">🗑</button>
                                                    </div>
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
                                                    {user?.role !== 'reader' && (
                                                        <button
                                                            onClick={async () => {
                                                                if (window.confirm('Are you sure you want to delete this order? This cannot be undone.')) {
                                                                    try {
                                                                        await api.deleteOrder(order.ID);
                                                                        fetchOrders();
                                                                    } catch (e) {
                                                                        alert("Failed to delete order");
                                                                    }
                                                                }
                                                            }}
                                                            className="text-red-300 hover:text-red-500"
                                                            title="Delete Order"
                                                        >
                                                            🗑
                                                        </button>
                                                    )}
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

                {activeTab === 'categories' && (
                    <div>
                        {user?.role !== 'reader' && (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">Add Category</h3>
                                <form onSubmit={handleCreateCategory} className="flex gap-4 items-end">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Category Name</label>
                                        <input type="text" required className="form-input w-full rounded-lg border-slate-200" value={newCategory.name} onChange={e => setNewCategory({ ...newCategory, name: e.target.value })} placeholder="Indoor Plants" />
                                    </div>
                                    <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700">Add Category</button>
                                </form>
                            </div>
                        )}

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Category Name</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {categories.map(c => (
                                        <tr key={c.id}>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-900">{c.name}</td>
                                            <td className="px-6 py-4 text-sm text-right">
                                                {user?.role !== 'reader' && (
                                                    <div className="flex justify-end gap-3 font-medium">
                                                        <button onClick={() => setEditingCategory(c)} className="text-slate-400 hover:text-slate-600">✎ Edit</button>
                                                        <button onClick={async () => {
                                                            if (window.confirm('Delete category? Products in this category will become uncategorized.')) {
                                                                await api.deleteCategory(c.id);
                                                                fetchCategories();
                                                            }
                                                        }} className="text-red-300 hover:text-red-500">🗑</button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {categories.length === 0 && (
                                        <tr><td colSpan="2" className="px-6 py-8 text-center text-slate-500">No categories added yet.</td></tr>
                                    )}
                                </tbody>
                            </table>
                            </div>
                        </div>
                    </div>
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

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Slug (URL)</label>
                                    <input type="text" className="w-full rounded-lg border-slate-200" value={editingCampaign.slug || ''} onChange={e => setEditingCampaign({ ...editingCampaign, slug: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Catalog URL</label>
                                    <input type="url" className="w-full rounded-lg border-slate-200" value={editingCampaign.catalog_url || ''} onChange={e => setEditingCampaign({ ...editingCampaign, catalog_url: e.target.value })} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Header Text</label>
                                <textarea className="w-full rounded-lg border-slate-200" rows="3" value={editingCampaign.header_text || ''} onChange={e => setEditingCampaign({ ...editingCampaign, header_text: e.target.value })} placeholder="Intro text..."></textarea>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Custom Email Text</label>
                                <textarea className="w-full rounded-lg border-slate-200" rows="3" value={editingCampaign.custom_email_text || ''} onChange={e => setEditingCampaign({ ...editingCampaign, custom_email_text: e.target.value })} placeholder="Custom info in order email..."></textarea>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Order Email CCs</label>
                                <input type="text" className="w-full rounded-lg border-slate-200" value={editingCampaign.order_email_cc || ''} onChange={e => setEditingCampaign({ ...editingCampaign, order_email_cc: e.target.value })} placeholder="email1@example.com, email2@example.com" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Instructions</label>
                                <textarea className="w-full rounded-lg border-slate-200" rows="3" value={editingCampaign.payment_metadata || ''} onChange={e => setEditingCampaign({ ...editingCampaign, payment_metadata: e.target.value })} placeholder="Payment instructions..."></textarea>
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
                            ) : (() => {
                                const grouped = products.reduce((acc, p) => {
                                    const catName = categories.find(c => c.id === p.category_id)?.name || "Uncategorized";
                                    if (!acc[catName]) acc[catName] = [];
                                    acc[catName].push(p);
                                    return acc;
                                }, {});
                                const sortedKeys = Object.keys(grouped).sort((a, b) => {
                                    if (a === "Uncategorized") return 1;
                                    if (b === "Uncategorized") return -1;
                                    return a.localeCompare(b);
                                });

                                return (
                                    <div className="space-y-6">
                                        {sortedKeys.map(cat => (
                                            <div key={cat}>
                                                <h4 className="font-semibold text-slate-700 mb-2 border-b pb-1">{cat}</h4>
                                                <div className="space-y-2">
                                                    {grouped[cat].map(p => {
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
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end">
                            <button onClick={() => setSelectedCampaign(null)} className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700">Done</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Product Edit Modal */}
            {editingProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-900">Edit Product</h3>
                            <button onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleUpdateProduct} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                <input type="text" required className="w-full rounded-lg border-slate-200" value={editingProduct.name} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Price ($)</label>
                                    <input type="number" step="0.01" required className="w-full rounded-lg border-slate-200" value={editingProduct.price_dollars} onChange={e => setEditingProduct({ ...editingProduct, price_dollars: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                                    <select className="w-full rounded-lg border-slate-200" value={editingProduct.category_id || ''} onChange={e => setEditingProduct({ ...editingProduct, category_id: e.target.value })}>
                                        <option value="">Uncategorized</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Stock (-1 for UNLIMITED)</label>
                                <input type="number" required className="w-full rounded-lg border-slate-200" value={editingProduct.stock_quantity} onChange={e => setEditingProduct({ ...editingProduct, stock_quantity: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                <textarea className="w-full rounded-lg border-slate-200" rows="3" value={editingProduct.description || ''} onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}></textarea>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setEditingProduct(null)} className="px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-50 font-medium">Cancel</button>
                                <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Editing Category Modal */}
            {editingCategory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-900">Edit Category</h3>
                            <button onClick={() => setEditingCategory(null)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            try {
                                await api.updateCategory(editingCategory.id, editingCategory);
                                setEditingCategory(null);
                                fetchCategories();
                            } catch (err) {
                                alert("Failed to update category");
                            }
                        }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                <input type="text" required className="w-full rounded-lg border-slate-200" value={editingCategory.name} onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })} />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setEditingCategory(null)} className="px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-50 font-medium">Cancel</button>
                                <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Organization Edit Modal */}
            {editingOrg && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-900">Edit Organization</h3>
                            <button onClick={() => setEditingOrg(null)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleUpdateOrganization} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Organization Name</label>
                                <input type="text" required className="w-full rounded-lg border-slate-200" value={editingOrg.name} onChange={e => setEditingOrg({ ...editingOrg, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Slug (URL identifier)</label>
                                <input type="text" required className="w-full rounded-lg border-slate-200" value={editingOrg.slug} onChange={e => setEditingOrg({ ...editingOrg, slug: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Email</label>
                                <input type="email" required className="w-full rounded-lg border-slate-200" value={editingOrg.contact_email} onChange={e => setEditingOrg({ ...editingOrg, contact_email: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Instructions (Default)</label>
                                <textarea className="w-full rounded-lg border-slate-200" rows="4" value={editingOrg.payment_metadata || ''} onChange={e => setEditingOrg({ ...editingOrg, payment_metadata: e.target.value })} placeholder="e.g. Please Zelle (555) 123-4567..."></textarea>
                                <p className="text-xs text-slate-500 mt-1">These instructions will be shown on order confirmation screens and emails unless overridden by a campaign.</p>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setEditingOrg(null)} className="px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-50 font-medium">Cancel</button>
                                <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Help Modal */}
            {helpModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900">How to Launch a Campaign</h3>
                            <button onClick={() => setHelpModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
                        </div>

                        <div className="space-y-6 text-slate-600">
                            <div>
                                <h4 className="font-semibold text-slate-800 text-lg mb-2">1. Create Categories</h4>
                                <p className="text-sm">Start by setting up logical groupings for your products (e.g., "Indoor Plants", "Succulents"). Go to the <strong>Categories</strong> tab to add them first.</p>
                            </div>

                            <div>
                                <h4 className="font-semibold text-slate-800 text-lg mb-2">2. Add Products</h4>
                                <p className="text-sm mb-2">Navigate to the <strong>Products</strong> tab to add inventory. When creating products, assign them to the categories you just created.</p>
                                <p className="text-sm"><em>Tip: Use the CSV Importer if you have lots of items! Note that CSV imports will be "Uncategorized" by default until you edit them.</em></p>
                            </div>

                            <div>
                                <h4 className="font-semibold text-slate-800 text-lg mb-2">3. Create the Campaign</h4>
                                <p className="text-sm">Go to the <strong>Campaigns</strong> tab and launch a new campaign. Give it a friendly URL (e.g. <code>spring-sale</code>) so your link looks like <code>fundfetti.org/c/your-org/spring-sale</code>.</p>
                            </div>

                            <div>
                                <h4 className="font-semibold text-slate-800 text-lg mb-2">4. Link Products to Campaign</h4>
                                <p className="text-sm font-medium text-red-600 mb-1">Important: Products are not visible by default!</p>
                                <p className="text-sm">In the <strong>Campaigns</strong> tab, click <em>Manage Products</em> on your active campaign. Check the boxes next to all products you want visible to buyers for this specific sale.</p>
                            </div>
                        </div>

                        <div className="flex justify-end pt-6 mt-6 border-t border-slate-100">
                            <button onClick={() => setHelpModalOpen(false)} className="bg-primary-600 text-white px-5 py-2.5 rounded-lg hover:bg-primary-700 font-medium">Got it!</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';

export default function OrganizationDashboard() {
    const { id } = useParams();
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

    useEffect(() => {
        fetchOrgDetails();
    }, [id]);

    useEffect(() => {
        if (org) {
            if (activeTab === 'campaigns') fetchCampaigns();
            if (activeTab === 'products') fetchProducts();
        }
    }, [org, activeTab]);

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
            // Fix dates to RFC3339 if needed, for now sending as string, backend expects standard time.Time parsing
            // Assuming HTML date input sends 'YYYY-MM-DD', we might need to append time
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
            // Price input is probably dollars, backend wants cents
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
                // Link
                await api.addCampaignProduct(selectedCampaign.id, productId);
                // deeply update selectedCampaign.products
                setSelectedCampaign(prev => ({
                    ...prev,
                    products: [...(prev.products || []), { id: productId }]
                }));
            } else {
                // Unlink
                await api.removeCampaignProduct(selectedCampaign.id, productId);
                setSelectedCampaign(prev => ({
                    ...prev,
                    products: (prev.products || []).filter(p => p.id !== productId)
                }));
            }
            // Refresh campaigns list in background
            fetchCampaigns();
        } catch (e) {
            console.error(e);
            alert("Failed to update link");
        }
    };

    const openManageProducts = (campaign) => {
        // We need to ensure we have the list of all products to choose from
        if (products.length === 0) fetchProducts();
        setSelectedCampaign(campaign);
    };

    const [editingCampaign, setEditingCampaign] = useState(null);

    const handleUpdateCampaign = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...editingCampaign,
                // ensure dates remain in correct format if touched (editingCampaign has state from input)
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
        // Format dates for input[type="date"] (YYYY-MM-DD)
        setEditingCampaign({
            ...c,
            start_date: new Date(c.start_date).toISOString().split('T')[0],
            end_date: new Date(c.end_date).toISOString().split('T')[0]
        });
    };

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
                        <Link to="/organizations" className="text-primary-600 hover:text-primary-700 font-medium text-sm">
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
                    </nav>
                </div>

                {/* Content */}
                {activeTab === 'campaigns' && (
                    <div>
                        {/* Create Campaign */}
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
                                        <button onClick={() => openManageProducts(c)} className="text-primary-600 hover:text-primary-700 flex-1 text-left">Manage Products</button>
                                        <Link to={`/c/${c.id}`} target="_blank" className="text-slate-500 hover:text-slate-700 mr-2">View</Link>
                                        <button onClick={() => openEditCampaign(c)} className="text-slate-400 hover:text-slate-600">✎</button>
                                        <button onClick={() => handleDeleteCampaign(c.id)} className="text-red-300 hover:text-red-500 ml-1">🗑</button>
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
                                                <button onClick={() => api.deleteProduct(p.id).then(fetchProducts)} className="text-red-600 hover:text-red-900">Delete</button>
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

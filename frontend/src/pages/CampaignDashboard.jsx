import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import UploadForm from '../components/UploadForm';
import { useAuth } from '../context/AuthContext';

export default function CampaignDashboard() {
    const { id: orgId, campaignId } = useParams();
    const { user } = useAuth();
    
    const [org, setOrg] = useState(null);
    const [campaign, setCampaign] = useState(null);
    const [orders, setOrders] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [subLoading, setSubLoading] = useState(false);
    const [error, setError] = useState(null);

    const [orderFilter, setOrderFilter] = useState('all'); // all, pending_pickup, unpaid
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const loadData = async () => {
            try {
                // Fetch Org and Campaign details briefly for breadcrumbs/display
                const [orgData, campaignData] = await Promise.all([
                    api.getOrganization(orgId),
                    // We don't have a direct getCampaign() using campaignId isolated if it's protected,
                    // but wait, we have `api.getOrgCampaigns`. Let's fetch them all and find ours.
                    api.getOrgCampaigns(orgId)
                ]);
                setOrg(orgData);
                const camp = campaignData.find(c => c.id === parseInt(campaignId));
                if (!camp) throw new Error("Campaign not found");
                setCampaign(camp);
                
                await fetchOrders();
            } catch (err) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [orgId, campaignId]);

    const fetchOrders = async () => {
        setSubLoading(true);
        try {
            const data = await api.getOrders({ campaign_id: campaignId });
            setOrders(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setSubLoading(false);
        }
    };

    const toggleOrderStatus = async (order, field) => {
        const propName = field === 'picked_up' ? 'PickedUp' : 'Paid';
        const newVal = !order[propName];

        const payload = {
            picked_up: field === 'picked_up' ? newVal : order.PickedUp,
            paid: field === 'paid' ? newVal : order.Paid
        };

        try {
            await api.updateOrderStatus(order.ID, payload);
            setOrders(prev => prev.map(o => o.ID === order.ID ? { ...o, [propName]: newVal } : o));
        } catch (e) {
            console.error(e);
            alert("Failed to update status");
        }
    };

    const handleDeleteOrder = async (orderId) => {
        if (!window.confirm('Are you sure you want to delete this order? This cannot be undone.')) return;
        try {
            await api.deleteOrder(orderId);
            fetchOrders();
        } catch (e) {
            alert("Failed to delete order");
        }
    };

    const filteredOrders = orders.filter(o => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const matchesName = o.Name?.toLowerCase().includes(q);
            const matchesEmail = o.Email?.toLowerCase().includes(q);
            const matchesId = o.ID?.toString().includes(q);
            if (!matchesName && !matchesEmail && !matchesId) return false;
        }
        if (orderFilter === 'pending_pickup') return !o.PickedUp;
        if (orderFilter === 'unpaid') return !o.Paid;
        return true;
    });

    if (loading) return <div className="p-8 text-center text-slate-500">Loading Campaign...</div>;
    if (error || !campaign) return <div className="p-8 text-center text-red-500">Error: {error || 'Campaign not found'}</div>;

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
            {/* Header / Breadcrumbs */}
            <div className="bg-white shadow-sm border-b border-slate-200">
                <div className="container mx-auto px-6 py-4">
                    <div className="text-sm font-medium text-slate-500 mb-1">
                        <Link to={`/admin/organizations/${orgId}`} className="hover:text-slate-800 transition-colors">
                            {org?.name} Base
                        </Link>
                        <span className="mx-2">/</span>
                        <span className="text-primary-600">{campaign.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Manage Orders: {campaign.name}</h1>
                            <div className="text-sm text-slate-500 mt-1">
                                {new Date(campaign.start_date).toLocaleDateString()} – {new Date(campaign.end_date).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 py-8">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center bg-slate-50 gap-4">
                        <h3 className="font-semibold text-slate-700">Campaign Orders ({filteredOrders.length})</h3>
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
                                <span>📥</span> Import Orders CSV (for this campaign)
                            </h4>
                            <UploadForm onUploadSuccess={fetchOrders} preSelectedCampaignId={campaign.id} />
                        </div>
                        <div className="flex flex-col justify-center gap-3">
                            <h4 className="text-sm font-semibold text-slate-700">Print Options</h4>
                            <div className="flex flex-col gap-3">
                                <div className="flex gap-3">
                                    <a
                                        href={`/print/summary?campaign_id=${campaign.id}`}
                                        target="_blank"
                                        className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg transition-colors font-medium border border-slate-200 text-sm w-1/2"
                                    >
                                        <span>📄</span> Print Summary
                                    </a>
                                    <a
                                        href={`/print/orders?campaign_id=${campaign.id}`}
                                        target="_blank"
                                        className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg transition-colors font-medium border border-slate-200 text-sm w-1/2"
                                    >
                                        <span>🏷️</span> Print Labels
                                    </a>
                                </div>
                                <a
                                    href={`/print/supplier-order?campaign_id=${campaign.id}`}
                                    target="_blank"
                                    className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg transition-colors font-medium border border-slate-200 text-sm"
                                >
                                    <span>📋</span> Print Supplier Order
                                </a>
                            </div>
                            <p className="text-xs text-slate-500">
                                Opens a printer-friendly view in a new tab. Scoped exclusively to {campaign.name}.
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
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Total</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {subLoading ? (
                                    <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">Loading orders...</td></tr>
                                ) : filteredOrders.length === 0 ? (
                                    <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">No orders found for this campaign.</td></tr>
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
                                                            <li key={idx}>{item.Quantity}x {item.CategoryName ? `${item.CategoryName} - ` : ''}{item.ProductName}</li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <span className="text-slate-400 italic">No items</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                                ${((order.Items?.reduce((sum, item) => sum + (item.Quantity * item.PriceCents), 0) || 0) / 100).toFixed(2)}
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
                                                        onClick={() => handleDeleteOrder(order.ID)}
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
            </div>
        </div>
    );
}

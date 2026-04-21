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
    const [showQR, setShowQR] = useState(false);

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

    const campaignUrl = campaign?.slug && org?.slug 
        ? `${window.location.origin}/c/${org.slug}/${campaign.slug}`
        : `${window.location.origin}/c/${campaign?.id}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&margin=10&data=${encodeURIComponent(campaignUrl)}`;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-200">
            {/* Header / Breadcrumbs */}
            <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700 transition-colors">
                <div className="container mx-auto px-6 py-4">
                    <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                        <Link to={`/admin/organizations/${orgId}`} className="hover:text-slate-800 dark:hover:text-white transition-colors">
                            {org?.name} Base
                        </Link>
                        <span className="mx-2">/</span>
                        <span className="text-primary-600 dark:text-primary-400">{campaign.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Manage Orders: {campaign.name}</h1>
                            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                {new Date(campaign.start_date).toLocaleDateString()} – {new Date(campaign.end_date).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 py-8">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-8 transition-colors">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center bg-slate-50 dark:bg-slate-900/50 gap-4 transition-colors">
                        <h3 className="font-semibold text-slate-700 dark:text-slate-200">Campaign Orders ({filteredOrders.length})</h3>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search orders..."
                                    className="pl-8 pr-4 py-1.5 text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-primary-500 focus:border-primary-500 w-full sm:w-64 transition-colors"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <svg className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <select
                                className="text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-primary-500 focus:border-primary-500 transition-colors"
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
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 grid gap-4 grid-cols-1 md:grid-cols-2 transition-colors">
                        <div className="p-4 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900/50 transition-colors">
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
                                <span>📥</span> Import Orders CSV (for this campaign)
                            </h4>
                            <UploadForm onUploadSuccess={fetchOrders} preSelectedCampaignId={campaign.id} />
                        </div>
                        <div className="flex flex-col justify-center gap-3">
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Print Options</h4>
                            <div className="flex flex-col gap-3">
                                <div className="flex gap-3">
                                    <a
                                        href={`/print/summary?campaign_id=${campaign.id}`}
                                        target="_blank"
                                        className="flex-1 flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg transition-colors font-medium border border-slate-200 dark:border-slate-600 text-sm w-1/2"
                                    >
                                        <span>📄</span> Print Summary
                                    </a>
                                    <a
                                        href={`/print/orders?campaign_id=${campaign.id}`}
                                        target="_blank"
                                        className="flex-1 flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg transition-colors font-medium border border-slate-200 dark:border-slate-600 text-sm w-1/2"
                                    >
                                        <span>🏷️</span> Print Labels
                                    </a>
                                </div>
                                <a
                                    href={`/print/supplier-order?campaign_id=${campaign.id}`}
                                    target="_blank"
                                    className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg transition-colors font-medium border border-slate-200 dark:border-slate-600 text-sm"
                                >
                                    <span>📋</span> Print Supplier Order
                                </a>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                Opens a printer-friendly view in a new tab. Scoped exclusively to {campaign.name}.
                            </p>
                            <button
                                onClick={() => setShowQR(true)}
                                className="w-full mt-1 flex items-center justify-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-800/50 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-lg transition-colors font-medium border border-indigo-200 dark:border-indigo-700/50 text-sm"
                            >
                                <span>📱</span> Share via QR Code
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-slate-900/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Customer</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Items</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Total</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800 transition-colors">
                                {subLoading ? (
                                    <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">Loading orders...</td></tr>
                                ) : filteredOrders.length === 0 ? (
                                    <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">No orders found for this campaign.</td></tr>
                                ) : (
                                    filteredOrders.map(order => (
                                        <tr key={order.ID} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                                            <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">#{order.ID}</td>
                                            <td className="px-6 py-4 text-sm">
                                                <div className="font-medium text-slate-900 dark:text-white">{order.Name}</div>
                                                <div className="text-slate-500 dark:text-slate-400 text-xs">{order.Email}</div>
                                                {order.Phone && <div className="text-slate-500 dark:text-slate-400 text-xs">{order.Phone}</div>}
                                                {order.StudentName && <div className="text-slate-500 dark:text-slate-400 text-xs mt-1 bg-slate-100 dark:bg-slate-700/50 inline-block px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">Student: {order.StudentName}</div>}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                                {order.Items && order.Items.length > 0 ? (
                                                    <ul className="list-disc list-inside text-xs">
                                                        {order.Items.map((item, idx) => (
                                                            <li key={idx}>{item.Quantity}x {item.CategoryName ? `${item.CategoryName} - ` : ''}{item.ProductName}</li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <span className="text-slate-400 dark:text-slate-500 italic">No items</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
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
            
            {showQR && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity p-4" onClick={() => setShowQR(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl overflow-hidden max-w-sm w-full transition-transform transform scale-100 border border-slate-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
                            <h3 className="font-semibold text-slate-800 dark:text-white">Share Fundraiser</h3>
                            <button onClick={() => setShowQR(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                        <div className="p-6 flex flex-col items-center">
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-inner mb-5 inline-block">
                                <img src={qrCodeUrl} alt="Campaign QR Code" className="w-48 h-48 mix-blend-multiply" crossOrigin="anonymous" />
                            </div>
                            
                            <div className="w-full mb-6">
                                <p className="text-xs text-center font-medium text-slate-500 dark:text-slate-400 mb-1">Public Link</p>
                                <div className="flex focus-within:ring-2 focus-within:ring-primary-500 rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden bg-slate-50 dark:bg-slate-900 transition-shadow">
                                    <input type="text" readOnly value={campaignUrl} className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-600 dark:text-slate-300 px-3 py-2 w-full outline-none" onClick={(e) => e.target.select()} />
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(campaignUrl);
                                            // Quick visual feedback could be added here
                                        }}
                                        className="px-3 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors border-l border-slate-300 dark:border-slate-600 cursor-pointer"
                                        title="Copy to clipboard"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                                    </button>
                                </div>
                            </div>

                            <a 
                                href={qrCodeUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => {
                                    e.preventDefault();
                                    fetch(qrCodeUrl)
                                        .then(res => res.blob())
                                        .then(blob => {
                                            const url = window.URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.style.display = 'none';
                                            a.href = url;
                                            a.download = `${campaign?.name?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'campaign'}_qr.png`;
                                            document.body.appendChild(a);
                                            a.click();
                                            window.URL.revokeObjectURL(url);
                                        })
                                        .catch(() => {
                                            window.open(qrCodeUrl, '_blank');
                                        });
                                }}
                                className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 focus:ring-2 focus:ring-offset-1 focus:ring-primary-500"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                Download Image
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

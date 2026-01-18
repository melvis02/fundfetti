import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import UploadForm from './UploadForm';
import { useAdmin } from '../context/AdminContext';

export default function Dashboard() {
    const [orders, setOrders] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const { currentOrg } = useAdmin();

    useEffect(() => {
        console.log("Dashboard useEffect triggered. currentOrg:", currentOrg);
        fetchOrders();
        fetchCampaigns();
    }, [currentOrg]);

    const fetchCampaigns = async () => {
        if (!currentOrg) {
            setCampaigns([]);
            return;
        }
        try {
            const res = await fetch(`/api/organizations/${currentOrg.id}/campaigns`);
            if (res.ok) {
                const data = await res.json();
                setCampaigns(data || []);
            }
        } catch (e) {
            console.error("Failed to fetch campaigns", e);
        }
    };

    const fetchOrders = async () => {
        setLoading(true);
        try {
            // TODO: Use currentOrg.id to filter orders
            const endpoint = currentOrg ? `/api/orders?org_id=${currentOrg.id}` : '/api/orders';
            console.log("Fetching orders from:", endpoint);
            const res = await fetch(endpoint);
            if (res.ok) {
                const data = await res.json();
                console.log("Orders received:", data ? data.length : 0);
                setOrders(data || []);
            }
        } catch (error) {
            console.error("Failed to fetch orders", error);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id, field, value) => {
        // Optimistic update
        setOrders(orders.map(o => o.ID === id ? { ...o, [field]: value } : o));

        try {
            // Find current state to toggle
            const order = orders.find(o => o.ID === id);
            const payload = {
                picked_up: field === 'PickedUp' ? value : order.PickedUp,
                paid: field === 'Paid' ? value : order.Paid,
            };

            const res = await fetch(`/api/orders/${id}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Failed to update");
        } catch (error) {
            console.error("Update failed", error);
            fetchOrders(); // Revert on error
        }
    };

    return (
        <div className="min-h-screen font-sans text-slate-800">
            <div className="container mx-auto px-6 py-8">

                {/* Upload Card */}
                <div className="bg-white rounded-xl shadow-md border border-slate-100 p-6 mb-8 relative z-10">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="bg-primary-100 text-primary-700 p-1.5 rounded-md text-sm">📥</span>
                        Import Orders
                    </h2>
                    <UploadForm onUploadSuccess={fetchOrders} campaigns={campaigns} />
                </div>

                {/* Orders Table Card */}
                <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-700 p-1.5 rounded-md text-sm">📋</span>
                            All Orders
                            <span className="ml-2 text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                {orders.length} entries
                            </span>
                        </h2>
                        <div className="flex gap-2">
                            <a href="/print/summary" target="_blank" className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors font-medium border border-slate-200 text-sm">
                                <span>📄</span> Summary
                            </a>
                            <a href="/print/orders" target="_blank" className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors font-medium border border-slate-200 text-sm">
                                <span>🏷️</span> Labels
                            </a>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Order #</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Picked Up</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Paid</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Items</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-12"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-32"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-48"></div></td>
                                            <td className="px-6 py-4" colSpan="3"><div className="h-4 bg-slate-100 rounded w-full"></div></td>
                                        </tr>
                                    ))
                                ) : orders.length === 0 ? (
                                    <tr><td colSpan="7" className="text-center py-12 text-slate-500">
                                        <div className="mb-2 text-4xl">📦</div>
                                        No orders found. Upload a CSV to get started.
                                    </td></tr>
                                ) : (
                                    orders.map((order) => (
                                        <tr key={order.ID} className="hover:bg-primary-50/30 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-400">#{order.ID}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-semibold text-slate-900">{order.Name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-slate-600">{order.Email}</div>
                                                <div className="text-xs text-slate-400 mt-0.5">{order.Phone}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <button
                                                    onClick={() => updateStatus(order.ID, 'PickedUp', !order.PickedUp)}
                                                    className={`
                            relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2
                            ${order.PickedUp ? 'bg-primary-600' : 'bg-slate-200'}
                          `}
                                                >
                                                    <span className={`${order.PickedUp ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <button
                                                    onClick={() => updateStatus(order.ID, 'Paid', !order.Paid)}
                                                    className={`
                            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-all
                            ${order.Paid
                                                            ? 'bg-green-100 text-green-800 border border-green-200 hover:bg-green-200'
                                                            : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'}
                          `}
                                                >
                                                    {order.Paid ? 'PAID' : 'UNPAID'}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                {order.Items && order.Items.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {order.Items.map((item, idx) => (
                                                            <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
                                                                <span className="font-bold mr-1 text-slate-800">{item.Quantity}</span> {item.PlantType}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="bg-slate-50 px-6 py-3 border-t border-slate-100">
                        <p className="text-xs text-slate-500 text-center">
                            Fundfetti Order Management System
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

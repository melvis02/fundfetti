import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api';
import SiteHeader from '../components/SiteHeader';

const renderTextWithLinks = (text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, i) => {
        if (part.match(urlRegex)) {
            return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600 font-medium">{part}</a>;
        }
        return part;
    });
};

export default function PublicCampaign() {
    const { id, orgSlug, campaignSlug } = useParams();
    const [campaign, setCampaign] = useState(null);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState(1); // 1: Products, 2: Info, 3: Review, 4: Success

    // Order State
    const [cart, setCart] = useState({}); // { productId: quantity }
    const [customer, setCustomer] = useState({ name: '', email: '', phone: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchCampaign = async () => {
            try {
                let data;
                if (id) {
                    data = await api.getCampaignPublic(id);
                } else if (orgSlug && campaignSlug) {
                    data = await api.getCampaignBySlug(orgSlug, campaignSlug);
                }
                setCampaign(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchCampaign();
    }, [id, orgSlug, campaignSlug]);

    const categorizedProducts = React.useMemo(() => {
        if (!campaign || !campaign.products) return {};
        const groups = {};
        campaign.products.forEach(p => {
            const catName = p.category_name || "Uncategorized";
            if (!groups[catName]) groups[catName] = [];
            groups[catName].push(p);
        });

        // Sort keys: A-Z, but "Uncategorized" at the end
        const sortedKeys = Object.keys(groups).sort((a, b) => {
            if (a === "Uncategorized") return 1;
            if (b === "Uncategorized") return -1;
            return a.localeCompare(b);
        });

        const sortedGroups = {};
        sortedKeys.forEach(k => sortedGroups[k] = groups[k]);
        return sortedGroups;
    }, [campaign]);

    const updateCart = (pid, qty) => {
        const newCart = { ...cart, [pid]: parseInt(qty) || 0 };
        if (newCart[pid] <= 0) delete newCart[pid];
        setCart(newCart);
    };

    const cartTotal = () => {
        if (!campaign) return 0;
        return Object.entries(cart).reduce((total, [pid, qty]) => {
            const product = campaign.products?.find(p => p.id === parseInt(pid));
            return total + (product ? product.price_cents * qty : 0);
        }, 0);
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const items = Object.entries(cart).map(([pid, qty]) => {
                const product = campaign.products?.find(p => p.id === parseInt(pid));
                return { ProductID: parseInt(pid), ProductName: product.name, Quantity: qty }; // Backend maps ProductName to Name, and now ProductID
            });

            await api.submitOrder({
                campaign_id: campaign.id,
                ...customer,
                items
            });
            setStep(4);
        } catch (e) {
            alert("Order failed! Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-200"><SiteHeader /><div className="flex h-[calc(100vh-64px)] items-center justify-center">Loading...</div></div>;
    if (!campaign) return <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-200"><SiteHeader /><div className="flex h-[calc(100vh-64px)] items-center justify-center text-slate-500 dark:text-slate-400 text-lg">Fundraiser Not Found</div></div>;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-200">
            <SiteHeader />
            {/* Header / Hero */}
            <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700 transition-colors">
                <div className="container mx-auto px-6 py-6 max-w-4xl">
                    <div className="text-center relative">
                        {campaign.organization_name && (
                            <div className="text-sm font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest mb-2">{campaign.organization_name}</div>
                        )}
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">{campaign.name}</h1>
                        <p className="text-slate-500 dark:text-slate-400 mb-4">{campaign.description || "Support our fundraiser by ordering below!"}</p>
                        {campaign.catalog_url && (
                            <div className="mb-4">
                                <a href={campaign.catalog_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium">
                                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                    View Product Catalog
                                </a>
                            </div>
                        )}
                        {step < 4 && (
                            <div className="flex justify-center mt-6 space-x-2">
                                <div className={`h-2 w-12 rounded-full ${step >= 1 ? 'bg-primary-600 dark:bg-primary-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                                <div className={`h-2 w-12 rounded-full ${step >= 2 ? 'bg-primary-600 dark:bg-primary-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                                <div className={`h-2 w-12 rounded-full ${step >= 3 ? 'bg-primary-600 dark:bg-primary-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 py-8 max-w-4xl">

                {/* Step 1: Products */}
                {step === 1 && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 transition-colors">
                        {campaign.header_text && (
                            <div className="mb-6 bg-blue-50 dark:bg-indigo-900/30 border border-blue-100 dark:border-indigo-800/50 rounded-lg p-4 text-blue-900 dark:text-indigo-100 shadow-sm whitespace-pre-wrap transition-colors">
                                {campaign.header_text}
                            </div>
                        )}
                        <h2 className="text-xl font-semibold mb-6 flex text-slate-900 dark:text-white">Select Items</h2>
                        <div className="space-y-8">
                            {Object.entries(categorizedProducts).map(([category, products]) => (
                                <div key={category}>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">{category}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {products.map(product => (
                                            <div key={product.id} className="flex items-center justify-between gap-4 p-4 border rounded-lg border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 h-full transition-colors">
                                                <div>
                                                    <h4 className="font-semibold text-slate-900 dark:text-white">{product.name}</h4>
                                                    <p className="text-slate-500 dark:text-slate-400 text-sm">{product.description}</p>
                                                    <div className="text-primary-600 dark:text-primary-400 font-medium mt-1">${(product.price_cents / 100).toFixed(2)}</div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => updateCart(product.id, (cart[product.id] || 0) - 1)}
                                                        className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-lg font-bold transition-colors"
                                                    >-</button>
                                                    <span className="w-8 text-center font-medium text-slate-900 dark:text-white">{cart[product.id] || 0}</span>
                                                    <button
                                                        onClick={() => updateCart(product.id, (cart[product.id] || 0) + 1)}
                                                        className="w-8 h-8 rounded-full bg-primary-600 dark:bg-primary-500 text-white hover:bg-primary-700 dark:hover:bg-primary-600 flex items-center justify-center text-lg font-bold transition-colors"
                                                    >+</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-6">
                            <div className="text-xl font-bold text-slate-900 dark:text-white">Total: ${(cartTotal() / 100).toFixed(2)}</div>
                            <button
                                onClick={() => setStep(2)}
                                disabled={cartTotal() === 0}
                                className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Continue →
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Details */}
                {step === 2 && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 max-w-2xl mx-auto transition-colors">
                        {campaign.header_text && (
                            <div className="mb-6 bg-blue-50 dark:bg-indigo-900/30 border border-blue-100 dark:border-indigo-800/50 rounded-lg p-4 text-blue-900 dark:text-indigo-100 shadow-sm whitespace-pre-wrap transition-colors">
                                {campaign.header_text}
                            </div>
                        )}
                        <h2 className="text-xl font-semibold mb-6 flex text-slate-900 dark:text-white">Your Details</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                                <input type="text" required placeholder="Jane Doe" className="form-input w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-teal-500 focus:ring-teal-500 transition-colors" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                                <input type="email" required placeholder="jane@example.com" className="form-input w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-teal-500 focus:ring-teal-500 transition-colors" value={customer.email} onChange={e => setCustomer({ ...customer, email: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                                <input type="tel" required placeholder="(555) 123-4567" className="form-input w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-teal-500 focus:ring-teal-500 transition-colors" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} />
                            </div>
                        </div>
                        <div className="mt-8 flex justify-between border-t border-slate-100 dark:border-slate-700 pt-6">
                            <button onClick={() => setStep(1)} className="text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-white transition-colors">← Back</button>
                            <button
                                onClick={() => setStep(3)}
                                disabled={!customer.name || !customer.email || !customer.phone}
                                className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg font-semibold disabled:opacity-50 transition-colors"
                            >
                                Review Order →
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Review */}
                {step === 3 && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 max-w-2xl mx-auto transition-colors">
                        <h2 className="text-xl font-semibold mb-6 flex text-slate-900 dark:text-white">Review Order</h2>
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 mb-6 space-y-2 text-sm text-slate-700 dark:text-slate-300 transition-colors">
                            <div className="flex justify-between"><span className="font-medium text-slate-900 dark:text-white">Name:</span> {customer.name}</div>
                            <div className="flex justify-between"><span className="font-medium text-slate-900 dark:text-white">Email:</span> {customer.email}</div>
                            <div className="flex justify-between"><span className="font-medium text-slate-900 dark:text-white">Phone:</span> {customer.phone}</div>
                        </div>

                        <div className="space-y-3 mb-6">
                            {Object.entries(cart).map(([pid, qty]) => {
                                const product = campaign.products?.find(p => p.id === parseInt(pid));
                                return (
                                    <div key={pid} className="flex justify-between text-slate-700 dark:text-slate-300">
                                        <span>{product.name} <span className="text-slate-400 dark:text-slate-500">x{qty}</span></span>
                                        <span>${((product.price_cents * qty) / 100).toFixed(2)}</span>
                                    </div>
                                )
                            })}
                            <div className="border-t border-dashed border-slate-300 dark:border-slate-600 pt-3 flex justify-between font-bold text-lg text-slate-900 dark:text-white">
                                <span>Total</span>
                                <span>${(cartTotal() / 100).toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-between border-t border-slate-100 dark:border-slate-700 pt-6">
                            <button onClick={() => setStep(2)} className="text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-white transition-colors">← Edit Details</button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold disabled:opacity-50 transition-colors w-full ml-4"
                            >
                                {submitting ? 'Placing Order...' : 'Submit Order'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4: Success */}
                {step === 4 && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 text-center max-w-2xl mx-auto transition-colors">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Order Received!</h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">Thank you for supporting {campaign.name}. We've sent a confirmation email to {customer.email}.</p>

                        {campaign.header_text && (
                            <div className="mb-8 text-left bg-blue-50 dark:bg-indigo-900/30 border border-blue-100 dark:border-indigo-800/50 rounded-lg p-4 text-blue-900 dark:text-indigo-100 shadow-sm whitespace-pre-wrap transition-colors">
                                {campaign.header_text}
                            </div>
                        )}

                        {(campaign.payment_metadata || campaign.organization_payment_metadata) && (
                            <div className="bg-blue-50 dark:bg-indigo-900/30 border border-blue-100 dark:border-indigo-800/50 rounded-lg p-4 text-left max-w-sm mx-auto mb-8 transition-colors">
                                <h3 className="font-semibold text-blue-900 dark:text-indigo-200 mb-2 text-sm uppercase tracking-wide">Payment Instructions</h3>
                                <p className="text-blue-800 dark:text-indigo-300 text-sm whitespace-pre-wrap">{renderTextWithLinks(campaign.payment_metadata || campaign.organization_payment_metadata)}</p>
                            </div>
                        )}

                        <div className="border-t border-slate-100 dark:border-slate-700 pt-6 mb-8 max-w-sm mx-auto text-left">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">Order Summary</h3>
                            <div className="space-y-2 mb-4">
                                {Object.entries(cart).map(([pid, qty]) => {
                                    const product = campaign.products?.find(p => p.id === parseInt(pid));
                                    return (
                                        <div key={pid} className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                                            <span>{product.name} <span className="text-slate-400 dark:text-slate-500">x{qty}</span></span>
                                            <span>${((product.price_cents * qty) / 100).toFixed(2)}</span>
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="border-t border-dashed border-slate-200 dark:border-slate-600 pt-2 flex justify-between font-bold text-slate-900 dark:text-white">
                                <span>Total Due</span>
                                <span>${(cartTotal() / 100).toFixed(2)}</span>
                            </div>
                        </div>

                        <button onClick={() => window.location.reload()} className="text-primary-600 hover:text-primary-800 font-medium">Place Another Order</button>
                    </div>
                )}

            </div>
        </div>
    );
}

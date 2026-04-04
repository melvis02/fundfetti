import React, { useState, useEffect } from 'react';

export default function PrintSupplierOrder() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const orgId = params.get('org_id');
        const endpoint = orgId ? `/api/orders?org_id=${orgId}` : '/api/orders';

        fetch(endpoint)
            .then(res => {
                if (!res.ok) throw new Error('Failed to load orders');
                return res.json();
            })
            .then(data => setOrders(data || []))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-8">Loading...</div>;
    if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

    // Aggregate data
    const categoryStats = {};
    let overallTotalCents = 0;

    orders.forEach(order => {
        if (!order.Items) return;
        order.Items.forEach(item => {
            const cat = item.CategoryName || 'Uncategorized';
            if (!categoryStats[cat]) {
                categoryStats[cat] = {};
            }
            if (!categoryStats[cat][item.PlantType]) {
                categoryStats[cat][item.PlantType] = {
                    count: 0,
                    priceCents: item.PriceCents || 0
                };
            }
            categoryStats[cat][item.PlantType].count += item.Quantity;
        });
    });

    // Convert to sorted array
    const sortedCategories = Object.keys(categoryStats).sort().map(catName => {
        const productsMap = categoryStats[catName];
        const products = Object.keys(productsMap).sort().map(prodName => ({
            name: prodName,
            ...productsMap[prodName]
        }));
        return { name: catName, products };
    });

    const formatMoney = (cents) => {
        return `$${(cents / 100).toFixed(2)}`;
    };

    const isUnderMinimum = false; // Could be computed based on total count
    const underMinimumFeeCents = 10000; // $100

    let grandTotalCount = 0;

    return (
        <>
            <div className="no-print p-6 bg-slate-50 border-b border-slate-200 mb-8">
                <div className="container mx-auto max-w-4xl flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Supplier Order Summary</h1>
                        <p className="text-slate-600 mt-2">
                            You can now print this page using the browser's print dialog (Cmd+P / Ctrl+P).
                            This header will be hidden automatically.
                        </p>
                    </div>
                    <button 
                        onClick={() => window.print()}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition shadow-sm"
                    >
                        Print Summary
                    </button>
                </div>
            </div>

            <div className="p-8 max-w-5xl mx-auto font-sans print:p-0 print:max-w-none text-gray-900">
                <div className="flex mb-8">
                    {/* Placeholder for Left Sidebar / Branding area if needed */}
                    <div className="w-1/3 pr-8 flex flex-col justify-between">
                        <div>
                            <h1 className="text-3xl font-serif font-bold text-pink-700 mb-1">T H I N K</h1>
                            <p className="text-xs font-bold tracking-widest uppercase mb-4 text-gray-600">Supplier Order Summary</p>
                            <h2 className="text-2xl font-serif text-lime-600 mb-2">SPRING</h2>
                            <h3 className="text-4xl font-bold mb-4">Master</h3>
                            <h3 className="text-4xl font-bold mb-8">Order</h3>
                        </div>
                        
                        <div className="mt-auto border-t-2 border-black pt-4">
                            <h4 className="text-xl font-bold uppercase tracking-widest text-gray-800 mb-4">GROUP NAME</h4>
                            <div className="w-full h-8 border-b border-gray-400"></div>
                        </div>
                    </div>

                    <div className="w-2/3">
                        <table className="w-full text-sm border-collapse bg-stone-100/50">
                            <thead>
                                <tr className="border-b border-gray-400 text-xs text-gray-600 pb-2">
                                    <th className="font-bold text-left align-bottom px-2 py-2 w-1/4"></th>
                                    <th className="font-bold text-left align-bottom px-2 py-2"></th>
                                    <th className="font-bold text-center align-bottom px-2 py-2 w-20 leading-tight">NUMBER<br/>OF ITEMS</th>
                                    <th className="font-bold text-center align-bottom px-2 py-2 w-20 leading-tight border-l border-gray-300">COST OF<br/>ITEMS</th>
                                    <th className="font-bold text-center align-bottom px-2 py-2 w-24 border-l border-gray-300">TOTAL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedCategories.map((cat, catIdx) => (
                                    <React.Fragment key={cat.name}>
                                        {cat.products.map((prod, prodIdx) => {
                                            const totalCents = prod.count * prod.priceCents;
                                            overallTotalCents += totalCents;
                                            grandTotalCount += prod.count;
                                            const isFirstProd = prodIdx === 0;
                                            
                                            return (
                                                <tr key={prod.name} className="border-b border-gray-300">
                                                    {isFirstProd ? (
                                                        <td 
                                                            rowSpan={cat.products.length} 
                                                            className="text-right font-bold align-top pr-3 py-2 uppercase tracking-wide text-gray-700 bg-stone-200/40"
                                                        >
                                                            {cat.name}
                                                        </td>
                                                    ) : null}
                                                    <td className="py-1 px-2 font-medium text-gray-800">
                                                        {prod.name}
                                                    </td>
                                                    <td className="text-center font-bold font-mono py-1 border-x border-gray-300">
                                                        {prod.count > 0 ? prod.count : ''}
                                                    </td>
                                                    <td className="text-right px-2 font-mono text-gray-600">
                                                        {formatMoney(prod.priceCents)}
                                                    </td>
                                                    <td className="text-right px-2 font-mono font-bold border-l border-gray-300 bg-white/60">
                                                        {prod.count > 0 ? formatMoney(totalCents) : ''}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                ))}
                            </tbody>
                            <tfoot className="border-t-2 border-black font-bold">
                                <tr>
                                    <td colSpan={2} className="text-right py-4 pr-3 uppercase">Total Due</td>
                                    <td className="text-center font-mono py-4 border-l border-gray-300">{grandTotalCount}</td>
                                    <td className="border-l border-gray-300"></td>
                                    <td className="text-right px-2 py-4 font-mono text-lg border-l border-gray-300 bg-stone-200">
                                        {formatMoney(overallTotalCents)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                <div className="mt-8 text-right text-xs text-gray-500">
                    Generated: {new Date().toLocaleDateString()}
                </div>
            </div>
        </>
    );
}

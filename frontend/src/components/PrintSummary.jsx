import React, { useState, useEffect } from 'react';

export default function PrintSummary() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/orders')
            .then(res => res.json())
            .then(data => setOrders(data || []))
            .catch(err => console.error("Fetch failed", err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div>Loading...</div>;

    return (
        <>
            <div className="no-print p-6 bg-slate-50 border-b border-slate-200 mb-8">
                <div className="container mx-auto max-w-4xl">
                    <h1 className="text-xl font-bold text-slate-800">Summary and Order Sheets</h1>
                    <p className="text-slate-600 mt-2">
                        You can now print this page using the browser's print dialog (Cmd+P / Ctrl+P).
                        This header will be hidden automatically.
                    </p>
                </div>
            </div>

            <div className="p-8 max-w-5xl mx-auto font-serif print:p-0 print:max-w-none">
                <h1 className="text-2xl font-bold mb-6 text-center border-b pb-4 border-black">Order Tracking</h1>
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="border-b-2 border-black">
                            <th className="p-2 text-left font-bold w-12">#</th>
                            <th className="p-2 text-left font-bold">Name</th>
                            <th className="p-2 text-left font-bold">Email</th>
                            <th className="p-2 text-left font-bold">Phone</th>
                            <th className="p-2 text-center font-bold w-20 border-l border-black">Sorted?</th>
                            <th className="p-2 text-center font-bold w-20 border-l border-black">Delivered?</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((order, idx) => (
                            <tr key={order.ID} className="border-b border-gray-300">
                                <td className="p-2">{idx + 1}</td>
                                <td className="p-2 font-medium">{order.Name}</td>
                                <td className="p-2 text-gray-700">{order.Email}</td>
                                <td className="p-2 text-gray-700">{order.Phone}</td>
                                <td className="p-2 border-l border-gray-400"></td>
                                <td className="p-2 border-l border-gray-400"></td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="mt-8 text-right text-xs text-gray-500">
                    Generated: {new Date().toLocaleDateString()}
                </div>
            </div>
            <div className="pagebreak"></div>
        </>
    );
}

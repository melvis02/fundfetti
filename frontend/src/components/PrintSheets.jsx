import React, { useState, useEffect } from 'react';

export default function PrintSheets() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const campaignId = params.get('campaign_id');
        const orgId = params.get('org_id');
        
        let endpoint = '/api/orders';
        if (campaignId) endpoint = `/api/orders?campaign_id=${campaignId}`;
        else if (orgId) endpoint = `/api/orders?org_id=${orgId}`;

        fetch(endpoint)
            .then(res => res.json())
            .then(data => setOrders(data || []))
            .catch(err => console.error("Fetch failed", err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div>Loading...</div>;

    return (
        <div className="p-8 font-sans print:p-0">
            {orders.map((order, idx) => (
                <div key={order.ID} className="mb-0">
                    <div className="bg-white border-2 border-black p-6 mb-4 max-w-2xl mx-auto print:max-w-none print:border-2 print:border-black print:mb-0 print:h-full">

                        <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
                            <div>
                                <h2 className="text-2xl font-bold uppercase tracking-wide">Order #{order.ID}</h2>
                                <h3 className="text-lg font-semibold mt-1">{order.Name}</h3>
                            </div>
                            <div className="text-right text-sm">
                                <p>{order.Email}</p>
                                <p>{order.Phone}</p>
                            </div>
                        </div>

                        <table className="w-full border-collapse mb-8 text-lg">
                            <thead>
                                <tr className="bg-gray-100 print:bg-gray-100">
                                    <th className="border border-black p-3 text-left w-3/4">Product Name</th>
                                    <th className="border border-black p-3 text-center w-1/4">Quantity</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.Items && order.Items.map((item, i) => (
                                    <tr key={i}>
                                        <td className="border border-black p-3 font-medium">
                                            {item.CategoryName ? `${item.CategoryName} - ` : ''}{item.ProductName}
                                        </td>
                                        <td className="border border-black p-3 text-center font-bold text-xl">{item.Quantity}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Notes Section for Volunteers */}
                        <div className="border border-black p-4 bg-gray-50 print:bg-white text-sm">
                            <p className="font-bold mb-2 uppercase text-xs tracking-wider text-gray-600">Notes / Comments</p>
                            <div className="w-full h-24 border-t-2 border-dotted border-gray-300 mt-6 print:border-gray-400"></div>
                        </div>

                    </div>
                    <div className="pagebreak"></div>
                </div>
            ))}
        </div>
    );
}

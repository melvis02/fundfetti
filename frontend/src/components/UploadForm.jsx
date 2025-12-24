import React, { useState } from 'react';

export default function UploadForm({ onUploadSuccess }) {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) return;

        setUploading(true);
        setMessage(null);

        const formData = new FormData();
        formData.append('orders_sheets', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                setMessage({ type: 'success', text: data.message });
                setFile(null);
                if (onUploadSuccess) onUploadSuccess();
            } else {
                const text = await res.text();
                setMessage({ type: 'error', text: `Upload failed: ${text}` });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Upload failed: Network error' });
        } finally {
            setUploading(false);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    return (
        <div className="w-full">
            <form onSubmit={handleSubmit}>
                <div
                    className={`
            border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors cursor-pointer
            ${isDragOver ? 'border-primary-500 bg-primary-50' : 'border-slate-300 hover:bg-slate-50'}
            ${file ? 'bg-primary-50 border-primary-500' : ''}
          `}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('file-upload').click()}
                >
                    <input
                        id="file-upload"
                        type="file"
                        accept=".csv,.tsv,.txt"
                        onChange={(e) => setFile(e.target.files[0])}
                        className="hidden"
                    />

                    <div className="text-4xl text-slate-300 mb-3">
                        {file ? '📄' : '📁'}
                    </div>

                    {file ? (
                        <div className="text-center">
                            <p className="font-semibold text-primary-700">{file.name}</p>
                            <p className="text-xs text-primary-500 mt-1">Ready to upload</p>
                        </div>
                    ) : (
                        <div className="text-center">
                            <p className="text-sm font-medium text-slate-700">
                                <span className="text-primary-600 hover:text-primary-700">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-slate-500 mt-1">CSV or TSV files only</p>
                        </div>
                    )}
                </div>

                {file && (
                    <div className="mt-4 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setFile(null); setMessage(null); }}
                            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={uploading}
                            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-70 disabled:cursor-not-allowed font-medium shadow-sm transition-all"
                        >
                            {uploading ? 'Processing...' : 'Process Orders'}
                        </button>
                    </div>
                )}

                {message && (
                    <div className={`mt-4 p-3 rounded-md text-sm border flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        <span>{message.type === 'success' ? '✅' : '❌'}</span>
                        {message.text}
                    </div>
                )}
            </form>
        </div>
    );
}

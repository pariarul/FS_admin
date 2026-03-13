import React, { useState } from "react";

interface ProductDeletePayload {
    assetName: string;
    category: string;
    imagePath: string;
    en: {
        imageName: string;
        origins: string[];
    };
    si: {
        imageName: string;
        origins: string[];
    };
    zh: {
        imageName: string;
        origins: string[];
    };
}

interface DeleteProductsModalProps {
    open: boolean;
    onClose: () => void;
    onDelete: (payload: ProductDeletePayload) => void;
    product: ProductDeletePayload;
}

const DeleteProductsModal: React.FC<DeleteProductsModalProps> = ({ open, onClose, onDelete, product }) => {
    const [isLoading, setIsLoading] = useState(false);
    if (!open) return null;

    const handleDelete = async () => {
        setIsLoading(true);
        try {
            await onDelete(product);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
                <h2 className="text-2xl font-bold mb-4 text-red-600">Are you sure?</h2>
                <p className="mb-6 text-gray-700">Do you really want to delete this import product? This action cannot be undone.</p>
                <div className="flex gap-4 justify-end">
                    <button
                        className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center justify-center min-w-[90px]"
                        onClick={handleDelete}
                        disabled={isLoading}
                    >
                        {isLoading ? <span className="animate-spin mr-2">⏳</span> : null}
                        {isLoading ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteProductsModal;
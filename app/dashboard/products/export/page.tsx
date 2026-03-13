'use client';

import React, { useEffect, useState } from 'react';
import { Box, Plus, Edit3, Trash2, Globe, Image, ChevronDown } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import LoadingAnimation from '../../components/loading-animation';

import AddExportProductsModal from "./components/AddProducts";
import EditExportProductModal from "./components/EditProduct";
import DeleteExportProductsModal from "./components/DeleteProducts";

// TYPES
interface ProductItem {
    imagePath: string;
    imageName: string;
    origins: string[];
    category: string; // language-specific category
}

interface CategoryData {
    en: { category: string; assetName: string };
    zh: { category: string; assetName: string };
    si: { category: string; assetName: string };
    items: {
        imagePath: string;
        en: { imageName: string; origins: string[] };
        zh: { imageName: string; origins: string[] };
        si: { imageName: string; origins: string[] };
    }[];
}

interface ExportAPIResponse {
    export: Record<string, CategoryData>;
}

interface MultilingualProduct {
    en: ProductItem;
    zh: ProductItem;
    si: ProductItem;
    categoryKey: string;
}

const ExportProductCMS = () => {
    const [exportData, setExportData] = useState<ExportAPIResponse | null>(null);
    const [openCategoryKey, setOpenCategoryKey] = useState<string | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<MultilingualProduct | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<MultilingualProduct | null>(null);
    const [productToEdit, setProductToEdit] = useState<MultilingualProduct | null>(null);

    const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

    // FETCH EXPORT DATA
    useEffect(() => {
        const fetchExportData = async () => {
            try {
                const res = await fetch(`${baseURL}/products/get-export-products`);
                if (!res.ok) throw new Error("Failed to fetch export data");

                const json = await res.json();

                // API returns: { success: true, data: { export: { … } } }
                if (!json.success || !json.data?.export) {
                    throw new Error(json.message || "Invalid response format");
                }

                const apiResponse: ExportAPIResponse = { export: json.data.export };
                setExportData(apiResponse);

                // Default select first category's first product
                const categoryKeys = Object.keys(apiResponse.export);
                if (categoryKeys.length > 0) {
                    const firstCategoryKey = categoryKeys[0];
                    const firstCategory = apiResponse.export[firstCategoryKey];
                    if (firstCategory.items.length > 0) {
                        setSelectedProduct({
                            en: { ...firstCategory.items[0].en, category: firstCategory.en.category, imagePath: firstCategory.items[0].imagePath },
                            zh: { ...firstCategory.items[0].zh, category: firstCategory.zh.category, imagePath: firstCategory.items[0].imagePath },
                            si: { ...firstCategory.items[0].si, category: firstCategory.si.category, imagePath: firstCategory.items[0].imagePath },
                            categoryKey: firstCategoryKey,
                        });
                        setOpenCategoryKey(firstCategoryKey);
                    }
                }
            } catch (err) {
                console.error("Error fetching export data:", err);
            }
        };
        fetchExportData();
    }, [baseURL]);

    // FLATTEN PRODUCTS ACROSS CATEGORIES
    const allProducts: MultilingualProduct[] = [];
    if (exportData) {
        Object.keys(exportData.export).forEach((categoryKey) => {
            const cat = exportData.export[categoryKey];
            cat.items.forEach((item) => {
                allProducts.push({
                    en: { ...item.en, category: cat.en.category, imagePath: item.imagePath },
                    zh: { ...item.zh, category: cat.zh.category, imagePath: item.imagePath },
                    si: { ...item.si, category: cat.si.category, imagePath: item.imagePath },
                    categoryKey,
                });
            });
        });
    }

    // SELECT PRODUCT
    const handleProductClick = (product: MultilingualProduct) => {
        const categoryData = exportData?.export[product.categoryKey];
        if (!categoryData) return;

        setSelectedProduct({
            en: {
                ...product.en,
                category: categoryData.en.category,
            },
            zh: {
                ...product.zh,
                category: categoryData.zh.category,
            },
            si: {
                ...product.si,
                category: categoryData.si.category,
            },
            categoryKey: product.categoryKey,
        });
    };

    // Accordion toggle for categories
    const handleCategoryToggle = (categoryKey: string) => {
        setOpenCategoryKey(prev => prev === categoryKey ? null : categoryKey);
    };

    // BUILD DELETE PAYLOAD
    const buildDeletePayload = (product: MultilingualProduct) => {
        const cat = exportData?.export[product.categoryKey];
        return {
            assetName: cat?.en.assetName || '',
            category: cat?.en.category || '',
            imagePath: product.en.imagePath,
            en: { imageName: product.en.imageName, origins: product.en.origins },
            si: { imageName: product.si.imageName, origins: product.si.origins },
            zh: { imageName: product.zh.imageName, origins: product.zh.origins },
        };
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <LoadingAnimation />
            <div className="fixed w-64">
                <Sidebar />
            </div>

            <main className="flex-1 p-8 max-w-[1600px] mx-auto ml-64">
                {/* HEADER */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
                            Export Products
                        </h1>
                        <p className="text-gray-600 flex items-center gap-2">
                            <Globe className="w-4 h-4" /> Manage your multilingual product catalog
                        </p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-6 py-3 bg-gradient-to-r from-primary to-primary text-white rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center gap-2 font-semibold"
                    >
                        <Plus className="w-5 h-5" /> Add Product
                    </button>
                </div>

                <div className="flex gap-6">
                    {/* LEFT PANEL */}
                    <div className="w-80 bg-white rounded-2xl shadow-lg border border-gray-100 h-[calc(100vh-180px)] overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50">
                            <h2 className="text-lg font-bold text-gray-800">Products</h2>
                            <p className="text-xs text-gray-500 mt-1">
                                Total Products: {allProducts.length}
                            </p>
                        </div>
                        <div className="overflow-y-auto flex-1 p-4">
                            {exportData &&
                                Object.keys(exportData.export).map((categoryKey) => {
                                    const cat = exportData.export[categoryKey];
                                    const isOpen = openCategoryKey === categoryKey;
                                    return (
                                        <div key={categoryKey} className="mb-4">
                                            {/* Category Header */}
                                            <button
                                                className="w-full font-bold text-gray-700 mb-2 flex justify-between items-center px-2 py-2 rounded-lg hover:bg-gray-50 transition-all"
                                                onClick={() => handleCategoryToggle(categoryKey)}
                                                type="button"
                                            >
                                                <span>{cat.en.category}</span>
                                                <span className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500">{cat.items.length}</span>
                                                    <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                                </span>
                                            </button>

                                            {/* Products inside category */}
                                            {isOpen && (
                                                <div className="ml-4 flex flex-col gap-1">
                                                    {cat.items.map((item, idx) => {
                                                        const isSelected = selectedProduct?.en.imagePath === item.imagePath;
                                                        const prod: MultilingualProduct = {
                                                            en: { ...item.en, category: cat.en.category, imagePath: item.imagePath },
                                                            zh: { ...item.zh, category: cat.zh.category, imagePath: item.imagePath },
                                                            si: { ...item.si, category: cat.si.category, imagePath: item.imagePath },
                                                            categoryKey,
                                                        };

                                                        return (
                                                            <button
                                                                key={idx}
                                                                onClick={() => handleProductClick(prod)}
                                                                className={`w-full text-left text-sm px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${isSelected
                                                                    ? 'bg-primary text-white font-semibold border-l-3 border-primary shadow-sm'
                                                                    : 'hover:bg-gray-50 text-gray-600'
                                                                    }`}
                                                            >
                                                                <Image className="w-4 h-4" />
                                                                {item.en.imageName}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                    </div>

                    {/* RIGHT PANEL */}
                    <div className="flex-1 overflow-y-auto h-[calc(100vh-180px)] bg-white rounded-2xl shadow-lg border border-gray-100">
                        {!selectedProduct ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                                    <Image className="w-12 h-12 text-gray-400" />
                                </div>
                                <p className="text-lg font-medium">Select a product to view details</p>
                                <p className="text-sm mt-1">Choose from the products on the left</p>
                            </div>
                        ) : (
                            <div className="p-8">
                                {/* PRODUCT IMAGE & ACTIONS */}
                                <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 mb-6 border border-gray-100">
                                    <div className="flex items-start gap-6">
                                        <div className="relative group">
                                            <img
                                                src={selectedProduct.en.imagePath}
                                                alt={selectedProduct.en.imageName}
                                                className="w-50 h-60 object-cover rounded-2xl shadow-lg border-4 border-white"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-2xl transition-all duration-200"></div>
                                        </div>
                                        <div className="flex-1">
                                            <h2 className="text-3xl font-bold text-gray-900 mb-4">{selectedProduct.en.imageName}</h2>
                                            <div className="flex gap-3 mb-6">
                                                <button
                                                    className="px-6 py-2 min-w-[110px] bg-primary text-white rounded-lg hover:bg-primary-dark flex items-center gap-2"
                                                    onClick={() => {
                                                        setProductToEdit(selectedProduct);
                                                        setIsEditModalOpen(true);
                                                    }}
                                                >
                                                    <Edit3 className="w-4 h-4" /> Edit
                                                </button>
                                                <button
                                                    className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:border-red-300 hover:text-red-600 transition-all flex items-center gap-2"
                                                    onClick={() => {
                                                        const payload = buildDeletePayload(selectedProduct);
                                                        if (payload) {
                                                            setProductToDelete(selectedProduct);
                                                            setIsDeleteModalOpen(true);
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" /> Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* MULTILINGUAL INFO */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {['en', 'zh', 'si'].map((lang) => {
                                        const prodLang = selectedProduct[lang as keyof MultilingualProduct] as ProductItem;
                                        const categoryLabel = lang === 'en' ? 'Category' : lang === 'zh' ? '类别' : 'වර්ගය';
                                        const originsLabel = lang === 'en' ? 'Origins' : lang === 'zh' ? '来源' : 'මූලාශ්‍ර';

                                        return (
                                            <div
                                                key={lang}
                                                className="p-6 rounded-2xl border-2 shadow-sm hover:shadow-md transition-all duration-200"
                                            >
                                                <div className="flex items-center gap-2 mb-4">
                                                    
                                                    <h3 className="font-bold text-gray-700 text-lg">
                                                        {lang === 'en' ? 'English' : lang === 'zh' ? 'Mandarin' : 'Sinhala'}
                                                    </h3>
                                                </div>
                                                <p className="font-semibold text-xl text-gray-900 mb-3">{prodLang.imageName}</p>
                                                <div className="bg-white/70 rounded-lg p-3 border border-gray-100 space-y-2">
                                                    <div>
                                                        <p className="text-xs text-gray-500 font-medium mb-1">{categoryLabel}</p>
                                                        <p className="text-sm text-gray-700">{prodLang.category}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500 font-medium mb-1">{originsLabel}</p>
                                                        <p className="text-sm text-gray-700">{prodLang.origins.join(', ')}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* MODALS */}
                {productToDelete && (
                    <DeleteExportProductsModal
                        open={isDeleteModalOpen}
                        onClose={() => setIsDeleteModalOpen(false)}
                        onDelete={async (payload) => {
                            try {
                                const res = await fetch(`${baseURL}/products/delete-export-product`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(payload),
                                });
                                if (!res.ok) throw new Error('Failed to delete product');
                                window.location.reload();
                            } catch (err) {
                                console.error(err);
                            }
                            setIsDeleteModalOpen(false);
                            setProductToDelete(null);
                        }}
                        product={buildDeletePayload(productToDelete)}
                    />
                )}

                {isModalOpen && <AddExportProductsModal
                    onClose={() => setIsModalOpen(false)}
                    exportData={exportData ? {
                        en: Object.values(exportData.export).map(value => ({
                            category: value.en.category,
                            items: value.items.map(item => ({
                                imagePath: item.imagePath,
                                imageName: item.en.imageName,
                                origins: item.en.origins,
                                category: value.en.category
                            })),
                            en: value.en,
                            si: value.si,
                            zh: value.zh,
                        })),
                        si: Object.values(exportData.export).map(value => ({
                            category: value.si.category,
                            items: value.items.map(item => ({
                                imagePath: item.imagePath,
                                imageName: item.si.imageName,
                                origins: item.si.origins,
                                category: value.si.category
                            })),
                            en: value.en,
                            si: value.si,
                            zh: value.zh,
                        })),
                        zh: Object.values(exportData.export).map(value => ({
                            category: value.zh.category,
                            items: value.items.map(item => ({
                                imagePath: item.imagePath,
                                imageName: item.zh.imageName,
                                origins: item.zh.origins,
                                category: value.zh.category
                            })),
                            en: value.en,
                            si: value.si,
                            zh: value.zh,
                        })),
                        categories: Object.fromEntries(
                            Object.entries(exportData.export).map(([key, value]) => [
                                key,
                                {
                                    category: value.en.category,
                                    items: value.items.map(item => ({
                                        imagePath: item.imagePath,
                                        imageName: item.en.imageName,
                                        origins: item.en.origins,
                                    })),
                                    en: value.en,
                                    si: value.si,
                                    zh: value.zh,
                                },
                            ])
                        ),
                    } : null}
                />}
                {isEditModalOpen && productToEdit && (
                    <EditExportProductModal
                        onClose={() => setIsEditModalOpen(false)}
                        product={{
                            category: exportData?.export[productToEdit.categoryKey].en.category || '',
                            assetName: exportData?.export[productToEdit.categoryKey].en.assetName || '',
                            imagePath: productToEdit.en.imagePath,
                            imageName: productToEdit.en.imageName,
                            origins: productToEdit.en.origins,
                            translations: {
                                zh: {
                                    category: exportData?.export[productToEdit.categoryKey].zh.category || productToEdit.zh.category,
                                    imageName: productToEdit.zh.imageName,
                                    origins: productToEdit.zh.origins,
                                },
                                si: {
                                    category: exportData?.export[productToEdit.categoryKey].si.category || productToEdit.si.category,
                                    imageName: productToEdit.si.imageName,
                                    origins: productToEdit.si.origins,
                                },
                            },
                        }}
                        exportData={exportData ? {
                            en: Object.values(exportData.export).map(value => ({
                                category: value.en.category,
                                items: value.items.map(item => ({
                                    imagePath: item.imagePath,
                                    imageName: item.en.imageName,
                                    origins: item.en.origins,
                                })),
                            })),
                            si: Object.values(exportData.export).map(value => ({
                                category: value.si.category,
                                items: value.items.map(item => ({
                                    imagePath: item.imagePath,
                                    imageName: item.si.imageName,
                                    origins: item.si.origins,
                                })),
                            })),
                            zh: Object.values(exportData.export).map(value => ({
                                category: value.zh.category,
                                items: value.items.map(item => ({
                                    imagePath: item.imagePath,
                                    imageName: item.zh.imageName,
                                    origins: item.zh.origins,
                                })),
                            })),
                            categories: Object.fromEntries(
                                Object.entries(exportData.export).map(([key, value]) => [
                                    key,
                                    {
                                        category: value.en.category,
                                        items: value.items.map(item => ({
                                            imagePath: item.imagePath,
                                            imageName: item.en.imageName,
                                            origins: item.en.origins,
                                        })),
                                        en: value.en,
                                        si: value.si,
                                        zh: value.zh,
                                    },
                                ])
                            ),
                        } : null}
                    />
                )}
            </main>
        </div>
    );
};

export default ExportProductCMS;
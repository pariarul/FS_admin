"use client";

import { useEffect, useState, useMemo } from "react";
import * as XLSX from "xlsx";
import {
    Search,
    Download,
    Calendar,
    Clock,
    Package,
    Phone,
    Mail,
    ChevronDown,
    Loader2,
} from "lucide-react";
import { format, subMonths, startOfDay, isAfter, parseISO, isWithinInterval } from "date-fns";
import Sidebar from "../components/Sidebar";
import LoadingAnimation from "../components/loading-animation";

interface SupplierForm {
    id: string;
    formData: {
        fullname: string;
        companyname: string;
        email: string;
        phone: string;
        country: string;
        businessType: string;
        products: string[];
        quantity?: string;
        enquiry?: string;
        website?: string;
        capacity?: string;
        certifications?: string;
        specificInfo?: string;
        category?: string[];
    };
    date: string;
    time: string;
}

type DateFilter = "all" | "1m" | "3m" | "6m" | "12m" | "custom";

/**
 * Convert "DD/MM/YYYY" to ISO Date (YYYY-MM-DD)
 */
const parseDateString = (dateStr: string): Date | null => {
    try {
        const [day, month, year] = dateStr.split("/").map(Number);
        if (!day || !month || !year) return null;
        const date = new Date(year, month - 1, day);
        return isNaN(date.getTime()) ? null : date;
    } catch {
        return null;
    }
};

const SupplierFormsPage = () => {
    const [supplierForms, setSupplierForms] = useState<SupplierForm[]>([]);
    const [heading, setHeading] = useState<{ en: string; zh: string; si: string } | null>(null);
    const [description, setDescription] = useState<{ en: string; zh: string; si: string } | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [dateFilter, setDateFilter] = useState<DateFilter>("all");
    const [customStart, setCustomStart] = useState("");
    const [customEnd, setCustomEnd] = useState("");
    const [showCustomDates, setShowCustomDates] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editHeading, setEditHeading] = useState<{ en: string; zh: string; si: string }>(
        { en: heading?.en || '', zh: heading?.zh || '', si: heading?.si || '' }
    );
    const [editDescription, setEditDescription] = useState<{ en: string; zh: string; si: string }>(
        { en: description?.en || '', zh: description?.zh || '', si: description?.si || '' }
    );
    const [translating, setTranslating] = useState<{ zh: boolean; si: boolean }>(
        { zh: false, si: false }
    );
    const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

    // Gemini translation function
    const translateToLang = async (
        targetLang: string,
        enText: string
    ): Promise<string | null> => {
        if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
            alert('Gemini API key not configured');
            return null;
        }
        const prompt = `Translate the following to ${targetLang}. Return ONLY valid JSON:\n{"text":"..."}\n\nEnglish:\n- Text: ${enText}`;
        try {
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
                }
            );
            if (!res.ok) throw new Error(`Gemini ${res.status}`);
            const data = await res.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error('Empty response from Gemini');
            const jsonMatch = text.match(/\{.*\}/s);
            if (!jsonMatch) throw new Error('No JSON found in response');
            return JSON.parse(jsonMatch[0]).text;
        } catch (e) {
            console.error('Translation error:', e);
            alert(`Translation failed: ${(e as Error).message}`);
            return null;
        }
    };

    // Fetch heading and description from backend
    useEffect(() => {
        const fetchHeadingAndDescription = async () => {
            try {
                const response = await fetch(`${baseURL}/supplier-form/get-supplierform-heading`);
                if (!response.ok) throw new Error("Failed to fetch heading and description");
                const data = await response.json();
                setHeading(data.heading);
                setDescription(data.description);
            } catch (err) {
                setError("Error fetching heading and description");
            }
        };
        fetchHeadingAndDescription();
    }, [baseURL]);

    /* --------------------------------------------------------------
       1. FETCH ALL FORMS
       -------------------------------------------------------------- */
    useEffect(() => {
        const fetchSupplierForms = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${baseURL}/supplier-form/get-supplierform`);
                if (!response.ok) throw new Error("Failed to fetch supplier forms");
                const data: SupplierForm[] = await response.json();

                const mappedData = data.map((form) => ({
                    id: form.id,
                    formData: {
                        fullname: form.formData.fullname,
                        companyname: form.formData.companyname,
                        email: form.formData.email,
                        phone: form.formData.phone,
                        country: form.formData.country,
                        businessType: form.formData.businessType,
                        products: form.formData.products,
                        quantity: form.formData.quantity,
                        enquiry: form.formData.enquiry,
                        website: form.formData.website,
                        capacity: form.formData.capacity,
                        certifications: form.formData.certifications,
                        specificInfo: form.formData.specificInfo,
                        category: form.formData.category,
                    },
                    date: form.date,
                    time: form.time,
                }));

                setSupplierForms(mappedData);
            } catch (err) {
                setError(err instanceof Error ? err.message : "An unknown error occurred");
            } finally {
                setLoading(false);
            }
        };

        fetchSupplierForms();
    }, [baseURL]);

    /* --------------------------------------------------------------
       2. COMBINED FILTERING (search + date) – memoised
       -------------------------------------------------------------- */
    const filteredForms = useMemo(() => {
        const now = startOfDay(new Date());
        let startDate: Date | null = null;
        let endDate: Date = now; // always inclusive of today

        // Set date range based on filter
        if (dateFilter === "1m") {
            startDate = subMonths(now, 1);
        } else if (dateFilter === "3m") {
            startDate = subMonths(now, 3);
        } else if (dateFilter === "6m") {
            startDate = subMonths(now, 6);
        } else if (dateFilter === "12m") {
            startDate = subMonths(now, 12);
        } else if (dateFilter === "custom" && customStart && customEnd) {
            const parsedStart = parseISO(customStart);
            const parsedEnd = parseISO(customEnd);
            if (isAfter(parsedEnd, parsedStart)) {
                startDate = startOfDay(parsedStart);
                endDate = startOfDay(parsedEnd);
            }
        }

        return supplierForms.filter((form) => {
            // 1. Search filter
            const matchesSearch =
                (typeof form.formData.fullname === "string" &&
                    form.formData.fullname.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (typeof form.formData.companyname === "string" &&
                    form.formData.companyname.toLowerCase().includes(searchTerm.toLowerCase()));

            // 2. Date filter
            let matchesDate = true;
            if (startDate !== null) {
                const formDate = parseDateString(form.date);
                if (!formDate) return false; // invalid date → exclude
                const formDateStart = startOfDay(formDate);
                matchesDate = isWithinInterval(formDateStart, { start: startDate, end: endDate });
            }

            return matchesSearch && matchesDate;
        });
    }, [supplierForms, searchTerm, dateFilter, customStart, customEnd]);

    /* --------------------------------------------------------------
       3. EXCEL DOWNLOAD (uses filtered data)
       -------------------------------------------------------------- */
    const downloadExcel = (type: "import" | "export") => {
        const filteredData = filteredForms.filter((form) => {
            const businessType = form.formData.businessType?.toLowerCase();
            if (type === "import") {
                return businessType === "i want to import / buy";
            } else if (type === "export") {
                return businessType === "i want to export / supply";
            }
            return false;
        });

        if (filteredData.length === 0) {
            alert(`No ${type} data available to download.`);
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(
            filteredData.map((form) => {
                if (type === "import") {
                    return {
                        Fullname: form.formData.fullname || "",
                        Company: form.formData.companyname || "",
                        Email: form.formData.email || "",
                        Phone: form.formData.phone || "",
                        "Product Categories": form.formData.products?.join(", ") || "",
                        "Business Type": form.formData.businessType || "",
                        "Specific Info": form.formData.specificInfo || "",
                        Enquiry: form.formData.enquiry || "",
                        Category: form.formData.category?.join(", ") || "",
                        Quantity: form.formData.quantity || "",
                        Country: form.formData.country || "",
                        Date: form.date || "",
                        Time: form.time || "",
                    };
                } else if (type === "export") {
                    return {
                        Fullname: form.formData.fullname || "",
                        Company: form.formData.companyname || "",
                        Email: form.formData.email || "",
                        Phone: form.formData.phone || "",
                        "Product Categories": form.formData.products?.join(", ") || "",
                        "Business Type": form.formData.businessType || "",
                        Website: form.formData.website || "",
                        Capacity: form.formData.capacity || "",
                        Certifications: form.formData.certifications || "",
                        "Specific Info": form.formData.specificInfo || "",
                        Enquiry: form.formData.enquiry || "",
                        Country: form.formData.country || "",
                        Date: form.date || "",
                        Time: form.time || "",
                    };
                }
                return {}; // Fallback in case of unexpected type
            })
        );

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `SupplierForms_${type}`);
        XLSX.writeFile(workbook, `SupplierForms_${type}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    };

    /* --------------------------------------------------------------
       4. SAVE HEADING & DESCRIPTION
       -------------------------------------------------------------- */
    const handleSaveHeadingDesc = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${baseURL}/supplier-form/update-supplierform-heading`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ heading: editHeading, description: editDescription }),
            });
            if (!response.ok) throw new Error('Failed to update heading/description');
            setShowEditModal(false);
            // Refetch heading/description
            const data = await response.json();
            setHeading(data.heading);
            setDescription(data.description);
            // Reload the window to reflect changes
            window.location.reload();
        } catch (err) {
            setError('Error saving heading/description');
        } finally {
            setLoading(false);
        }
    };

    // Sync editHeading/editDescription when modal opens or heading/description changes
    useEffect(() => {
        if (showEditModal && heading && description) {
            setEditHeading({ en: heading.en || '', zh: heading.zh || '', si: heading.si || '' });
            setEditDescription({ en: description.en || '', zh: description.zh || '', si: description.si || '' });
        }
    }, [showEditModal, heading, description]);

    /* --------------------------------------------------------------
       4. UI
       -------------------------------------------------------------- */
    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
                    <strong>Error:</strong> {error}
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                <LoadingAnimation />
            </div>
        );
    }

    return (
        <div className="flex bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
            {/* Sidebar */}
            <div className="fixed w-64 h-screen shadow-xl z-10">
                <Sidebar />
            </div>
            <div className="flex-1 ml-64 min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">
                            Supplier Forms
                        </h1>
                        <p className="text-gray-600">
                            Manage and review all supplier enquiries
                        </p>
                    </div>

                    {/* Supplier Heading and Description */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 relative">
                        {/* Edit Button Top Right */}
                        <button
                            className="absolute top-4 right-4 bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition"
                            onClick={() => setShowEditModal(true)}
                        >
                            Edit
                        </button>
                        {loading ? (
                            <div className="animate-pulse">
                                <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                                <div className="h-4 bg-gray-200 rounded w-5/6 mb-2"></div>
                                <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                            </div>
                        ) : (
                            <>
                            <h1 className="text-xl font-bold mb-5">Supplier Form Heading</h1>
                            <div className="flex flex-row gap-8">
                                <div className="flex-1">
                                    <div className="mb-2">
                                        {heading && (
                                            <div className="font-semibold text-primary">{heading.en}</div>
                                        )}
                                    </div>
                                    <div>
                                        {description && (
                                            <div className="text-gray-700">{description.en}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            </>
                        )}
                        {/* Edit Modal */}
                        {showEditModal && (
                            <div className="fixed inset-0 bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                                <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[70vh] overflow-y-auto p-6 relative">
                                    <button
                                        className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition text-3xl font-light bg-gray-100 hover:bg-gray-200 rounded-full w-10 h-10 flex items-center justify-center"
                                        onClick={() => setShowEditModal(false)}
                                    >
                                        ×
                                    </button>
                                    <h2 className="text-3xl font-bold mb-8 text-center text-primary border-b border-gray-200 pb-4">
                                        Edit Supplier Heading & Description
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                                        {(['en', 'zh', 'si'] as const).map((lang) => (
                                            <section key={lang}>
                                                <h3 className="text-xl font-semibold mb-4 border-b pb-2 text-center text-primary">
                                                    {lang === 'en' ? 'English' : lang === 'zh' ? 'Mandarin' : 'Sinhala'}
                                                </h3>
                                                <label className="block font-medium mb-1 text-gray-700">Heading:</label>
                                                <input
                                                    type="text"
                                                    value={editHeading[lang] || ''}
                                                    onChange={e => setEditHeading(prev => ({ ...prev, [lang]: e.target.value }))}
                                                    className="w-full border border-gray-300 rounded-lg p-3 mb-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                                                />
                                                <label className="block font-medium mb-1 text-gray-700">Description:</label>
                                                <textarea
                                                    value={editDescription[lang] || ''}
                                                    onChange={e => setEditDescription(prev => ({ ...prev, [lang]: e.target.value }))}
                                                    className="w-full border border-gray-300 rounded-lg p-3 h-40 resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                                                />
                                            </section>
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center gap-4 mb-6">
                                        <div>
                                            <button
                                                disabled={translating.zh || translating.si}
                                                className={`px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium transition ${translating.zh || translating.si
                                                    ? 'bg-gray-400 text-white cursor-not-allowed'
                                                    : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                                                }`}
                                                onClick={async () => {
                                                    setTranslating({ zh: true, si: true });
                                                    const zhHeading = await translateToLang('Chinese (Simplified)', editHeading.en);
                                                    const siHeading = await translateToLang('Sinhala', editHeading.en);
                                                    const zhDesc = await translateToLang('Chinese (Simplified)', editDescription.en);
                                                    const siDesc = await translateToLang('Sinhala', editDescription.en);
                                                    if (zhHeading) setEditHeading(prev => ({ ...prev, zh: zhHeading }));
                                                    if (siHeading) setEditHeading(prev => ({ ...prev, si: siHeading }));
                                                    if (zhDesc) setEditDescription(prev => ({ ...prev, zh: zhDesc }));
                                                    if (siDesc) setEditDescription(prev => ({ ...prev, si: siDesc }));
                                                    setTranslating({ zh: false, si: false });
                                                }}
                                            >
                                                {(translating.zh || translating.si) ? (
                                                    <>
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                        Translating...
                                                    </>
                                                ) : (
                                                    'Translate to Sinhala & Mandarin'
                                                )}
                                            </button>
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                className="px-6 py-2.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium transition"
                                                onClick={() => setShowEditModal(false)}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                className={`px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium transition ${loading
                                                    ? 'bg-primary/70 cursor-not-allowed text-white'
                                                    : 'bg-primary text-white hover:bg-primary/90 shadow-md'
                                                }`}
                                                onClick={handleSaveHeadingDesc}
                                                disabled={loading}
                                            >
                                                {loading ? (
                                                    <>
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                        Saving...
                                                    </>
                                                ) : (
                                                    'Save Changes'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
                        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                            {/* Left: Search and Date Filter Dropdown */}
                            <div className="flex gap-4 items-center w-full sm:w-auto">
                                <div className="relative w-full sm:w-80">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        placeholder="Search by name or company..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                    />
                                </div>

                                <div className="relative">
                                    <select
                                        value={dateFilter}
                                        onChange={(e) => {
                                            const val = e.target.value as DateFilter;
                                            setDateFilter(val);
                                            setShowCustomDates(val === "custom");
                                            if (val !== "custom") {
                                                setCustomStart("");
                                                setCustomEnd("");
                                            }
                                        }}
                                        className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2.5 pr-10 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer"
                                    >
                                        <option value="all">All</option>
                                        <option value="1m">1 Month</option>
                                        <option value="3m">3 Months</option>
                                        <option value="6m">6 Months</option>
                                        <option value="12m">1 Year</option>
                                        <option value="custom">Custom Date</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                </div>
                            </div>

                            {/* Right: Custom Dates + Download */}
                            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center w-full lg:w-auto">
                                {showCustomDates && (
                                    <div className="flex gap-2">
                                        <input
                                            type="date"
                                            value={customStart}
                                            onChange={(e) => setCustomStart(e.target.value)}
                                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        />
                                        <input
                                            type="date"
                                            value={customEnd}
                                            onChange={(e) => setCustomEnd(e.target.value)}
                                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                )}

                                {/* Download Dropdown */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowDropdown(!showDropdown)}
                                        className="flex items-center gap-2 font-medium px-5 py-2.5 rounded-lg transition transform hover:scale-105 shadow-md bg-primary hover:bg-primary/90 text-white"
                                    >
                                        <Download className="w-5 h-5" />
                                        Download Excel
                                        <ChevronDown className="w-4 h-4" />
                                    </button>
                                    {showDropdown && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg">
                                            <button
                                                onClick={() => { downloadExcel("import"); setShowDropdown(false); }}
                                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                            >
                                                Download Import Data
                                            </button>
                                            <button
                                                onClick={() => { downloadExcel("export"); setShowDropdown(false); }}
                                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                            >
                                                Download Export Data
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Total Count */}
                    <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700">
                            Total Supplier Forms: <span className="text-primary font-bold">{filteredForms.length}</span>
                        </p>
                    </div>

                    {/* Loading / Results */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[...Array(6)].map((_, i) => (
                                <div
                                    key={i}
                                    className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-pulse"
                                >
                                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                                    <div className="h-4 bg-gray-200 rounded w-5/6 mb-2"></div>
                                    <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                                </div>
                            ))}
                        </div>
                    ) : filteredForms.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredForms.map((form) => (
                                <div
                                    key={form.id}
                                    className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-300 border border-gray-200 overflow-hidden group"
                                >
                                    <div className="p-6">
                                        {/* Date & Time at the top */}
                                        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {form.date}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                {form.time}
                                            </span>
                                        </div>

                                        {/* Header */}
                                        <div className="flex items-start justify-between mb-4">
                                            <h3 className="text-xl font-semibold text-gray-800 group-hover:text-primary transition">
                                                {form.formData.fullname}
                                            </h3>
                                        </div>

                                        {/* Company */}
                                        <p className="text-sm text-gray-600 mb-3 flex items-center gap-2">
                                            <strong className="text-gray-800">Company:</strong> {form.formData.companyname}
                                        </p>

                                        {/* Contact Info */}
                                        <div className="space-y-2 mb-4 text-sm">
                                            <p className="flex items-center gap-2">
                                                <strong className="text-gray-800">Email:</strong> {form.formData.email}
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <strong className="text-gray-800">Phone:</strong> {form.formData.phone}
                                            </p>
                                        </div>

                                        {/* Enquiry Note */}
                                        {form.formData.enquiry && (
                                            <p className="text-sm italic text-gray-600 mb-3 line-clamp-2">
                                                &quot;{form.formData.enquiry}&quot;
                                            </p>
                                        )}

                                        {/* Product Categories */}
                                        {form.formData.products && (
                                            <div className="mb-4">
                                                <p className="text-xs font-semibold text-gray-700 mb-1">
                                                    Product Categories:
                                                </p>
                                                <div className="space-y-1 text-xs text-gray-600">
                                                    {form.formData.products.map((product, index) => (
                                                        <div key={index} className="flex items-start gap-1">
                                                            <span>{product}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Business Type */}
                                        <p className="text-sm text-gray-600 mb-3 flex items-center gap-2">
                                            <strong className="text-gray-800">Business Type:</strong> {form.formData.businessType}
                                        </p>

                                        {/* Website */}
                                        {form.formData.website && (
                                            <p className="text-sm text-gray-600 mb-3 flex items-center gap-2">
                                                <strong className="text-gray-800">Website:</strong> {form.formData.website}
                                            </p>
                                        )}

                                        {/* Capacity */}
                                        {form.formData.capacity && (
                                            <p className="text-sm text-gray-600 mb-3 flex items-center gap-2">
                                                <strong className="text-gray-800">Capacity:</strong> {form.formData.capacity}
                                            </p>
                                        )}

                                        {/* Certifications */}
                                        {form.formData.certifications && (
                                            <p className="text-sm text-gray-600 mb-3 flex items-center gap-2">
                                                <strong className="text-gray-800">Certifications:</strong> {form.formData.certifications}
                                            </p>
                                        )}


                                        {/* Specific Info */}
                                        {form.formData.specificInfo && (
                                            <p className="text-sm text-gray-600 mb-3 flex items-center gap-2">
                                                <strong className="text-gray-800">Specific Info:</strong> {form.formData.specificInfo}
                                            </p>
                                        )}

                                        {/* Enquiry */}
                                        {form.formData.enquiry && (
                                            <p className="text-sm text-gray-600 mb-3 flex items-center gap-2">
                                                <strong className="text-gray-800">Enquiry:</strong> {form.formData.enquiry}
                                            </p>
                                        )}

                                        {/* Category */}
                                        {form.formData.category && (
                                            <p className="text-sm text-gray-600 mb-3 flex items-center gap-2">
                                                <strong className="text-gray-800">Category:</strong> {form.formData.category.join(", ")}
                                            </p>
                                        )}

                                        {/* Quantity */}
                                        {form.formData.quantity && (
                                            <p className="text-sm text-gray-600 mb-3 flex items-center gap-2">
                                                <strong className="text-gray-800">Quantity:</strong> {form.formData.quantity}
                                            </p>
                                        )}

                                        {/* Country */}
                                        <p className="text-sm text-gray-600 mb-3 flex items-center gap-2">
                                            <strong className="text-gray-800">Country:</strong> {form.formData.country}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
                            <p className="text-gray-500 text-lg">
                                No supplier forms found matching your criteria.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SupplierFormsPage;
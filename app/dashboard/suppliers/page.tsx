"use client";

import { Edit } from "lucide-react";
import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import EditManager, { ManagerData, SupplierMapData } from "./components/EditManager";
import LoadingAnimation from "../components/loading-animation";
import EditReviews from "./components/EditReviews";
import EditRevHeading from "./components/EditRevHeading";

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

type SupplierReview = {
    id: string;
    supplierCompanyName: { en: string; zh?: string; si?: string };
    country: { en: string; zh?: string; si?: string };
    supplierLogoPath: string;
    message: { en: string; zh?: string; si?: string };
};

type SupplierData = {
    suppliers: {
        heading: { en: string; zh: string; si: string };
        manager?: ManagerData;
        supplierMap?: SupplierMapData;
    };
    reviews: {
        heading: { en: string; zh: string; si: string };
        description: { en: string; zh: string; si: string };
        reviews: SupplierReview[];
    };
};

type HeadingData = {
    heading: { en: string; zh: string; si: string };
    description: { en: string; zh: string; si: string };
};

const SuppliersPage = () => {
    const [supplierData, setSupplierData] = useState<SupplierData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditingManager, setIsEditingManager] = useState(false);
    const [isEditingReview, setIsEditingReview] = useState(false);
    const [isEditingHeading, setIsEditingHeading] = useState(false);
    const [selectedReview, setSelectedReview] = useState<SupplierReview | null>(null);

useEffect(() => {
  const fetchSupplierData = async () => {
    try {
      const response = await fetch(`${baseURL}/suppliers/get-suppliers-section`);

      if (!response.ok) {
        throw new Error("Failed to fetch suppliers");
      }

      const result = await response.json();
    console.log("Supplier API Response:", result);

      if (result.success) {
        const data = result.data;
        setSupplierData(data);
      } else {
        console.error("Failed to fetch suppliers:", result.message);
      }

    } catch (error) {
      console.error("Error fetching suppliers:", error);
    } finally {
      setLoading(false);
    }
  };

  fetchSupplierData();
}, [baseURL]);




    const saveToBackend = async (dataToSave: SupplierData) => {
        try {
            const response = await fetch(`${baseURL}/suppliers/update-supplier-section`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dataToSave),
            });
            if (!response.ok) throw new Error("Failed to save to backend");
        } catch (error) {
            console.error("Error saving data:", error);
            alert("Error saving data. Please check the console.");
        }
    };

    const handleSaveManager = async (updatedManager: ManagerData, updatedMap?: SupplierMapData) => {
        if (supplierData) {
            const newData = {
                ...supplierData,
                suppliers: {
                    ...(supplierData.suppliers || {}),
                    manager: updatedManager,
                    supplierMap: updatedMap,
                },
            };
            setSupplierData(newData);
            await saveToBackend(newData);
        }
        setIsEditingManager(false);
    };

    const handleEditReview = (review: SupplierReview) => {
        setSelectedReview(review);
        setIsEditingReview(true);
    };

    const handleSaveReview = async (updatedReview: SupplierReview) => {
        if (supplierData) {
            const existingReviews = supplierData.reviews?.reviews || [];
            const newData = {
                ...supplierData,
                reviews: {
                    ...(supplierData.reviews || {}),
                    reviews: existingReviews.map((review) =>
                        review.id === updatedReview.id ? updatedReview : review
                    ),
                },
            };
            setSupplierData(newData);
            await saveToBackend(newData);
        }
        setIsEditingReview(false);
    };

    const handleEditHeading = () => {
        setIsEditingHeading(true);
    };

    const handleSaveHeading = async (updatedHeading: HeadingData) => {
        if (supplierData) {
            const newData = {
                ...supplierData,
                reviews: {
                    ...(supplierData.reviews || {}),
                    heading: updatedHeading.heading,
                    description: updatedHeading.description,
                },
            };
            setSupplierData(newData);
            await saveToBackend(newData);
        }
        setIsEditingHeading(false);
    };

    if (loading)
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background">
                <LoadingAnimation />
                <p className="mt-4 text-gray-600"></p>
            </div>
        );
    if (error) return <div className="p-8 text-red-600 text-center">Error: {error}</div>;
    if (!supplierData) return <div className="p-8 text-center">No data available</div>;

    const { suppliers, reviews } = supplierData;

    return (
        <div className="flex bg-background min-h-screen">
            {/* Sidebar */}
            <div className="fixed w-64 h-full">
                <Sidebar />
            </div>

            {/* Main Content */}
            <div className="flex-1 ml-64 p-8">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-gray-800">Suppliers Section</h2>
                    <p className="mt-2 text-gray-600">Manage supplier content, manager, map, and reviews</p>
                </div>

                <div className="space-y-12">

                    {/* === Manager Section === */}
       {suppliers?.manager && (
  <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 relative">
    
    <button
      onClick={() => setIsEditingManager(true)}
      className="absolute top-4 right-4 flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary"
    >
      <Edit size={16} />
      Edit
    </button>

    <h4 className="text-xl font-bold text-gray-800 mb-6">
      {suppliers.manager?.heading?.en || "Manager"}
    </h4>

    <div className="flex flex-col md:flex-row items-center gap-6">
{suppliers.manager?.imagePath && (
  <img
    src={suppliers.manager.imagePath}
    alt={suppliers.manager?.name?.en || "Manager"}
    className="w-60 h-80 object-cover border-4 border-gray-200 shadow-md"
  />
)}


      <div className="text-center md:text-left">
        <h5 className="text-2xl font-bold text-gray-800">
          {suppliers.manager?.name?.en}
        </h5>

        <p className="text-lg text-primary font-medium">
          {suppliers.manager?.role?.en}
        </p>

        <p className="mt-3 text-gray-700 leading-relaxed">
          {suppliers.manager?.description?.en}
        </p>
      </div>
    </div>

    {suppliers?.supplierMap && (
      <div className="mt-10">
        <h4 className="text-xl font-bold text-gray-800 mb-4">
          {suppliers.supplierMap?.heading?.en}
        </h4>

        <p className="text-gray-700 leading-relaxed mb-5">
          {suppliers.supplierMap?.description?.en}
        </p>

{suppliers.supplierMap?.imagePath && (
  <img
    src={suppliers.supplierMap.imagePath}
    alt="Global Supplier Map"
    className="w-full h-80 object-cover rounded-lg shadow-md mb-4"
  />
)}

      </div>
    )}
  </div>
)}


                    {/* Edit Manager Component */}
                    {isEditingManager && suppliers.manager && (
                        <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 h-screen">
                            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                                <EditManager
                                    managerData={suppliers.manager}
                                    supplierMapData={suppliers.supplierMap}
                                    onSave={handleSaveManager}
                                    onCancel={() => setIsEditingManager(false)}
                                />
                            </div>
                        </div>
                    )}

                    {/* === Reviews Section === */}
                   <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 relative">

  {/* Reviews Heading */}
  <div className="bg-white shadow-lg p-6 relative mb-5">
    <h1 className="text-xl font-bold mb-5">Supplier Review Heading</h1>

    <button
      onClick={handleEditHeading}
      className="absolute top-2 right-2 text-white bg-primary p-2 hover:text-gray-300"
    >
      <Edit size={16} />
    </button>

    <h4 className="text-xl font-bold text-gray-800 mb-2">
      {reviews?.heading?.en}
    </h4>

    <p className="text-gray-600 mb-6">
      {reviews?.description?.en}
    </p>
  </div>

  {/* Reviews Grid */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  {(reviews?.reviews || []).map((review) => (
    <div
      key={review.id}
      className="border rounded-xl p-5 shadow hover:shadow-xl transition-shadow duration-300 flex flex-col items-center text-center relative group"
    >
      {/* Edit Button */}
      <button
        onClick={() => handleEditReview(review)}
        className="absolute top-2 right-2 text-white bg-primary p-2 hover:text-gray-300 hidden group-hover:block"
      >
        <Edit size={16} />
      </button>

      {/* Supplier Logo */}
      <img
        src={review?.supplierLogoPath || "/placeholder.png"}
        alt={review?.supplierCompanyName?.en || "Supplier"}
        className="w-24 h-24 object-cover mb-3 rounded-full"
      />

      {/* Supplier Name */}
      <h5 className="font-bold text-gray-800 text-lg">
        {review?.supplierCompanyName?.en || "Supplier"}
      </h5>

      {/* Country */}
      <p className="text-sm text-primary font-medium">
        {review?.country?.en || ""}
      </p>

      {/* Message */}
      <p className="text-gray-600 text-sm mt-2 line-clamp-4">
        {review?.message?.en || ""}
      </p>
    </div>
  ))}
</div>


</div>


                    {/* Edit Review Component */}
                    {isEditingReview && selectedReview && (
                        <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 h-screen">
                            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                                <EditReviews
                                    reviewData={selectedReview}
                                    onSave={handleSaveReview}
                                    onCancel={() => setIsEditingReview(false)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Edit Heading Component */}
                    {isEditingHeading && (
                        <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 h-screen">
                            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                                <EditRevHeading
                                    headingData={{
                                        heading: reviews?.heading || { en: "", zh: "", si: "" },
                                        description: reviews?.description || { en: "", zh: "", si: "" },
                                    }}
                                    onSave={handleSaveHeading}
                                    onCancel={() => setIsEditingHeading(false)}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SuppliersPage;
"use client";

import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import EditProducts from "./components/EditProducts";
import LoadingAnimation from '../../components/loading-animation';

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

type Category = {
  id: string;
  name: {
    en: string;
    zh: string;
    si: string;
  };
  imagePath: string;
};

type ProductsData = {
  heading: {
    en: string;
    zh: string;
    si: string;
  };
  description: {
    en: string;
    zh: string;
    si: string;
  };
  categories: Category[];
};

const ProductsPage = () => {
  const [productsData, setProductsData] = useState<ProductsData | null>(null);
  const [isEditing, setIsEditing] = useState(false);


useEffect(() => {
  const fetchProducts = async () => {
    try {
      const res = await fetch(`${baseURL}/home/get-product-section`);

      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status}`);
      }

      const json = await res.json();
      console.log("Products API Response:", json);

  if (json?.success && json?.data) {
  const apiData = json.data;

if (!apiData.categories || apiData.categories.length === 0) {
  apiData.categories = Array.from({ length: 10 }, (_, i) => ({
    id: (i + 1).toString(),
    name: { en: "", zh: "", si: "" },
    imagePath: ""
  }));
}
  setProductsData(apiData);
} else {
        console.error("Invalid API response");
      }

    } catch (error) {
      console.error("Error fetching products data:", error);
    }
  };

  fetchProducts();
}, []);

  const handleSave = (updatedData: ProductsData) => {
    setProductsData(updatedData);
    setIsEditing(false);
  };

  if (!productsData)
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <LoadingAnimation />
      <p className="mt-4 text-gray-600"></p>
    </div>
  );

  return (
    <div className="flex bg-background min-h-screen">
      <div className="fixed w-64">
        <Sidebar />
      </div>

      <div className="flex-1 ml-64 p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Home - Products Section</h2>
          <p className="mt-2 text-gray-600">Manage Products content in multiple languages</p>
        </div>
        <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-3xl font-bold text-gray-800">
              {productsData.heading.en}
            </h3>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg flex items-center gap-2"
            >
              {isEditing ? <>Cancel</> : <>Edit</>}
            </button>
          </div>

          {isEditing ? (
            <EditProducts
              productsData={productsData}
              onSave={handleSave}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <>
              <p className="text-gray-600 mt-4 leading-relaxed">
                {productsData.description.en}
              </p>
              <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
                {productsData.categories.map((category) => (
                  <li
                    key={category.id}
                    className="border rounded-lg shadow overflow-hidden relative"
                    style={{ height: "350px" }}
                  >
                    <img
                      src={category.imagePath}
                      alt={category.name.en}
                      className="w-full h-350px object-cover"
                      style={{ height: "350px" }}
                    />
                    <div className="p-3 absolute inset-0 flex place-items-end pb-5 justify-center bg-black/50">
                      <h2 className="text-sm font-semibold text-white">
                        {category.name.en}
                      </h2>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
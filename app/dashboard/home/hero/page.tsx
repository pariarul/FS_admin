"use client";

import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import EditHero from "./components/EditHero";
import LoadingAnimation from '../../components/loading-animation';

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

type HeroSectionData = {
  background: { [key: string]: string };
  heading: { en: string; zh: string; si: string };
  subheading: { en: string; zh: string; si: string };
  scrolldown: { en: string; zh: string; si: string };
  suppliers_branding: { [key: string]: string };
};

const HeroPage = () => {
  const [heroData, setHeroData] = useState<HeroSectionData | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const fetchHeroSection = async () => {
      try {
        const response = await fetch(`${baseURL}/home/get-hero-section`);


        const data = await response.json();
        console.log(data)
        if (data.success) {
          setHeroData(data.data);
        }

      } catch (error) {
        console.error("Error fetching hero section data:", error);
      }
    };
    fetchHeroSection();
  }, []);

  const handleSave = (updatedData: HeroSectionData) => {
    setHeroData(updatedData);
    setIsEditing(false);
  };

  if (!heroData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <div className="flex bg-background min-h-screen">
      <div className="fixed w-64">
        <Sidebar />
      </div>

      <div className="flex-1 ml-64 p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Home - Hero Section</h2>
          <p className="mt-2 text-gray-600">
            Manage Hero Section content in multiple languages
          </p>
        </div>

        <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 relative">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-3xl font-bold text-gray-800">{heroData.heading.en}</h3>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg flex items-center gap-2"
            >
              {isEditing ? "Cancel" : "Edit"}
            </button>
          </div>

          {isEditing ? (
            <EditHero
              heroData={heroData!} // non-null assertion safe here
              onSave={handleSave}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <>
              <p className="text-gray-600 mt-4 leading-relaxed">{heroData.subheading.en}</p>

              {/* Background Images */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
                {Object.entries(heroData.background || {}).map(([key, path]) =>
                  path ? (
                    <div key={key} className="border rounded-lg shadow overflow-hidden">
                      <img
                        src={path}
                        alt={key}
                        className="w-full h-64 object-cover"
                      />
                    </div>
                  ) : null
                )}
              </div>

              {/* Suppliers Branding */}
              <div className="mt-6">
                <h4 className="text-2xl font-bold text-gray-800 mb-4">Suppliers Branding</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {Object.entries(heroData.suppliers_branding || {}).map(([key, path]) =>
                    path ? (
                      <div key={key} className="border rounded-lg shadow overflow-hidden">
                        <img
                          src={path}
                          alt={key}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      </div>
                    ) : null
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeroPage;
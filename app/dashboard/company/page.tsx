'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { Edit } from 'lucide-react';
import EditAbout, { AboutData } from './components/EditAbout';
import EditVisionMission, { VisionMissionData } from './components/EditVisionMission';
import EditCards from './components/EditCards';
import LoadingAnimation from '../components/loading-animation';

interface AboutLang {
  heading?: string;
  title?: string;
  description?: string;
}

interface VisionMissionLang {
  heading: string;
  description?: string;
}

interface CardLang {
  title: string;
  description: string;
  button?: string;
}

interface Card {
  id: string;
  imagePath: string; // Made non-optional
  href?: string;
  en: CardLang;
  zh?: CardLang;
  si?: CardLang;
}

interface CompanyData {
  about: {
    en: AboutLang;
    zh: AboutLang;
    si: AboutLang;
  };
  connection: {
    en: { heading: string };
    zh?: { heading: string };
    si?: { heading: string };
  };
  vision: {
    en: VisionMissionLang;
    zh?: VisionMissionLang;
    si?: VisionMissionLang;
  };
  mission: {
    en: VisionMissionLang;
    zh?: VisionMissionLang;
    si?: VisionMissionLang;
  };
  cards: Card[];
  video_section_path: string;
}

const CompanyPage = () => {
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [isEditingVisionMission, setIsEditingVisionMission] = useState(false);
  const [isEditingCards, setIsEditingCards] = useState(false);

  const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

useEffect(() => {
  const fetchCompanyData = async () => {
    setLoading(true);
    try {
      if (!baseURL) return;

      const response = await fetch(`${baseURL}/company/get-company`);
      const result = await response.json();
      console.log("API DATA:", result);

      if (!result.success || !result.data) throw new Error("Invalid response format");

      // Ensure cards is always an array
      const company = {
        ...result.data,
        video_section_path: result.data.video_section_path || '',
        cards: Array.isArray(result.data.cards) ? result.data.cards : [],
      };

      setCompanyData(company);
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Error fetching company data:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  fetchCompanyData();
}, [baseURL]);





  const handleSaveAbout = (updatedAbout: AboutData) => {
    setCompanyData((prev) =>
      prev
        ? {
            ...prev,
            about: {
              en: updatedAbout.en || prev.about.en,
              zh: updatedAbout.zh || prev.about.zh,
              si: updatedAbout.si || prev.about.si,
            },
            video_section_path: updatedAbout.videoPath || prev.video_section_path,
          }
        : prev
    );
    setIsEditingAbout(false);
  };

  const handleSaveVisionMission = (updated: Record<string, VisionMissionData>) => {
    setCompanyData((prev) =>
      prev
        ? {
            ...prev,
            connection: {
              ...prev.connection,
              ...updated.connection,
            },
            vision: {
              ...prev.vision,
              ...updated.vision,
            },
            mission: {
              ...prev.mission,
              ...updated.mission,
            },
          }
        : prev
    );
    setIsEditingVisionMission(false);
  };

  const handleSaveCards = (updatedCards: Card[]) => {
    setCompanyData((prev) => (prev ? { ...prev, cards: updatedCards } : prev));
    setIsEditingCards(false);
  };

  if (loading)
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <LoadingAnimation />
      <p className="mt-4 text-gray-600"></p>
    </div>
  );

  if (error || !companyData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg font-semibold text-red-600">Error: {error || 'No data available'}</div>
      </div>
    );
  }

  return (
    <div className="flex bg-gradient-to-br from-gray-50 via-white to-gray-100 min-h-screen">
      {/* Sidebar */}
      <div className="fixed w-64 h-screen shadow-xl z-10">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64 p-8 lg:p-12 space-y-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
              About Company Page
            </h1>
            <p className="text-gray-600">Manage your multilingual company content</p>
          </div>
        </div>

        {/* === ABOUT + VIDEO === */}
        <div className="relative bg-white/90 backdrop-blur-md border border-gray-200/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 lg:p-10 group">
          <button
            className="absolute  top-4 right-4 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-all duration-200 flex items-center gap-2 shadow-md text-sm font-medium"
            onClick={() => setIsEditingAbout(true)}
          >
            <Edit className="w-4 h-4" />
            Edit About
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start mt-10">
            <div className="space-y-5">
              <div>
                <h3 className="text-2xl lg:text-3xl font-bold text-primary">
                  {companyData.about.en.heading}
                </h3>
                <h4 className="text-lg lg:text-xl font-semibold text-gray-700 mt-1">
                  {companyData.about.en.title}
                </h4>
              </div>
              <p className="text-gray-600 leading-relaxed text-base lg:text-md">
                {companyData.about.en.description}
              </p>
            </div>

            <div className="rounded-2xl overflow-hidden shadow-2xl transform group-hover:scale-[1.02] transition-all duration-300">
              <video controls className="w-full h-64 lg:h-80 rounded-2xl object-cover">
                <source src={companyData.video_section_path} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>

        {isEditingAbout && (
          <EditAbout
            aboutData={{
              en: companyData.about.en,
              zh: companyData.about.zh,
              si: companyData.about.si,
              videoPath: companyData.video_section_path,
            }}
            onSave={handleSaveAbout}
            onCancel={() => setIsEditingAbout(false)}
          />
        )}

        {/* === VISION + MISSION === */}
        <div className="relative bg-white/90 backdrop-blur-md border border-gray-200/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 lg:p-12">
          <button
            className="absolute top-4 right-4 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-all duration-200 flex items-center gap-2 shadow-md text-sm font-medium"
            onClick={() => setIsEditingVisionMission(true)}
          >
            <Edit className="w-4 h-4" />
            Edit Vision & Mission
          </button>

          <div className="text-center m-10">
            <h3 className="text-xl lg:text-2xl font-bold text-gray-800">
              {companyData.connection.en.heading}
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Vision */}
            <div className="p-8 bg-gradient-to-br from-blue-50/50 to-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300">
              <h4 className="text-2xl font-bold text-primary mb-4">
                {companyData.vision.en.heading}
              </h4>
              <p className="text-gray-700 leading-relaxed">
                {companyData.vision.en.description}
              </p>
            </div>

            {/* Mission */}
            <div className="p-8 bg-gradient-to-br from-green-50/50 to-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300">
              <h4 className="text-2xl font-bold text-primary mb-4">
                {companyData.mission.en.heading}
              </h4>
              <p className="text-gray-700 leading-relaxed">
                {companyData.mission.en.description}
              </p>
            </div>
          </div>
        </div>

        {isEditingVisionMission && (
          <EditVisionMission
            visionMissionData={{
              en: {
                connection: companyData.connection.en,
                vision: companyData.vision.en,
                mission: companyData.mission.en,
              },
              zh: {
                connection: companyData.connection.zh ?? { heading: '' },
                vision: companyData.vision.zh ?? { heading: '', description: '' },
                mission: companyData.mission.zh ?? { heading: '', description: '' },
              },
              si: {
                connection: companyData.connection.si ?? { heading: '' },
                vision: companyData.vision.si ?? { heading: '', description: '' },
                mission: companyData.mission.si ?? { heading: '', description: '' },
              },
            }}
            onSave={handleSaveVisionMission}
            onCancel={() => setIsEditingVisionMission(false)}
          />
        )}

        {/* === CARDS SECTION === */}
        <div className="relative bg-white/90 backdrop-blur-md border border-gray-200/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 lg:p-10">
          <button
            className="absolute top-4 right-4 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-all duration-200 flex items-center gap-2 shadow-md text-sm font-medium"
            onClick={() => setIsEditingCards(true)}
          >
            <Edit className="w-4 h-4" />
            Edit Cards
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10 mt-6">
            {(Array.isArray(companyData.cards) ? companyData.cards : []).map((card) => (
              <div
                key={card.id || Math.random().toString()}
                className="group bg-gradient-to-br from-gray-50 to-white border border-gray-100 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1.5 p-6 lg:p-8"
              >
                <div className="overflow-hidden rounded-2xl mb-5">
                  <img
                    src={card.imagePath}
                    alt={card.en.title}
                    className="w-full h-56 object-cover rounded-2xl transform group-hover:scale-105 transition-all duration-500"
                  />
                </div>
                <h4 className="text-xl lg:text-2xl font-bold text-primary mb-3">
                  {card.en.title}
                </h4>
                <p className="text-gray-600 leading-relaxed text-sm lg:text-base mb-4">
                  {card.en.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {isEditingCards && (
          <EditCards
            cardsData={companyData.cards.map((card) => ({
              ...card,
              en: card.en,
              zh: card.zh ?? { title: '', description: '', button: '' },
              si: card.si ?? { title: '', description: '', button: '' },
            }))}
            onSave={handleSaveCards}
            onCancel={() => setIsEditingCards(false)}
          />
        )}
      </div>
    </div>
  );
};

export default CompanyPage;
'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { Edit } from 'lucide-react';
import EditPrivacy from './components/EditPrivacy';
import LoadingAnimation from '../components/loading-animation';
import { PrivacyPolicy } from './types';

const PrivacyPolicyPage = () => {
  const [privacyPolicy, setPrivacyPolicy] = useState<PrivacyPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

useEffect(() => {
  const fetchPrivacyPolicy = async () => {
    try {
      const response = await fetch(`${baseURL}/privacy-policy/get-privacy`);
      if (!response.ok) throw new Error("Failed to fetch privacy policy");

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to fetch privacy policy");
      }

      const privacyData = result.data;

      // If your backend already stores `blocks`, no transformation is needed
      setPrivacyPolicy(privacyData);

    } catch (error) {
      console.error("Error fetching privacy policy:", error);
    } finally {
      setLoading(false);
    }
  };

  fetchPrivacyPolicy();
}, [baseURL]);

  const handleSave = (updatedData: PrivacyPolicy) => {
    // Ensure `blocks` property is transformed back to match the expected structure
    const transformedData = {
      ...updatedData,
      sections: updatedData.sections.map((section) => ({
        ...section,
        en: {
          ...section.en,
          description: (section.en.blocks || [])
            .filter((block) => block.type === 'description')
            .flatMap((block) => Array.isArray(block.text) ? block.text : [block.text])
            .filter((text): text is string => !!text),
          points: (section.en.blocks || [])
            .filter((block) => block.type === 'points')
            .map((block) => block.items)
            .filter((items): items is string[] => !!items),
        },
        zh: {
          ...section.zh,
          description: (section.zh.blocks || [])
            .filter((block) => block.type === 'description')
            .flatMap((block) => Array.isArray(block.text) ? block.text : [block.text])
            .filter((text): text is string => !!text),
          points: (section.zh.blocks || [])
            .filter((block) => block.type === 'points')
            .map((block) => block.items)
            .filter((items): items is string[] => !!items),
        },
        si: {
          ...section.si,
          description: (section.si.blocks || [])
            .filter((block) => block.type === 'description')
            .flatMap((block) => Array.isArray(block.text) ? block.text : [block.text])
            .filter((text): text is string => !!text),
          points: (section.si.blocks || [])
            .filter((block) => block.type === 'points')
            .map((block) => block.items)
            .filter((items): items is string[] => !!items),
        },
      })),
    };

    setPrivacyPolicy(transformedData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <LoadingAnimation />
        <p className="mt-4 text-gray-600"></p>
      </div>
    );

  if (!privacyPolicy) {
    return (
      <div className="flex items-center justify-center h-screen text-red-500 text-sm font-medium">
        Failed to load Privacy Policy.
      </div>
    );
  }

  return (
    <div className="flex bg-gradient-to-br from-gray-50 via-white to-gray-100 min-h-screen">
      {/* Sidebar */}
      <div className="fixed w-64 h-screen shadow-xl">
        <Sidebar />
      </div>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-12 space-y-12">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {privacyPolicy.heading.en}
          </h1>
          <p className="text-gray-500">
            View and manage your privacy policy content here.
          </p>
        </div>

        {/* Privacy Policy Content */}
        <div className="relative bg-white/90 backdrop-blur-md border border-gray-200/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 p-10">
          <button
            className="absolute top-4 right-4 bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/80 transition-all duration-200 flex items-center gap-2 shadow-sm text-sm"
            onClick={() => setIsEditing(true)}
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
          {privacyPolicy.sections.map((section) => (
            <div key={section.id} className="mb-10">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                {section.en.title}
              </h2>
              {section.en.blocks && section.en.blocks.map((block, i) => {
                if (block.type === 'description') {
                  return (
                    <div key={i} className="text-gray-600 mb-3">
                      {Array.isArray(block.text) ? block.text.map((text, idx) => (
                        <p key={idx} className="mb-1">{text}</p>
                      )) : <p>{block.text}</p>}
                    </div>
                  );
                }
                if (block.type === 'points') {
                  return (
                    <ul key={i} className="list-disc list-inside space-y-1 text-gray-500">
                      {block.items?.map((point, j) => (
                        <li key={j}>{point}</li>
                      ))}
                    </ul>
                  );
                }
                return null;
              })}
            </div>
          ))}
        </div>
      </main>

      {isEditing && (
        <EditPrivacy
          data={privacyPolicy}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
};

export default PrivacyPolicyPage;
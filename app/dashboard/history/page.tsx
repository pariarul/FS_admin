'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { Edit } from 'lucide-react';
import EditHistory from './components/EditHistory';
import LoadingAnimation from '../components/loading-animation';

interface HistoryTimeline {
  id: string;
  year: string;
  en: {
    title: string;
    description: string;
  };
  zh: {
    title: string;
    description: string;
  };
  si: {
    title: string;
    description: string;
  };
}

interface History {
  heading: {
    en: string;
    zh: string;
    si: string;
  };
  timeline: HistoryTimeline[];
}

const HistoryPage = () => {
  const [history, setHistory] = useState<History | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`${baseURL}/history/get-history`);
        if (!response.ok) throw new Error('Failed to fetch history');
        const data = await response.json();
        setHistory(data.history);
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [baseURL]);

  const handleSave = (updatedData: History) => {
    setHistory(updatedData);
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

  if (!history) {
    return (
      <div className="flex items-center justify-center h-screen text-red-500 text-sm font-medium">
        Failed to load History.
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
              {history.heading.en}
            </h1>
            <p className="text-gray-500">View and manage your history content here.</p>
          </div>
        </div>

        {/* History Timeline */}
        <div className="relative bg-white/90 backdrop-blur-md border border-gray-200/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 p-10">
          <button
            className="absolute top-4 right-4 bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/80 transition-all duration-200 flex items-center gap-2 shadow-sm text-sm"
            onClick={() => setIsEditing(true)}
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>

          {history.timeline.map((event) => (
            <div key={event.id} className="mb-10">
              <h2 className="text-xl font-bold text-gray-900 mb-1">{event.year}</h2>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">{event.en.title}</h3>
              <p className="text-gray-600">{event.en.description}</p>
            </div>
          ))}
        </div>
      </main>

      {isEditing && (
        <EditHistory
          data={history}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
};

export default HistoryPage;

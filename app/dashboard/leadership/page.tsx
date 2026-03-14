'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import EditLeadership from './components/EditLeadership';
import EditDirectors from './components/EditDirectors';
import DirectorsDescModal from './components/DirectorsDescModal';
import LoadingAnimation from '../components/loading-animation';
import { Edit } from 'lucide-react';

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

/* ────────────────────────────────── Types ────────────────────────────────── */
interface Blog {
  heading: { en: string; zh?: string; si?: string };
  description: { en: string; zh?: string; si?: string };
}

interface Destination {
  name: { en: string; zh?: string; si?: string };
  title: { en: string; zh?: string; si?: string };
  imagePath: string;
  message?: { en: string; zh?: string; si?: string };
  blogs?: Blog[];
}

interface Director {
  id: string;
  name: { en: string; zh?: string; si?: string };
  title: { en: string; zh?: string; si?: string };
  description: { en: string; zh?: string; si?: string };
  imagePath: string;
}

interface Headings {
  en: {
    heading: string;
    subheadingDestination1: string;
    subheadingDestination2: string;
    subheadingDestination3: string;
    exploreBlogBtn: string;
  };
  zh?: Record<string, string>;
  si?: Record<string, string>;
}

interface Leadership {
  headings: Headings;
  destination1: Destination;
  destination2: Destination;
  destination3Description: { en: string; zh?: string; si?: string };
  destination3: Director[];
}

/* ──────────────────────── Editable wrapper for the modal ──────────────────────── */
interface EditableDestination extends Destination {
  destinationKey: 'destination1' | 'destination2';
}

/* ────────────────────────────────── Component ────────────────────────────────── */
export default function LeadershipSection() {
  const [leadership, setLeadership] = useState<Leadership | null>(null);
  const [activeTab, setActiveTab] = useState<'dest1' | 'dest2' | 'dest3'>('dest1');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Edit modals */
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<EditableDestination | null>(null);
  const [isEditingDirector, setIsEditingDirector] = useState(false);
  const [editDirectorData, setEditDirectorData] = useState<Director | null>(null);
  // State for editing directors description
  const [isEditingDirectorsDesc, setIsEditingDirectorsDesc] = useState(false);
  const [directorsDescDraft, setDirectorsDescDraft] = useState<{ en: string; zh: string; si: string } | null>(null);

  /* ──────────────────────────────── Fetch data ──────────────────────────────── */
useEffect(() => {
  const fetchLeadership = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${baseURL}/leadership/get-leadership`);
      if (!res.ok) throw new Error('Failed to fetch leadership data');

      const json = await res.json();
      console.log("Leadership API response:", json);

      // ✅ updated check
      if (!json.success || !json.data) {
        throw new Error(json.message || 'Invalid response format');
      }

      // ✅ use the data object directly
      setLeadership(json.data);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      console.error('Error fetching leadership:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (baseURL) fetchLeadership();
}, [baseURL]);



  /* ──────────────────────────────── Loading / Error ──────────────────────────────── */
  if (loading)
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <LoadingAnimation />
      <p className="mt-4 text-gray-600"></p>
    </div>
  );
  if (error || !leadership) return <p className="p-8 text-center text-red-600">Error: {error}</p>;

  const headings = leadership.headings.en;

  const saveToBackend = async (dataToSave: Leadership) => {
    try {
      const response = await fetch(`${baseURL}/leadership/update-leadership`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
           headings: dataToSave.headings,
           destination1: dataToSave.destination1,
           destination2: dataToSave.destination2,
           destination3Description: dataToSave.destination3Description,
           destination3: dataToSave.destination3
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update leadership data');
      }
    } catch (error) {
       console.error(error);
       alert('An error occurred while saving the data.');
    }
  };

  /* ──────────────────────── Edit Destination (Founder / Co-Founder) ──────────────────────── */
  const handleEditClick = (dest: Destination, key: 'destination1' | 'destination2') => {
    setEditData({ ...dest, destinationKey: key });
    setIsEditing(true);
  };

  const handleSave = async (updated: Destination) => {
    if (!leadership) return;
    
    let newData = { ...leadership };
    if (editData?.destinationKey === 'destination1') newData.destination1 = updated;
    else if (editData?.destinationKey === 'destination2') newData.destination2 = updated;

    setLeadership(newData);
    await saveToBackend(newData);

    setIsEditing(false);
    setEditData(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData(null);
  };

  /* ──────────────────────────────── Edit Director ──────────────────────────────── */
  const handleDirectorEditClick = (director: Director) => {
    setEditDirectorData(director);
    setIsEditingDirector(true);
  };

  const handleDirectorSave = async (updated: Director) => {
    if (!leadership) return;
    
    const newDirectors = leadership.destination3.map((d) =>
      d.id === updated.id ? updated : d
    );
    const newData = { ...leadership, destination3: newDirectors };

    setLeadership(newData);
    await saveToBackend(newData);

    setIsEditingDirector(false);
    setEditDirectorData(null);
  };

  const handleDirectorCancel = () => {
    setIsEditingDirector(false);
    setEditDirectorData(null);
  };

  // Edit directors description handlers
  const handleEditDirectorsDesc = () => {
    setDirectorsDescDraft({
      en: leadership?.destination3Description?.en || '',
      zh: leadership?.destination3Description?.zh || '',
      si: leadership?.destination3Description?.si || '',
    });
    setIsEditingDirectorsDesc(true);
  };

  const handleSaveDirectorsDesc = async () => {
    if (!directorsDescDraft || !leadership) return;
    
    const updatedDesc = {
      en: directorsDescDraft.en,
      zh: directorsDescDraft.zh || undefined,
      si: directorsDescDraft.si || undefined,
    };
    
    const newData = { ...leadership, destination3Description: updatedDesc };
    setLeadership(newData);
    await saveToBackend(newData);

    setIsEditingDirectorsDesc(false);
    setDirectorsDescDraft(null);
  };

  const handleCancelDirectorsDesc = () => {
    setIsEditingDirectorsDesc(false);
    setDirectorsDescDraft(null);
  };

  /* ──────────────────────── Render a single destination (Founder / Co-Founder) ──────────────────────── */
  const renderDestination = (dest: Destination, key: 'destination1' | 'destination2') => (
    <div className="space-y-8 relative">
      {/* Edit button */}
      <button
        className="absolute top-4 right-4 flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition"
        onClick={() => handleEditClick(dest, key)}
      >
        <Edit className="w-4 h-4" />
        Edit
      </button>

      {/* Image + Info */}
      <div className="flex flex-col md:flex-row gap-8 items-start pt-14">
        <img
          src={dest.imagePath}
          alt={dest.name.en}
          className="w-full md:w-64 h-80 rounded-xl shadow-lg object-cover"
        />
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-primary">{dest.name.en}</h3>
          <p className="text-secondary font-medium mt-2">{dest.title.en}</p>
          <p className="mt-4 text-gray-700 leading-relaxed">{dest.message?.en}</p>
        </div>
      </div>

      {/* Blogs */}
      {dest.blogs && dest.blogs.length > 0 && (
        <div className="mt-8 p-6 rounded-xl bg-white border border-gray-100 shadow-lg space-y-6">
          <h4 className="text-xl font-bold text-gray-800">Blogs:</h4>
          {dest.blogs.map((blog, i) => (
            <div key={i} className="space-y-2">
              <h5 className="text-lg font-semibold text-gray-800">{blog.heading.en}</h5>
              <p className="text-gray-600">{blog.description.en}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  /* ──────────────────────────────── Render Directors ──────────────────────────────── */
  const renderDirectors = () => (
    <div className="space-y-8">

       {/* Directors description with edit button */}
      <div className="mt-8 flex items-start gap-2">
        {leadership.destination3Description?.en && (
          <p className="text-gray-700 leading-relaxed flex-1">
            {leadership.destination3Description.en}
          </p>
        )}
        <button
          className="flex items-center gap-1 bg-primary text-white px-3 py-1 rounded-lg hover:bg-primary/90 transition"
          onClick={handleEditDirectorsDesc}
        >
          <Edit className="w-4 h-4" />
          Edit
        </button>
      </div>
      
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {leadership?.destination3?.map((director, index) => (
    <div
      key={director.id || index} // fallback to index if id is missing
      className="relative flex gap-6 p-6 bg-white border border-gray-100 rounded-xl hover:shadow-lg transition"
    >
      <button
        className="absolute top-4 right-4 flex items-center gap-1 bg-primary text-white px-3 py-1 rounded-lg hover:bg-primary/90 transition"
        onClick={() => handleDirectorEditClick(director)}
      >
        <Edit className="w-4 h-4" />
        Edit
      </button>

      <img
        src={director.imagePath || '/placeholder.png'} // fallback image
        alt={director.name?.en || 'Director'}
        className="w-32 h-auto rounded-xl object-cover shadow-md"
      />

      <div className="flex flex-col justify-center">
        <h4 className="text-xl font-bold text-gray-800">
          {director.name?.en || 'No Name'}
        </h4>
        <p className="text-primary font-medium mt-1">
          {director.title?.en || 'No Title'}
        </p>
        <p className="mt-3 text-gray-600 leading-relaxed">
          {director.description?.en || ''}
        </p>
      </div>
    </div>
  ))}
</div>


      {/* Edit directors description modal */}
      {isEditingDirectorsDesc && directorsDescDraft && (
        <DirectorsDescModal
          value={directorsDescDraft}
          onChange={(val) => setDirectorsDescDraft({ en: val.en, zh: val.zh || '', si: val.si || '' })}
          onCancel={handleCancelDirectorsDesc}
          onSave={handleSaveDirectorsDesc}
        />
      )}
    </div>
  );

  /* ──────────────────────── Decide what to show (modal or tab) ──────────────────────── */
  const renderContent = () => {
    if (isEditingDirector && editDirectorData) {
      return (
        <EditDirectors
          data={editDirectorData}
          onSave={handleDirectorSave}
          onCancel={handleDirectorCancel}
        />
      );
    }

    if (isEditing && editData) {
      return (
        <EditLeadership
          data={editData}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      );
    }

    switch (activeTab) {
      case 'dest1':
        return renderDestination(leadership.destination1, 'destination1');
      case 'dest2':
        return renderDestination(leadership.destination2, 'destination2');
      case 'dest3':
        return renderDirectors();
      default:
        return null;
    }
  };

  /* ────────────────────────────────── JSX ────────────────────────────────── */
  return (
    <div className="flex bg-background min-h-screen">
      {/* Sidebar */}
      <div className="fixed w-64">
        <Sidebar />
      </div>

      {/* Main */}
      <div className="flex-1 ml-64 p-8">
        {/* Title */}
        <h2 className="text-3xl font-bold text-gray-800">{headings.heading}</h2>
        <p className="mt-2 text-gray-600">
          {activeTab === 'dest1' && headings.subheadingDestination1}
          {activeTab === 'dest2' && headings.subheadingDestination2}
          {activeTab === 'dest3' && headings.subheadingDestination3}
        </p>

        {/* Tabs */}
        <div className="flex gap-4 mt-8 mb-6">
          <button
            className={`px-6 py-3 rounded-lg border transition ${
              activeTab === 'dest1'
                ? 'bg-primary text-white border-primary shadow-lg'
                : 'bg-white text-primary border-gray-200 hover:border-primary hover:text-primary'
            }`}
            onClick={() => setActiveTab('dest1')}
          >
            {leadership.destination1.title.en}
          </button>

          <button
            className={`px-6 py-3 rounded-lg border transition ${
              activeTab === 'dest2'
                ? 'bg-primary text-white border-primary shadow-lg'
                : 'bg-white text-primary border-gray-200 hover:border-primary hover:text-primary'
            }`}
            onClick={() => setActiveTab('dest2')}
          >
            {leadership.destination2.title.en}
          </button>

          <button
            className={`px-6 py-3 rounded-lg border transition ${
              activeTab === 'dest3'
                ? 'bg-primary text-white border-primary shadow-lg'
                : 'bg-white text-primary border-gray-200 hover:border-primary hover:text-primary'
            }`}
            onClick={() => setActiveTab('dest3')}
          >
            Directors
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
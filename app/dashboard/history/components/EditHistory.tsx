import React, { useState, useCallback } from 'react';

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

interface EditHistoryProps {
  data: History;
  onSave: (updatedData: History) => void;
  onCancel: () => void;
}

const EditHistory: React.FC<EditHistoryProps> = ({ data, onSave, onCancel }) => {
  const [formData, setFormData] = useState(data);
  const [isSaving, setIsSaving] = useState(false);
  const [timelineTranslating, setTimelineTranslating] = useState<boolean[]>(data.timeline.map(() => false));
  const [activeLang, setActiveLang] = useState<'en' | 'zh' | 'si'>('en');

  const handleInputChange = useCallback(
    (
      lang: 'en' | 'zh' | 'si',
      timelineIndex: number,
      field: 'title' | 'description',
      value: string
    ) => {
      setFormData((prevFormData) => {
        const updatedTimeline = [...prevFormData.timeline];
        updatedTimeline[timelineIndex] = {
          ...updatedTimeline[timelineIndex],
          [lang]: {
            ...updatedTimeline[timelineIndex][lang],
            [field]: value,
          },
        };
        return { ...prevFormData, timeline: updatedTimeline };
      });
    },
    []
  );

  const handleYearChange = useCallback((timelineIndex: number, value: string) => {
    setFormData((prevFormData) => {
      const updatedTimeline = [...prevFormData.timeline];
      updatedTimeline[timelineIndex] = {
        ...updatedTimeline[timelineIndex],
        year: value,
      };
      return { ...prevFormData, timeline: updatedTimeline };
    });
  }, []);

  const addTimeline = useCallback(() => {
    const newId = `timeline-${formData.timeline.length + 1}`;
    const newTimeline: HistoryTimeline = {
      id: newId,
      year: '',
      en: { title: '', description: '' },
      zh: { title: '', description: '' },
      si: { title: '', description: '' },
    };
    setFormData((prevFormData) => ({
      ...prevFormData,
      timeline: [...prevFormData.timeline, newTimeline],
    }));
    setTimelineTranslating(prev => [...prev, false]);
  }, [formData.timeline]);

  const removeTimeline = useCallback((timelineIndex: number) => {
    setFormData((prevFormData) => {
      const updatedTimeline = prevFormData.timeline.filter((_, index) => index !== timelineIndex);
      return { ...prevFormData, timeline: updatedTimeline };
    });
    setTimelineTranslating(prev => prev.filter((_, i) => i !== timelineIndex));
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const response = await fetch(`${baseURL}/history/update-history`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        throw new Error('Failed to update history');
      }
      onSave(formData);
    } catch (error) {
      console.error('Error saving history:', error);
      alert('Failed to update history.');
    } finally {
      setIsSaving(false);
    }
  }, [formData, onSave]);

  const translateToLang = useCallback(
    async (
      targetLang: string,
      enTitle: string,
      enDescription: string
    ): Promise<{ title: string; description: string } | null> => {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        alert('Gemini API key not found');
        return null;
      }

      const prompt = `Translate the following content to ${targetLang}. Return ONLY valid JSON in this format: {"title": "translated title", "description": "translated description"}.

English:
- Title: ${enTitle}
- Description: ${enDescription}`;

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          }
        );

        if (!response.ok) throw new Error(`API request failed: ${response.status}`);

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('No content returned from API');

        const jsonMatch = text.match(/\{.*\}/s);
        if (!jsonMatch) throw new Error('No JSON found in response');

        return JSON.parse(jsonMatch[0]);
      } catch (err: unknown) {
        console.error(err);
        alert(`Translation failed: ${(err as Error).message}`);
        return null;
      }
    },
    []
  );

  const handleTranslate = useCallback(
    async (timelineIndex: number) => {
      const timeline = formData.timeline[timelineIndex];
      if (!timeline.en.title && !timeline.en.description) {
        alert('Please fill English title or description before translation');
        return;
      }

      setTimelineTranslating(prev => prev.map((v, i) => i === timelineIndex ? true : v));
      try {
        const zhResult = await translateToLang(
          'Chinese (Simplified)',
          timeline.en.title,
          timeline.en.description
        );
        if (zhResult) {
          timeline.zh = zhResult;
        }

        const siResult = await translateToLang(
          'Sinhala',
          timeline.en.title,
          timeline.en.description
        );
        if (siResult) {
          timeline.si = siResult;
        }

        setFormData((prevFormData) => ({ ...prevFormData }));
      } catch (err) {
        console.error(err);
      } finally {
        setTimelineTranslating(prev => prev.map((v, i) => i === timelineIndex ? false : v));
      }
    },
    [formData, translateToLang]
  );

  const handleLangSwitch = (lang: 'en' | 'zh' | 'si') => {
    setActiveLang(lang);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[92vh] overflow-y-auto p-8 relative">
        <button
          className="absolute top-6 right-6 text-gray-500 hover:text-gray-800 transition-colors duration-200 bg-gray-100 hover:bg-gray-200 rounded-full p-2 w-10 h-10 flex items-center justify-center"
          onClick={onCancel}
        >
          &times;
        </button>

        <h2 className="text-3xl font-bold mb-8 text-center text-gray-900 border-b border-gray-200 pb-4">
          Edit History
        </h2>

        {/* Language switcher button */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            className={`px-4 py-2 rounded-lg ${
              activeLang === 'en' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
            onClick={() => handleLangSwitch('en')}
          >
            English
          </button>
          <button
            className={`px-4 py-2 rounded-lg ${
              activeLang === 'zh' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
            onClick={() => handleLangSwitch('zh')}
          >
            Mandarin
          </button>
          <button
            className={`px-4 py-2 rounded-lg ${
              activeLang === 'si' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
            onClick={() => handleLangSwitch('si')}
          >
            Sinhala
          </button>
        </div>

        {formData.timeline.map((item, index) => (
          <div key={`${item.id}-${activeLang}`} className="mb-10 bg-white shadow-lg rounded-xl p-6">
            {activeLang === 'en' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold border-b pb-2 text-gray-800">
                    Timeline {index + 1} - English
                  </h3>
                  <button
                    type="button"
                    onClick={() => removeTimeline(index)}
                    className="bg-red-100 text-red-700 px-3 py-1 rounded-lg hover:bg-red-200 border border-red-300 text-sm ml-4"
                    disabled={formData.timeline.length === 1}
                    title={
                      formData.timeline.length === 1
                        ? 'At least one timeline required'
                        : 'Remove Timeline'
                    }
                  >
                    Remove Timeline
                  </button>
                </div>
                <div className="mb-3">
                  <label className="block font-medium mb-1">Year:</label>
                  <input
                    type="text"
                    value={item.year}
                    onChange={(e) => handleYearChange(index, e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2"
                  />
                </div>
              </>
            )}

            <div className="mb-3">
              <label className="block font-medium mb-1">Title:</label>
              <input
                type="text"
                value={item[activeLang].title}
                onChange={(e) => handleInputChange(activeLang, index, 'title', e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2"
              />
            </div>

            <div className="mb-3">
              <label className="block font-medium mb-1">Description:</label>
              <textarea
                value={item[activeLang].description}
                onChange={(e) => handleInputChange(activeLang, index, 'description', e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 h-24 resize-none"
              />
            </div>

            {activeLang === 'en' && (
              <div className="mt-4 flex justify-end items-center gap-4">
                {index === formData.timeline.length - 1 && (
                  <button
                    onClick={addTimeline}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
                  >
                    Add New Timeline
                  </button>
                )}
                <button
                  onClick={() => handleTranslate(index)}
                  className={`bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 flex items-center justify-center gap-2 ${
                    timelineTranslating[index] ? 'cursor-not-allowed opacity-70' : ''
                  }`}
                  disabled={timelineTranslating[index] || isSaving}
                  style={{ marginLeft: 'auto' }}
                >
                  {timelineTranslating[index] && (
                    <svg
                      className="animate-spin h-5 w-5 text-gray-700"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a 4 4 0 00-4 4H4z"
                      ></path>
                    </svg>
                  )}
                  {timelineTranslating[index] ? 'Translating...' : 'Translate to Mandarin and Sinhala'}
                </button>
              </div>
            )}

            {activeLang !== 'en' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold border-b pb-2 text-gray-800">
                    Timeline {index + 1} -{' '}
                    {activeLang === 'zh' ? 'Mandarin (中文)' : 'Sinhala (සිංහල)'}
                  </h3>
                </div>
                <div className="mb-3">
                  <label className="block font-medium mb-1">Title:</label>
                  <input
                    type="text"
                    value={item[activeLang].title}
                    onChange={(e) => handleInputChange(activeLang, index, 'title', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2"
                  />
                </div>
                <div className="mb-3">
                  <label className="block font-medium mb-1">Description:</label>
                  <textarea
                    value={item[activeLang].description}
                    onChange={(e) => handleInputChange(activeLang, index, 'description', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 h-24 resize-none"
                  />
                </div>
              </>
            )}
          </div>
        ))}

        <div className="mt-6 flex justify-end gap-4 border-t pt-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-6 py-2 rounded-lg flex items-center justify-center gap-2 ${
              isSaving
                ? 'bg-primary/70 cursor-not-allowed text-white'
                : 'bg-primary text-white hover:bg-primary/80'
            }`}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={onCancel}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
            disabled={isSaving}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditHistory;

'use client';

import { useEffect, useState, FormEvent } from 'react';
import Sidebar from '../../components/Sidebar';
import LoadingAnimation from '../../components/loading-animation';

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface CtaData {
  heading: { en: string; zh: string; si: string };
  subheading: { en: string; zh: string; si: string };
  description: { en: string; zh: string; si: string };
}

/* ---------- Gemini translation helper ---------- */
const translateToLang = async (
  targetLang: string,
  enHeading: string,
  enSubheading: string,
  enDescription: string
): Promise<{ heading: string; subheading: string; description: string } | null> => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    alert('Gemini API key not configured');
    return null;
  }

  const prompt = `Translate the following to ${targetLang}. Return ONLY valid JSON:
{"heading":"…","subheading":"…","description":"…"}

English:
- Heading: ${enHeading}
- Subheading: ${enSubheading}
- Description: ${enDescription}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    if (!res.ok) throw new Error(`Gemini ${res.status}`);

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response');

    const json = text.match(/\{.*\}/s);
    if (!json) throw new Error('No JSON found');

    return JSON.parse(json[0]);
  } catch (e) {
    console.error(e);
    alert(`Translation error: ${(e as Error).message}`);
    return null;
  }
};

/* ---------- Main component ---------- */
const CtaPage = () => {
  const [data, setData] = useState<CtaData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  /* ----- fetch initial data ----- */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${baseURL}/home/get-cta-section`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: CtaData = await res.json();
        setData(json);
      } catch (e) {
        setError((e as Error).message);
      }
    };
    fetchData();
  }, []);

  /* ----- translation handler ----- */
  const handleTranslate = async () => {
    if (!data?.heading.en || !data?.subheading.en || !data?.description.en) {
      alert('Please fill English fields first');
      return;
    }

    setIsTranslating(true);
    try {
      const zh = await translateToLang('Chinese (Simplified)', data.heading.en, data.subheading.en, data.description.en);
      if (zh) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                heading: { ...prev.heading, zh: zh.heading },
                subheading: { ...prev.subheading, zh: zh.subheading },
                description: { ...prev.description, zh: zh.description },
              }
            : prev
        );
      }

      const si = await translateToLang('Sinhala', data.heading.en, data.subheading.en, data.description.en);
      if (si) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                heading: { ...prev.heading, si: si.heading },
                subheading: { ...prev.subheading, si: si.subheading },
                description: { ...prev.description, si: si.description },
              }
            : prev
        );
      }
    } finally {
      setIsTranslating(false);
    }
  };

  /* ----- form submit ----- */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!data) return;

    setIsSaving(true);
    setSaveMsg(null);

    try {
      const res = await fetch(`${baseURL}/home/update-cta-section`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setSaveMsg('Saved successfully!');
      setIsEditing(false);
    } catch (err) {
      setSaveMsg(`Save failed: ${(err as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!data)
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <LoadingAnimation />
      <p className="mt-4 text-gray-600"></p>
    </div>
  );

  return (
    <div className="flex bg-background min-h-screen">
      {/* Sidebar */}
      <div className="fixed w-64">
        <Sidebar />
      </div>

      {/* Main */}
      <div className="flex-1 ml-64 p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Home - CTA Section</h2>
          <p className="mt-2 text-gray-600">Manage Call-to-Action content in multiple languages</p>
        </div>

        {/* Preview */}
        <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-700">Current Preview (EN)</h3>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg flex items-center gap-2"
            >
              {isEditing ? (
                <>Cancel</>
              ) : (
                <>Edit</>
              )}
            </button>
          </div>

          <h2 className="text-2xl font-bold text-gray-800">{data.heading.en}</h2>
          <h3 className="text-xl text-gray-700 mt-2">{data.subheading.en}</h3>
          <p className="text-gray-600 mt-4 leading-relaxed">{data.description.en}</p>
        </div>

        {/* Edit Form */}
        {isEditing && (
          <div className="bg-gray-50 rounded-xl p-8 shadow-lg border border-gray-200">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Edit CTA Content</h3>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* ---------- English ---------- */}
                <LangColumn
                  lang="en"
                  title="English"
                  color="red"
                  data={data}
                  setData={setData}
                />

                {/* ---------- Mandarin ---------- */}
                <LangColumn
                  lang="zh"
                  title="Mandarin"
                  color="yellow"
                  data={data}
                  setData={setData}
                />

                {/* ---------- Sinhala ---------- */}
                <LangColumn
                  lang="si"
                  title="Sinhala"
                  color="green"
                  data={data}
                  setData={setData}
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-between items-center mt-8">
                <button
                  type="button"
                  disabled={isTranslating}
                  onClick={handleTranslate}
                  className={`px-4 py-2 rounded flex items-center gap-2 text-white ${
                    isTranslating ? 'bg-gray-500 opacity-60' : 'bg-gray-600 hover:bg-gray-700'
                  }`}
                >
                  {isTranslating ? (
                    <>
                      <span className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin" />
                      Translating…
                    </>
                  ) : (
                    'Translate to Mandarin and Sinhala'
                  )}
                </button>

                <div className="flex gap-4">
                  <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 bg-gray-300 text-gray-700 rounded">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-primary text-white rounded flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <span className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin" />
                        Saving…
                      </>
                    ) : (
                      'Save'
                    )}
                  </button>
                </div>
              </div>

              {saveMsg && (
                <p className={`mt-4 ${saveMsg.includes('failed') ? 'text-red-600' : 'text-green-600'}`}>
                  {saveMsg}
                </p>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------- Re-usable language column ---------- */
type LangColumnProps = {
  lang: 'en' | 'zh' | 'si';
  title: string;
  color: 'red' | 'yellow' | 'green';
  data: CtaData;
  setData: React.Dispatch<React.SetStateAction<CtaData | null>>;
};

const LangColumn = ({ lang, title, color, data, setData }: LangColumnProps) => {
  const bg = {
    red: 'bg-red-100 text-red-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    green: 'bg-green-100 text-green-600',
  }[color];

  const updateField = <K extends keyof CtaData>(field: K, value: string) => {
    setData((prev) =>
      prev
        ? {
            ...prev,
            [field]: { ...prev[field], [lang]: value },
          }
        : prev
    );
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <div className="flex items-center gap-2 mb-6">
        <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center`}>
          <span className="font-semibold">{lang.toUpperCase()}</span>
        </div>
        <h4 className="text-xl font-semibold text-gray-800">{title}</h4>
      </div>

      {/* Heading */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Heading</label>
        <input
          type="text"
          value={data.heading[lang]}
          onChange={(e) => updateField('heading', e.target.value)}
          className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
          placeholder={lang === 'en' ? 'Enter heading...' : undefined}
        />
      </div>

      {/* Subheading */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Subheading</label>
        <input
          type="text"
          value={data.subheading[lang]}
          onChange={(e) => updateField('subheading', e.target.value)}
          className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
        <textarea
          rows={4}
          value={data.description[lang]}
          onChange={(e) => updateField('description', e.target.value)}
          className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition resize-none"
        />
      </div>
    </div>
  );
};

export default CtaPage;
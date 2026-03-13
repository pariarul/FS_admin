'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import LoadingAnimation from '../../components/loading-animation';

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface StatusItem {
  id: string;
  count: string;
  en: string;
  zh: string;
  si: string;
}

interface AboutData {
  title: { en: string; zh: string; si: string };
  description: { en: string; zh: string; si: string };
  status: StatusItem[];
}

const translateToLang = async (
  targetLang: string,
  enTitle: string,
  enDescription: string
): Promise<{ title: string; description: string } | null> => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    alert('Gemini API key not configured');
    return null;
  }

  const prompt = `Translate the following to ${targetLang}. Return ONLY valid JSON:
{"title":"…","description":"…"}

English:
- Title: ${enTitle}
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

const AboutPage = () => {
  const router = useRouter();

  const [data, setData] = useState<AboutData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

useEffect(() => {
  const fetchData = async () => {
    try {
      const res = await fetch(`${baseURL}/home/get-about-section`);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();
      console.log("API Response:", json);

      if (json?.success) {
        const apiData = json.data;

        // Add default status counters if empty
        if (!apiData.status || apiData.status.length === 0) {
          apiData.status = [
            { id: "1", count: "0", en: "", zh: "", si: "" },
            { id: "2", count: "0", en: "", zh: "", si: "" },
            { id: "3", count: "0", en: "", zh: "", si: "" }
          ];
        }

        setData(apiData);
      } else {
        throw new Error("Invalid API response");
      }

    } catch (err) {
      console.error("Fetch Error:", err);
      setError((err as Error).message);
    }
  };

  fetchData();
}, []);

  const handleTranslate = async () => {
    if (!data?.title.en || !data?.description.en) {
      alert('Please fill English fields first');
      return;
    }

    setIsTranslating(true);
    try {
      const zh = await translateToLang('Chinese (Simplified)', data.title.en, data.description.en);
      if (zh) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                title: { ...prev.title, zh: zh.title },
                description: { ...prev.description, zh: zh.description },
              }
            : prev
        );
      }

      const si = await translateToLang('Sinhala', data.title.en, data.description.en);
      if (si) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                title: { ...prev.title, si: si.title },
                description: { ...prev.description, si: si.description },
              }
            : prev
        );
      }

      // Translate status labels
      for (const item of data.status) {
        if (!item.en) continue;
        const zhLabel = await translateToLang('Chinese (Simplified)', '', item.en);
        const siLabel = await translateToLang('Sinhala', '', item.en);

        if (zhLabel?.description) {
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  status: prev.status.map((s) =>
                    s.id === item.id ? { ...s, zh: zhLabel.description } : s
                  ),
                }
              : prev
          );
        }

        if (siLabel?.description) {
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  status: prev.status.map((s) =>
                    s.id === item.id ? { ...s, si: siLabel.description } : s
                  ),
                }
              : prev
          );
        }
      }
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!data) return;

    setIsSaving(true);
    setSaveMsg(null);

    try {
      const res = await fetch(`${baseURL}/home/update-about-section`, {
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

  const updateStatus = (id: string, field: keyof StatusItem, value: string) => {
    setData((prev) =>
      prev
        ? {
            ...prev,
            status: prev.status.map((item) =>
              item.id === id ? { ...item, [field]: value } : item
            ),
          }
        : prev
    );
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
      <div className="fixed w-64">
        <Sidebar />
      </div>

      <div className="flex-1 ml-64 p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Home - About Section</h2>
          <p className="mt-2 text-gray-600">Manage About content in multiple languages</p>
        </div>

        {/* Preview */}
        <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-700">Current Preview (EN)</h3>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg flex items-center gap-2"
            >
              {isEditing ? <>Cancel</> : <>Edit</>}
            </button>
          </div>

          <h2 className="text-2xl font-bold text-gray-800">{data.title.en}</h2>
          <p className="text-gray-600 mt-4 leading-relaxed">{data.description.en}</p>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.status.map((item) => (
              <div key={item.id} className="bg-gradient-to-br from-primary/5 to-primary/10 p-6 rounded-xl shadow-md text-center">
                <h4 className="text-3xl font-bold text-primary">{item.count}</h4>
                <p className="text-gray-700 mt-2 font-medium">{item.en}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Edit Form */}
        {isEditing && (
          <div className="bg-gray-50 rounded-xl p-8 shadow-lg border border-gray-200">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Edit About Content</h3>

            <form onSubmit={handleSubmit} className="space-y-10">
              {/* Title & Description */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <LangColumn lang="en" title="English" color="red" data={data} setData={setData} />
                <LangColumn lang="zh" title="Mandarin" color="yellow" data={data} setData={setData} />
                <LangColumn lang="si" title="Sinhala" color="green" data={data} setData={setData} />
              </div>

              {/* Status Items */}
              <div className="mt-12">
                <h4 className="text-xl font-semibold text-gray-800 mb-6">Status Counters</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {data.status.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white p-6 rounded-xl shadow-md border border-gray-200"
                    >
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Count
                        </label>
                        <input
                          type="text"
                          value={item.count}
                          onChange={(e) => updateStatus(item.id, 'count', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20"
                          placeholder="e.g., 500+"
                        />
                      </div>

                      <div className="space-y-3">
                        {(['en', 'zh', 'si'] as const).map((lang) => (
                          <div key={lang}>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Label ({lang.toUpperCase()})
                            </label>
                            <input
                              type="text"
                              value={item[lang]}
                              onChange={(e) => updateStatus(item.id, lang, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary/20"
                              placeholder={lang === 'en' ? 'e.g., Happy Clients' : ''}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-between items-center mt-10 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  disabled={isTranslating}
                  onClick={handleTranslate}
                  className={`px-5 py-2.5 rounded-lg flex items-center gap-2 text-white font-medium transition ${
                    isTranslating
                      ? 'bg-gray-500 opacity-60 cursor-not-allowed'
                      : 'bg-gray-600 hover:bg-gray-700'
                  }`}
                >
                  {isTranslating ? (
                    <>
                      <span className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin" />
                      Translating…
                    </>
                  ) : (
                    'Translate to Mandarin & Sinhala'
                  )}
                </button>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-5 py-2.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition flex items-center gap-2 disabled:opacity-60"
                  >
                    {isSaving ? (
                      <>
                        <span className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin" />
                        Saving…
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </div>

              {saveMsg && (
                <p
                  className={`mt-4 text-center font-medium ${
                    saveMsg.includes('failed') ? 'text-red-600' : 'text-green-600'
                  }`}
                >
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

type LangColumnProps = {
  lang: 'en' | 'zh' | 'si';
  title: string;
  color: 'red' | 'yellow' | 'green';
  data: AboutData;
  setData: React.Dispatch<React.SetStateAction<AboutData | null>>;
};

const LangColumn = ({ lang, title, color, data, setData }: LangColumnProps) => {
  const bgMap: Record<'red' | 'yellow' | 'green', string> = {
    red: 'bg-red-100 text-red-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    green: 'bg-green-100 text-green-600',
  };

  const bg = bgMap[color];

  const updateField = <K extends keyof Pick<AboutData, 'title' | 'description'>>(
    field: K,
    value: string
  ) => {
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
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
      <div className="flex items-center gap-2 mb-6">
        <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center`}>
          <span className="font-semibold text-sm">{lang.toUpperCase()}</span>
        </div>
        <h4 className="text-xl font-semibold text-gray-800">{title}</h4>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
        <input
          type="text"
          value={data.title[lang]}
          onChange={(e) => updateField('title', e.target.value)}
          className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
          placeholder={lang === 'en' ? 'Enter title...' : undefined}
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
        <textarea
          rows={5}
          value={data.description[lang]}
          onChange={(e) => updateField('description', e.target.value)}
          className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition resize-none"
        />
      </div>
    </div>
  );
};

export default AboutPage;
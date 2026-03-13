'use client';

import { useEffect, useState, FormEvent } from 'react';
import LoadingAnimation from '../../components/loading-animation';
import { Plus, X } from 'lucide-react';

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface MetadataData {
  metadata: {
    title: { en: string; zh: string; si: string };
    description: { en: string; zh: string; si: string };
    keywords: {
      en: string[];
      zh: string[];
      si: string[];
    };
  };
}

/* ---------- Gemini translation helper ---------- */
const translateToLang = async (
  targetLang: string,
  enTitle: string,
  enDescription: string,
  enKeywords: string[]
): Promise<{ title: string; description: string; keywords: string[] } | null> => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    alert('Gemini API key not configured');
    return null;
  }

  const prompt = `Translate the following to ${targetLang}. Return ONLY valid JSON:
{"title":"…","description":"…","keywords":["…","…",...]}

English:
- Title: ${enTitle}
- Description: ${enDescription}
- Keywords: ${enKeywords.join(', ')}`;

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

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      title: parsed.title?.trim() || '',
      description: parsed.description?.trim() || '',
      keywords: Array.isArray(parsed.keywords)
        ? parsed.keywords.map((k: string) => k.trim()).filter(Boolean)
        : [],
    };
  } catch (e) {
    console.error('Translation error:', e);
    alert(`Translation failed: ${(e as Error).message}`);
    return null;
  }
};

/* ---------- Main component ---------- */
const PrivacyPolicySEO = () => {
  const [data, setData] = useState<MetadataData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  /* ----- Fetch initial data ----- */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${baseURL}/seo/get-privacy-policy-seo`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: MetadataData = await res.json();
        setData(json);
      } catch (e) {
        setError((e as Error).message);
      }
    };
    fetchData();
  }, []);

  /* ----- Translation handler ----- */
  const handleTranslate = async () => {
    if (!data?.metadata.title.en?.trim() || !data?.metadata.description.en?.trim()) {
      alert('Please fill English Title and Description first');
      return;
    }

    setIsTranslating(true);
    try {
      const zh = await translateToLang(
        'Chinese (Simplified)',
        data.metadata.title.en,
        data.metadata.description.en,
        [] // Pass an empty array to exclude keywords from translation
      );
      if (zh) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                metadata: {
                  ...prev.metadata,
                  title: { ...prev.metadata.title, zh: zh.title },
                  description: { ...prev.metadata.description, zh: zh.description },
                  // Keep existing keywords unchanged
                },
              }
            : prev
        );
      }

      const si = await translateToLang(
        'Sinhala',
        data.metadata.title.en,
        data.metadata.description.en,
        [] // Pass an empty array to exclude keywords from translation
      );
      if (si) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                metadata: {
                  ...prev.metadata,
                  title: { ...prev.metadata.title, si: si.title },
                  description: { ...prev.metadata.description, si: si.description },
                  // Keep existing keywords unchanged
                },
              }
            : prev
        );
      }
    } finally {
      setIsTranslating(false);
    }
  };

  /* ----- Form submit ----- */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!data) return;

    setIsSaving(true);
    setSaveMsg(null);

    try {
      const res = await fetch(`${baseURL}/seo/update-privacy-policy-seo`, {
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

  if (error)
    return (
      <div className="p-8 text-red-600 bg-red-50 rounded-lg">Error: {error}</div>
    );

  if (!data)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <LoadingAnimation />
        <p className="mt-4 text-gray-600"></p>
      </div>
    );

  return (
    <div className="flex bg-background min-h-screen">

      {/* Main Content */}
      <div className="flex-1 ml-64 p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Privacy Policy - SEO Metadata</h2>
          <p className="mt-2 text-gray-600">
            Manage SEO title, description, and keywords in multiple languages
          </p>
        </div>

        {/* Preview Card */}
        <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-700">
              Current Preview (English)
            </h3>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg transition flex items-center gap-2"
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">
              {data.metadata.title.en || '(No title)'}
            </h2>
            <p className="text-gray-600">
              {data.metadata.description.en || '(No description)'}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {data.metadata.keywords.en.length > 0 ? (
                data.metadata.keywords.en.map((kw, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                  >
                    {kw}
                  </span>
                ))
              ) : (
                <span className="text-gray-400 text-sm">(No keywords)</span>
              )}
            </div>
          </div>
        </div>

        {/* Edit Form */}
        {isEditing && (
          <div className="bg-gray-50 rounded-xl p-8 shadow-lg border border-gray-200">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              Edit Metadata
            </h3>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <LangColumn
                  lang="en"
                  title="English"
                  color="red"
                  data={data}
                  setData={setData}
                />
                <LangColumn
                  lang="zh"
                  title="Mandarin"
                  color="yellow"
                  data={data}
                  setData={setData}
                />
                <LangColumn
                  lang="si"
                  title="Sinhala"
                  color="green"
                  data={data}
                  setData={setData}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-8">
                <button
                  type="button"
                  disabled={isTranslating}
                  onClick={handleTranslate}
                  className={`px-5 py-2.5 rounded-lg flex items-center gap-2 text-white font-medium transition ${
                    isTranslating
                      ? 'bg-gray-500 cursor-not-allowed'
                      : 'bg-gray-700 hover:bg-gray-800'
                  }`}
                >
                  {isTranslating ? (
                    <>
                      <span className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                      Translating...
                    </>
                  ) : (
                    'Translate to Mandarin & Sinhala'
                  )}
                </button>

                <div className="flex gap-3">
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
                    className="px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition flex items-center gap-2 font-medium"
                  >
                    {isSaving ? (
                      <>
                        <span className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </div>

              {saveMsg && (
                <p
                  className={`mt-4 font-medium ${
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

/* ---------- Language Column Component ---------- */
type LangColumnProps = {
  lang: 'en' | 'zh' | 'si';
  title: string;
  color: 'red' | 'yellow' | 'green';
  data: MetadataData;
  setData: React.Dispatch<React.SetStateAction<MetadataData | null>>;
};

const LangColumn = ({ lang, title, color, data, setData }: LangColumnProps) => {
  const bgColor = {
    red: 'bg-red-100 text-red-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    green: 'bg-green-100 text-green-700',
  }[color];

  const [newKeyword, setNewKeyword] = useState('');

   const updateField = <
    K extends keyof MetadataData['metadata'],
    L extends keyof MetadataData['metadata'][K]
  >(
    field: K,
    value: MetadataData['metadata'][K][L]
  ) => {
    setData((prev) =>
      prev
        ? {
            ...prev,
            metadata: {
              ...prev.metadata,
              [field]: {
                ...prev.metadata[field],
                [lang]: value,
              } as MetadataData['metadata'][K],
            },
          }
        : prev
    );
  };


  const addKeyword = () => {
    const trimmed = newKeyword.trim();
    if (trimmed && !data.metadata.keywords[lang].includes(trimmed)) {
      updateField('keywords', [...data.metadata.keywords[lang], trimmed]);
      setNewKeyword('');
    }
  };

  const removeKeyword = (index: number) => {
    updateField(
      'keywords',
      data.metadata.keywords[lang].filter((_, i) => i !== index)
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
      <div className="flex items-center gap-3 mb-6">
        <div
          className={`w-10 h-10 rounded-full ${bgColor} flex items-center justify-center font-bold text-sm`}
        >
          {lang.toUpperCase()}
        </div>
        <h4 className="text-xl font-semibold text-gray-800">{title}</h4>
      </div>

      {/* Title */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Title
        </label>
        <input
          type="text"
          value={data.metadata.title[lang]}
          onChange={(e) => updateField('title', e.target.value)}
          className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition text-base"
          placeholder={lang === 'en' ? 'Enter page title...' : undefined}
        />
      </div>

      {/* Description */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          rows={3}
          value={data.metadata.description[lang]}
          onChange={(e) => updateField('description', e.target.value)}
          className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition resize-none text-base"
          placeholder={lang === 'en' ? 'Enter meta description...' : undefined}
        />
      </div>

      {/* Keywords - POINT WISE + ADD/REMOVE */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Keywords
        </label>

        {/* Add Keyword Input */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type keyword and press Enter or click Add"
            className="flex-1 px-3 py-2 rounded-lg border-2 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition text-sm"
          />
          <button
            type="button"
            onClick={addKeyword}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        {/* Keyword Tags */}
        <div className="space-y-2">
          {data.metadata.keywords[lang].length > 0 ? (
            data.metadata.keywords[lang].map((kw, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg group hover:bg-gray-200 transition"
              >
                <span className="text-sm text-gray-700 flex-1">{kw}</span>
                <button
                  type="button"
                  onClick={() => removeKeyword(index)}
                  className="opacity-0 group-hover:opacity-100 transition p-1 hover:bg-red-100 rounded-full"
                >
                  <X className="w-4 h-4 text-red-600" />
                </button>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400 italic">No keywords added yet</p>
          )}
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Add keywords one by one. Duplicate keywords are ignored.
        </p>
      </div>
    </div>
  );
};

export default PrivacyPolicySEO;
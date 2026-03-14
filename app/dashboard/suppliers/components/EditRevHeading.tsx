import React, { useState } from "react";
import { Loader2 } from "lucide-react";

type HeadingData = {
  heading: { en: string; zh: string; si: string };
  description: { en: string; zh: string; si: string };
};

type EditRevHeadingProps = {
  headingData: HeadingData;
  onSave: (updatedHeading: HeadingData) => void;
  onCancel: () => void;
};

const EditRevHeading: React.FC<EditRevHeadingProps> = ({ headingData, onSave, onCancel }) => {
  const [editedHeading, setEditedHeading] = useState({
    heading: headingData?.heading || { en: "", zh: "", si: "" },
    description: headingData?.description || { en: "", zh: "", si: "" },
  });
  const [isTranslating, setIsTranslating] = useState(false);

  const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  const translateToLang = async (
    targetLang: string,
    enHeading: string,
    enDescription: string
  ): Promise<{ heading: string; description: string } | null> => {
    if (!geminiApiKey) {
      alert("Gemini API key not configured");
      return null;
    }

    const prompt = `Translate the following to ${targetLang}. Return ONLY valid JSON:
{"heading":"…","description":"…"}

English:
- Heading: ${enHeading}
- Description: ${enDescription}`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );

      if (!res.ok) throw new Error(`Gemini ${res.status}`);

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Empty response");

      const json = text.match(/\{.*\}/s);
      if (!json) throw new Error("No JSON found");

      return JSON.parse(json[0]);
    } catch (e) {
      console.error(e);
      alert(`Translation error: ${(e as Error).message}`);
      return null;
    }
  };

  const handleTranslate = async () => {
    const { heading: enHeading, description: enDescription } = editedHeading;

    if (!enHeading.en || !enDescription.en) {
      alert("Please fill all English fields first");
      return;
    }

    setIsTranslating(true);
    try {
      const [zhTranslation, siTranslation] = await Promise.all([
        translateToLang("Chinese (Simplified)", enHeading.en, enDescription.en),
        translateToLang("Sinhala", enHeading.en, enDescription.en),
      ]);

      if (zhTranslation) {
        setEditedHeading((prev) => ({
          ...prev,
          heading: { ...prev.heading, zh: zhTranslation.heading },
          description: { ...prev.description, zh: zhTranslation.description },
        }));
      }

      if (siTranslation) {
        setEditedHeading((prev) => ({
          ...prev,
          heading: { ...prev.heading, si: siTranslation.heading },
          description: { ...prev.description, si: siTranslation.description },
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleInputChange = (field: "heading" | "description", lang: "en" | "zh" | "si", value: string) => {
    setEditedHeading((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        [lang]: value,
      },
    }));
  };

  const handleSave = async () => {
    try {
      onSave(editedHeading);
    } catch (error) {
      console.error("Error saving heading and description:", error);
      alert(`Error: ${(error as Error).message}`);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Edit Heading and Description</h2>
      {(["en", "zh", "si"] as const).map((lang) => (
        <div key={lang} className="mb-4">
          <h3 className="text-lg font-semibold">{lang.toUpperCase()}</h3>
          <label className="block text-sm font-medium">Heading</label>
          <input
            type="text"
            value={editedHeading.heading[lang]}
            onChange={(e) => handleInputChange("heading", lang, e.target.value)}
            className="border rounded p-2 w-full"
          />
          <label className="block text-sm font-medium mt-2">Description</label>
          <textarea
            value={editedHeading.description[lang]}
            onChange={(e) => handleInputChange("description", lang, e.target.value)}
            className="border rounded p-2 w-full"
          />
        </div>
      ))}
      <div className="flex justify-between gap-4 mt-6">
        <button
          onClick={handleTranslate}
          disabled={isTranslating}
          className={`px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium transition ${
            isTranslating
              ? "bg-gray-400 text-white cursor-not-allowed"
              : "bg-gray-300 text-gray-700 hover:bg-gray-400"
          }`}
        >
          {isTranslating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Translating...
            </>
          ) : (
            "Translate to Sinhala & Mandarin"
          )}
        </button>
        <div className="flex gap-4">
          <button onClick={onCancel} className="bg-gray-300 px-4 py-2 rounded">Cancel</button>
          <button onClick={handleSave} className="bg-blue-500 text-white px-4 py-2 rounded">Save</button>
        </div>
      </div>
    </div>
  );
};

export default EditRevHeading;
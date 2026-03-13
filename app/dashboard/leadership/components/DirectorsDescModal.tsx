import React, { useState } from "react";

interface DirectorsDescModalProps {
  value: { en: string; zh?: string; si?: string };
  onChange: (val: { en: string; zh?: string; si?: string }) => void;
  onCancel: () => void;
  onSave: () => void;
}

const DirectorsDescModal: React.FC<DirectorsDescModalProps> = ({
  value,
  onChange,
  onCancel,
  onSave,
}) => {
  const [isTranslating, setIsTranslating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translateToLang = async (
    targetLang: string,
    text: string
  ): Promise<string | null> => {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      alert("Gemini API key not found");
      return null;
    }

    const prompt = `Translate the following English text to ${targetLang}. Return ONLY valid JSON in this format: {"description": "translated description"}.

English description:
"${text}"`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      if (!response.ok) throw new Error(`API request failed: ${response.status}`);

      const data = await response.json();
      const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!responseText) throw new Error("No content returned from API");

      const jsonMatch = responseText.match(/\{.*\}/s);
      if (!jsonMatch) throw new Error("No JSON found in response");

      const result = JSON.parse(jsonMatch[0]);
      return result.description;
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error("Translation error:", err);
        setError(`Failed to translate to ${targetLang}: ${err.message}`);
      } else {
        console.error("Unexpected error:", err);
        setError(`Failed to translate to ${targetLang}: An unexpected error occurred.`);
      }
      return null;
    }
  };

  const handleTranslate = async () => {
    if (!value.en.trim()) {
      alert("Please enter English description first.");
      return;
    }

    setIsTranslating(true);
    setError(null);

    try {
      const [zhResult, siResult] = await Promise.all([
        translateToLang("Chinese (Simplified)", value.en),
        translateToLang("Sinhala", value.en),
      ]);

      if (zhResult) onChange({ ...value, zh: zhResult });
      if (siResult) onChange({ ...value, si: siResult });
    } catch (err) {
      console.error(err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    const payload = {
      destination3Description: {
        en: value.en,
        zh: value.zh || '',
        si: value.si || '',
      },
    };

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/leadership/update-destination3-description`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to update description');
      }

      onSave();
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert('An error occurred while updating the description.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm bg-opacity-50 z-50 p-4">
      <div className="bg-white p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto relative">
        {/* Close Button */}
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition-colors duration-200 bg-gray-100 hover:bg-gray-200 rounded-full p-2 w-10 h-10 flex items-center justify-center"
          onClick={onCancel}
        >
          ×
        </button>

        <h3 className="text-2xl font-bold mb-6 text-center text-primary">
          Edit Director Description
        </h3>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        {/* Three Columns in One Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* English */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              English
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-lg p-4 min-h-[120px] focus:ring-2 focus:ring-primary focus:border-primary transition"
              value={value.en}
              onChange={(e) => onChange({ ...value, en: e.target.value })}
              placeholder="Enter description in English"
            />
          </div>

          {/* Mandarin */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Mandarin
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-lg p-4 min-h-[120px] bg-gray-50 focus:ring-2 focus:ring-primary focus:border-primary transition"
              value={value.zh || ""}
              onChange={(e) => onChange({ ...value, zh: e.target.value })}
              placeholder="Auto-translated or edit manually"
            />
          </div>

          {/* Sinhala */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Sinhala
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-lg p-4 min-h-[120px] bg-gray-50 focus:ring-2 focus:ring-primary focus:border-primary transition"
              value={value.si || ""}
              onChange={(e) => onChange({ ...value, si: e.target.value })}
              placeholder="Auto-translated or edit manually"
            />
          </div>
        </div>

        {/* Action Buttons - All in One Row */}
        <div className="flex items-center justify-between mt-6">
          {/* Translate Button - Left */}
          <button
            onClick={handleTranslate}
            disabled={isTranslating || !value.en || isLoading}
            className={`px-6 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-all ${
              isTranslating || !value.en || isLoading
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-primary text-white hover:bg-primary/90 shadow-md"
            }`}
          >
            {isTranslating ? (
              <>
                <span className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                Translating...
              </>
            ) : (
              <>
                Translate to Mandarin & Sinhala
              </>
            )}
          </button>

          {/* Cancel & Save - Right */}
          <div className="flex gap-3">
            <button
              className="px-6 py-2.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium transition"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              className={`px-6 py-2.5 rounded-lg flex items-center gap-2 font-medium transition shadow-md ${isLoading ? 'bg-primary/70 cursor-not-allowed text-white' : 'bg-primary text-white hover:bg-primary/90'}`}
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
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
      </div>
    </div>
  );
};

export default DirectorsDescModal;
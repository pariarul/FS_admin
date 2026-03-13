"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Edit, Upload, X, Loader2 } from "lucide-react";
import ReactCrop, { Crop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

type Leader = {
  id: string;
  name: {
    en: string;
    zh: string;
    si: string;
  };
  role: {
    en: string;
    zh: string;
    si: string;
  };
  imagePath: string;
};

type LeadershipData = {
  heading: {
    en: string;
    zh: string;
    si: string;
  };
  title: {
    en: string;
    zh: string;
    si: string;
  };
  description: {
    en: string;
    zh: string;
    si: string;
  };
  btn: {
    en: string;
    zh: string;
    si: string;
  };
  leaders: Leader[];
};

interface EditLeadershipProps {
  leadershipData: LeadershipData;
  onSave: (updatedData: LeadershipData) => void;
  onCancel: () => void;
}

const EditLeadership = ({ leadershipData, onSave, onCancel }: EditLeadershipProps) => {
  const [editedData, setEditedData] = useState(leadershipData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [dragStates, setDragStates] = useState<Record<string, boolean>>({});
  
  // Crop state
  const [selectedImage, setSelectedImage] = useState<{
    leaderId: string;
    image: string;
  } | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: "%",
    width: 75,
    height: 100,
    x: 12.5,
    y: 0,
  });

  const [isTranslating, setIsTranslating] = useState(false);

  const handleInputChange = (
    lang: "en" | "zh" | "si",
    field: keyof LeadershipData,
    value: string
  ) => {
    setEditedData((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        [lang]: value,
      },
    }));
  };

  const handleLeaderTextChange = (
    leaderId: string,
    lang: "en" | "zh" | "si",
    field: "name" | "role",
    value: string
  ) => {
    setEditedData((prev) => ({
      ...prev,
      leaders: prev.leaders.map((leader) =>
        leader.id === leaderId
          ? {
              ...leader,
              [field]: {
                ...leader[field],
                [lang]: value,
              },
            }
          : leader
      ),
    }));
  };

  const handleImageChange = (leaderId: string, image: string) => {
    setEditedData((prev) => ({
      ...prev,
      leaders: prev.leaders.map((leader) =>
        leader.id === leaderId
          ? { ...leader, imagePath: image }
          : leader
      ),
    }));
  };

  const handleRemoveImage = (leaderId: string) => {
    setEditedData((prev) => ({
      ...prev,
      leaders: prev.leaders.map((leader) =>
        leader.id === leaderId
          ? { ...leader, imagePath: "" }
          : leader
      ),
    }));
  };

  // Unified file handler
  const handleFile = (file?: File, leaderId?: string) => {
    if (file && file.type.startsWith("image/") && file.size <= 5 * 1024 * 1024 && leaderId) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setSelectedImage({ leaderId, image: result });
        setCrop({
          unit: "%",
          width: 75,
          height: 100,
          x: 12.5,
          y: 0,
        });
        setIsModalOpen(true);
      };
      reader.readAsDataURL(file);
    } else if (file) {
      alert("Image must be under 5MB");
    }
  };

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    leaderId: string
  ) => {
    const file = e.target.files?.[0];
    handleFile(file, leaderId);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, leaderId: string) => {
    e.preventDefault();
    setDragStates((prev) => ({ ...prev, [leaderId]: false }));
    const file = e.dataTransfer.files[0];
    handleFile(file, leaderId);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDragEnter = (leaderId: string) => {
    setDragStates((prev) => ({ ...prev, [leaderId]: true }));
  };

  const handleDragLeave = (leaderId: string) => {
    setDragStates((prev) => ({ ...prev, [leaderId]: false }));
  };

  const translateToLang = async (
    targetLang: string,
    enText: string
  ): Promise<string | null> => {
    if (!geminiApiKey) {
      alert("Gemini API key not configured");
      return null;
    }

    const prompt = `Translate the following to ${targetLang}. Return ONLY valid JSON:
{"text":"…"}

English:
- Text: ${enText}`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
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

      return JSON.parse(json[0]).text;
    } catch (e) {
      console.error(e);
      alert(`Translation error: ${(e as Error).message}`);
      return null;
    }
  };

  const handleTranslate = async () => {
    if (!editedData.heading.en || !editedData.description.en || !editedData.title.en || !editedData.btn.en) {
      alert("Please fill English fields first");
      return;
    }

    setIsTranslating(true);
    try {
      const zhHeading = await translateToLang("Chinese (Simplified)", editedData.heading.en);
      const zhDescription = await translateToLang("Chinese (Simplified)", editedData.description.en);
      const zhTitle = await translateToLang("Chinese (Simplified)", editedData.title.en);
      const zhBtn = await translateToLang("Chinese (Simplified)", editedData.btn.en);

      const siHeading = await translateToLang("Sinhala", editedData.heading.en);
      const siDescription = await translateToLang("Sinhala", editedData.description.en);
      const siTitle = await translateToLang("Sinhala", editedData.title.en);
      const siBtn = await translateToLang("Sinhala", editedData.btn.en);

      const translatedLeaders = await Promise.all(
        editedData.leaders.map(async (leader) => {
          const zhName = await translateToLang("Chinese (Simplified)", leader.name.en);
          const zhRole = await translateToLang("Chinese (Simplified)", leader.role.en);

          const siName = await translateToLang("Sinhala", leader.name.en);
          const siRole = await translateToLang("Sinhala", leader.role.en);

          return {
            ...leader,
            name: { en: leader.name.en, zh: zhName || "", si: siName || "" },
            role: { en: leader.role.en, zh: zhRole || "", si: siRole || "" },
          };
        })
      );

      setEditedData((prev) => ({
        ...prev,
        heading: { en: prev.heading.en, zh: zhHeading || "", si: siHeading || "" },
        description: { en: prev.description.en, zh: zhDescription || "", si: siDescription || "" },
        title: { en: prev.title.en, zh: zhTitle || "", si: siTitle || "" },
        btn: { en: prev.btn.en, zh: zhBtn || "", si: siBtn || "" },
        leaders: translatedLeaders,
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMsg(null);

    try {
      const res = await fetch(`${baseURL}/home/update-leadership-section`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedData),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setSaveMsg("Saved successfully!");
      onSave(editedData);
      window.location.reload();
    } catch (err) {
      setSaveMsg(`Save failed: ${(err as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCropComplete = useCallback((cropParam: PixelCrop) => {
    if (imageRef.current && cropParam.width && cropParam.height) {
      const canvas = document.createElement("canvas");
      const scaleX = imageRef.current.naturalWidth / imageRef.current.width;
      const scaleY = imageRef.current.naturalHeight / imageRef.current.height;
      canvas.width = cropParam.width;
      canvas.height = cropParam.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Draw the cropped image without any background fill for transparency
        ctx.drawImage(
          imageRef.current,
          cropParam.x * scaleX,
          cropParam.y * scaleY,
          cropParam.width * scaleX,
          cropParam.height * scaleY,
          0,
          0,
          cropParam.width,
          cropParam.height
        );
        // Use PNG format for transparency
        const base64Image = canvas.toDataURL("image/png");
        setCroppedImage(base64Image);
      }
    }
  }, []);

  const saveCroppedImage = () => {
    if (croppedImage && selectedImage) {
      setEditedData((prev) => ({
        ...prev,
        leaders: prev.leaders.map((leader) =>
          leader.id === selectedImage.leaderId
            ? { ...leader, imagePath: croppedImage }
            : leader
        ),
      }));
      setCroppedImage(null);
      setSelectedImage(null);
      setIsModalOpen(false);
    }
  };

  const cancelCrop = () => {
    setSelectedImage(null);
    setCroppedImage(null);
    setIsModalOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] overflow-y-auto p-6 relative">
        {/* Close Button */}
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition text-3xl font-light bg-gray-100 hover:bg-gray-200 rounded-full w-10 h-10 flex items-center justify-center"
          onClick={onCancel}
        >
          ×
        </button>

        <h2 className="text-3xl font-bold mb-8 text-center text-primary border-b border-gray-200 pb-4">
          Edit Leadership Section
        </h2>

        {/* Global Section: Heading, Title & Description */}
        <div className="mb-10">
          <h3 className="text-lg font-semibold mb-4 text-primary">Section Content</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(["en", "zh", "si"] as const).map((lang) => (
              <section key={lang}>
                <h4 className="text-xl font-semibold mb-4 border-b pb-2 text-center text-primary">
                  {lang === "en" ? "English" : lang === "zh" ? "Mandarin" : "Sinhala"}
                </h4>
                <label className="block font-medium mb-1 text-gray-700">Heading:</label>
                <input
                  type="text"
                  value={editedData.heading[lang]}
                  onChange={(e) => handleInputChange(lang, "heading", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 mb-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
                <label className="block font-medium mb-1 text-gray-700">Title:</label>
                <input
                  type="text"
                  value={editedData.title[lang]}
                  onChange={(e) => handleInputChange(lang, "title", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 mb-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
                <label className="block font-medium mb-1 text-gray-700">Description:</label>
                <textarea
                  value={editedData.description[lang]}
                  onChange={(e) => handleInputChange(lang, "description", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 h-32 resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
                <label className="block font-medium mb-1 text-gray-700 mt-3">Button:</label>
                <input
                  type="text"
                  value={editedData.btn[lang]}
                  onChange={(e) => handleInputChange(lang, "btn", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </section>
            ))}
          </div>
        </div>

        {/* Leaders */}
        <div className="mb-10 bg-gray-50 p-6 rounded-xl">
          <h3 className="text-lg font-semibold mb-4 text-primary">Leaders</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> {/* Adjusted grid-cols for 2 leaders per row */}
            {editedData.leaders.map((leader) => (
              <div key={leader.id} className="border border-gray-200 rounded-xl p-6 bg-white w-full"> {/* Set width to full */}
                {/* Image Section */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                    Leader Image
                  </label>
                  <div
                    className={`relative h-80 w-3/6 mx-auto border-3 border-dashed rounded-xl flex items-center justify-center cursor-pointer overflow-hidden transition-all duration-300 ${
                      dragStates[leader.id]
                        ? "border-primary bg-primary/10 scale-105"
                        : "border-primary/30 hover:border-primary/50"
                    }`}
                    onDragEnter={() => handleDragEnter(leader.id)}
                    onDragOver={handleDragOver}
                    onDragLeave={() => handleDragLeave(leader.id)}
                    onDrop={(e) => handleDrop(e, leader.id)}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer z-30"
                      onChange={(e) => handleFileSelect(e, leader.id)}
                    />
                    <div
                      className={`absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-60 opacity-0 hover:opacity-100 transition-opacity duration-300 z-20 ${
                        dragStates[leader.id] ? "opacity-100" : ""
                      }`}
                    >
                      <Upload className="h-12 w-12 text-white mb-2" />
                      <span className="text-white text-center font-medium">
                        Drop Here<br />
                        <span className="text-sm">or Click</span>
                      </span>
                    </div>
                    {leader.imagePath ? (
                      <div className="relative w-full h-full group">
                        <img
                          src={leader.imagePath}
                          alt="Leader"
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage(leader.id);
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition z-30"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center z-10">
                        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                        <p className="text-gray-500 font-medium">Click or Drag & Drop</p>
                        <p className="text-xs text-gray-400">Max 5MB • 3:4</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Language Inputs */}
                <div className="grid grid-cols-1 gap-4">
                  {(["en", "zh", "si"] as const).map((lang) => (
                    <div key={lang} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                            lang === "en" ? "bg-red-500" : lang === "zh" ? "bg-yellow-500" : "bg-green-500"
                          }`}
                        >
                          {lang.toUpperCase()}
                        </div>
                        <label className="text-sm font-medium text-gray-700">
                          {lang === "en" ? "English" : lang === "zh" ? "Mandarin" : "Sinhala"}
                        </label>
                      </div>

                      <input
                        type="text"
                        placeholder="Name"
                        value={leader.name[lang]}
                        onChange={(e) =>
                          handleLeaderTextChange(leader.id, lang, "name", e.target.value)
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                      />

                      <input
                        type="text"
                        placeholder="Role"
                        value={leader.role[lang]}
                        onChange={(e) =>
                          handleLeaderTextChange(leader.id, lang, "role", e.target.value)
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <button
            disabled={isTranslating}
            className={`px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium transition ${
              isTranslating
                ? "bg-gray-400 text-white cursor-not-allowed"
                : "bg-gray-300 text-gray-700 hover:bg-gray-400"
            }`}
            onClick={handleTranslate}
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
            <button
              className="px-6 py-2.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium transition"
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              disabled={isSaving}
              className={`px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium transition ${
                isSaving
                  ? "bg-primary/70 cursor-not-allowed text-white"
                  : "bg-primary text-white hover:bg-primary/90 shadow-md"
              }`}
              onClick={handleSave}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>

        {saveMsg && (
          <p
            className={`mt-4 text-center font-medium ${
              saveMsg.includes("failed") ? "text-red-600" : "text-green-600"
            }`}
          >
            {saveMsg}
          </p>
        )}

        {/* Crop Modal - 3:4 Aspect Ratio */}
        {isModalOpen && selectedImage && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-4xl w-full max-h-[96vh] overflow-auto">
              <h3 className="text-xl font-bold mb-4 text-center text-primary">
                Crop Leader Image
              </h3>

              {/* 3:4 Aspect Ratio Container */}
              <div className="relative mx-auto w-full max-w-md" style={{ aspectRatio: '3 / 4', height: '400px' }}>
                <div className="absolute inset-0 overflow-hidden rounded-lg border-2 border-gray-300">
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={handleCropComplete}
                    aspect={3 / 4}
                    className="h-full w-full"
                  >
                    <img
                      src={selectedImage.image}
                      ref={imageRef}
                      alt="Crop preview"
                      className="h-100 w-full object-contain"
                      style={{ maxHeight: '100%', objectFit: 'contain' }}
                    />
                  </ReactCrop>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={cancelCrop}
                  className="px-5 py-2.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCroppedImage}
                  disabled={!croppedImage}
                  className={`px-5 py-2.5 rounded-lg font-medium transition ${
                    croppedImage
                      ? 'bg-primary text-white hover:bg-primary/90 shadow-md'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {croppedImage ? 'Apply Crop' : 'Cropping...'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditLeadership;
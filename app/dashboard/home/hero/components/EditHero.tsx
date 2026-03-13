"use client";

import React, { useState, useRef, useCallback } from "react";
import { X, Upload, Loader2 } from "lucide-react";
import ReactCrop, { Crop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

interface HeroSectionData {
  background: { [key: string]: string };
  heading: { en: string; zh: string; si: string };
  subheading: { en: string; zh: string; si: string };
  scrolldown: { en: string; zh: string; si: string };
  "suppliers_branding": { [key: string]: string };
}

interface EditHeroProps {
  heroData: HeroSectionData;
  onSave: (updatedData: HeroSectionData) => void;
  onCancel: () => void;
}

const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

const translateToLang = async (
  targetLang: string,
  enHeading: string,
  enSubheading: string
): Promise<{ heading: string; subheading: string } | null> => {
  if (!geminiApiKey) {
    alert("Gemini API key not configured");
    return null;
  }

  const prompt = `Translate the following to ${targetLang}. Return ONLY valid JSON:
{"heading":"…","subheading":"…"}

English:
- Heading: ${enHeading}
- Subheading: ${enSubheading}`;

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

const EditHero: React.FC<EditHeroProps> = ({ heroData, onSave, onCancel }) => {
  const defaultBackground = {
    bg1: "",
    bg2: "",
    bg3: "",
    bg4: ""
  };

  const defaultLogos = {
    branding1: "",
    branding2: "",
    branding3: "",
    branding4: "",
    branding5: "",
    branding6: "",
    branding7: "",
    branding8: "",
    branding9: "",
    branding10: ""
  };

  const [editedData, setEditedData] = useState({
    ...heroData,

    background: {
      ...defaultBackground,
      ...(heroData?.background || {})
    },

    suppliers_branding: {
      ...defaultLogos,
      ...(heroData?.suppliers_branding || {})
    }
  });
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  console.log("Edited Data:", editedData);
  // Crop state
  const [selectedImage, setSelectedImage] = useState<{
    key: string;
    image: string;
    section: "background" | "suppliers_branding";
  } | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cropAspect, setCropAspect] = useState<number>(16 / 9); // default background
  const imageRef = useRef<HTMLImageElement>(null);

  const [crop, setCrop] = useState<Crop>({
    unit: "%",
    width: 80,
    height: 45,
    x: 10,
    y: 27.5,
  });

  const [draggingKey, setDraggingKey] = useState<string | null>(null);

  const handleInputChange = (
    lang: "en" | "zh" | "si",
    field: "heading" | "subheading" | "scrolldown",
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

  // Unified file handler
  const handleFile = (file?: File, key?: string, section?: "background" | "suppliers_branding") => {
    if (file && file.type.startsWith("image/") && file.size <= 5 * 1024 * 1024 && key && section) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setSelectedImage({ key, image: result, section });
        const aspect = section === "background" ? 16 / 9 : 1;
        setCropAspect(aspect);
        setCrop({
          unit: "%",
          width: aspect > 1 ? 80 : 80,
          height: aspect > 1 ? 45 : 80,
          x: 10,
          y: aspect > 1 ? 27.5 : 10,
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
    key: string,
    section: "background" | "suppliers_branding"
  ) => {
    const file = e.target.files?.[0];
    handleFile(file, key, section);
  };

  const handleImageUpload = (
    event: React.DragEvent<HTMLDivElement>,
    key: string,
    section: "background" | "suppliers_branding"
  ) => {
    event.preventDefault();
    setDraggingKey(null);
    const file = event.dataTransfer.files[0];
    handleFile(file, key, section);
  };

  const handleRemoveImage = (key: string, section: "background" | "suppliers_branding") => {
    setEditedData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: "",
      },
    }));
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
        [selectedImage.section]: {
          ...prev[selectedImage.section],
          [selectedImage.key]: croppedImage,
        },
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

  const handleTranslate = async () => {
    if (!editedData?.heading.en || !editedData?.subheading.en) {
      alert("Please fill English fields first");
      return;
    }

    setIsTranslating(true);
    try {
      const [zh, si] = await Promise.all([
        translateToLang("Chinese (Simplified)", editedData.heading.en, editedData.subheading.en),
        translateToLang("Sinhala", editedData.heading.en, editedData.subheading.en),
      ]);

      if (zh) {
        setEditedData((prev) => ({
          ...prev,
          heading: { ...prev.heading, zh: zh.heading },
          subheading: { ...prev.subheading, zh: zh.subheading },
        }));
      }

      if (si) {
        setEditedData((prev) => ({
          ...prev,
          heading: { ...prev.heading, si: si.heading },
          subheading: { ...prev.subheading, si: si.subheading },
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${baseURL}/home/update-hero-section`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedData),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      onSave(editedData);
      window.location.reload();
    } catch (err) {
      console.error("Error saving hero section:", err);
      alert("Failed to save. Check console.");
    } finally {
      setIsSaving(false);
    }
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
          Edit Hero Section
        </h2>

        {/* Text Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {(["en", "zh", "si"] as const).map((lang) => (
            <section key={lang}>
              <h3 className="text-xl font-semibold mb-4 border-b pb-2 text-center text-primary">
                {lang === "en" ? "English" : lang === "zh" ? "Mandarin" : "Sinhala"}
              </h3>
              <label className="block font-medium mb-1 text-gray-700">Heading:</label>
              <input
                type="text"
                value={editedData.heading[lang] || ""}
                onChange={(e) => handleInputChange(lang, "heading", e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 mb-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
              <label className="block font-medium mb-1 text-gray-700">Subheading:</label>
              <textarea
                value={editedData.subheading[lang] || ""}
                onChange={(e) => handleInputChange(lang, "subheading", e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 h-32 resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
            </section>
          ))}
        </div>

        {/* Background Images */}
        <div className="mb-10 bg-gray-50 p-6 rounded-xl">
          <h3 className="text-lg font-semibold mb-4 text-primary">Background Images</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(editedData.background).map(([key, path]) => (
              <div key={key} className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-2">{key}</label>
                <div
                  className={`relative h-60 border-3 border-dashed rounded-xl flex items-center justify-center cursor-pointer overflow-hidden transition-all duration-300 ${draggingKey === `${key}-bg` ? "border-primary bg-primary/10 scale-105" : "border-primary/30 hover:border-primary/50"
                    }`}
                  onDragEnter={() => setDraggingKey(`${key}-bg`)}
                  onDragOver={(e) => e.preventDefault()}
                  onDragLeave={() => setDraggingKey(null)}
                  onDrop={(e) => handleImageUpload(e, key, "background")}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer z-30"
                    onChange={(e) => handleFileSelect(e, key, "background")}
                  />
                  <div
                    className={`absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-60 opacity-0 hover:opacity-100 transition-opacity duration-300 z-20 ${draggingKey === `${key}-bg` ? "opacity-100" : ""
                      }`}
                  >
                    <Upload className="h-12 w-12 text-white mb-2" />
                    <span className="text-white text-center font-medium">
                      Drop Here<br />
                      <span className="text-sm">or Click</span>
                    </span>
                  </div>
                  {path ? (
                    <div className="relative w-full h-full group">
                      <img src={path} alt={key} className="w-full h-full object-cover" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage(key, "background");
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
                      <p className="text-xs text-gray-400">Max 5MB • 16:9</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Suppliers Branding */}
        <div className="mb-10 bg-gray-50 p-6 rounded-xl">
          <h3 className="text-lg font-semibold mb-4 text-primary">Suppliers Branding Logos</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Object.entries(
              editedData.suppliers_branding
            ).map(([key, path]) => (
              <div key={key} className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-2">{key}</label>
                <div
                  className={`relative w-48 h-48 border-3 border-dashed rounded-xl flex items-center justify-center cursor-pointer overflow-hidden transition-all duration-300 ${draggingKey === `${key}-brand` ? "border-primary bg-primary/10 scale-105" : "border-primary/30 hover:border-primary/50"
                    }`}
                  onDragEnter={() => setDraggingKey(`${key}-brand`)}
                  onDragOver={(e) => e.preventDefault()}
                  onDragLeave={() => setDraggingKey(null)}
                  onDrop={(e) => handleImageUpload(e, key, "suppliers_branding")}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer z-30"
                    onChange={(e) => handleFileSelect(e, key, "suppliers_branding")}
                  />
                  <div
                    className={`absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-60 opacity-0 hover:opacity-100 transition-opacity duration-300 z-20 ${draggingKey === `${key}-brand` ? "opacity-100" : ""
                      }`}
                  >
                    <Upload className="h-10 w-10 text-white mb-2" />
                    <span className="text-white text-center font-medium text-sm">
                      Drop Logo<br />
                      <span className="text-xs">or Click</span>
                    </span>
                  </div>
                  {path ? (
                    <div className="relative w-full h-full group">
                      <img src={path} alt={key} className="w-full h-full object-contain p-4" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage(key, "suppliers_branding");
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition z-30"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center z-10">
                      <Upload className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                      <p className="text-gray-500 font-medium text-sm">Click or Drag & Drop</p>
                      <p className="text-xs text-gray-400">Max 5MB • Square</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <button
            disabled={isTranslating}
            className={`px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium transition ${isTranslating
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
              className={`px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium transition ${isSaving
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

        {/* Crop Modal */}
        {isModalOpen && selectedImage && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
              <h3 className="text-xl font-bold mb-4 text-center text-primary">
                Crop {selectedImage.section === "background" ? "Background" : "Branding Logo"}
              </h3>

              {/* 16:9 Aspect Ratio Container */}
              <div className="relative mx-auto w-full max-w-md" style={{ aspectRatio: '16 / 9', height: '300px' }}>
                <div className="absolute inset-0 overflow-hidden rounded-lg border-2 border-gray-300">
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={handleCropComplete}
                    aspect={16 / 9}
                    className="h-full w-full"
                  >
                    <img
                      src={selectedImage.image}
                      ref={imageRef}
                      alt="Crop preview"
                      className="h-100 w-full object-contain"
                      style={{ maxHeight: '100%' }}
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
                  className={`px-5 py-2.5 rounded-lg font-medium transition ${croppedImage
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

export default EditHero;
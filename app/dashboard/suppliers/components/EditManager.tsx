"use client";

import React, { useState, useRef, useCallback } from "react";
import { X, Upload, Loader2 } from "lucide-react";
import ReactCrop, { Crop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

export interface ManagerData {
  imagePath: string;
  name: { en: string; zh?: string; si?: string };
  role: { en: string; zh?: string; si?: string };
  heading: { en: string; zh?: string; si?: string };
  description: { en: string; zh?: string; si?: string };
}

export interface SupplierMapData {
  heading: { en: string; zh?: string; si?: string };
  description: { en: string; zh?: string; si?: string };
  imagePath: string;
}

interface EditManagerProps {
  managerData: ManagerData;
  supplierMapData?: SupplierMapData;
  onSave: (updatedManager: ManagerData, updatedMap?: SupplierMapData) => void;
  onCancel: () => void;
}

const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

/* ---------- Translation helpers ---------- */
const translateToLang = async (
  targetLang: string,
  enName: string,
  enRole: string,
  enHeading: string,
  enDescription: string
): Promise<{
  name: string;
  role: string;
  heading: string;
  description: string;
} | null> => {
  if (!geminiApiKey) {
    alert("Gemini API key not configured");
    return null;
  }

  const prompt = `Translate the following to ${targetLang}. Return ONLY valid JSON:
{"name":"…","role":"…","heading":"…","description":"…"}

English:
- Name: ${enName}
- Role: ${enRole}
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

const translateMapToLang = async (
  targetLang: string,
  enMapHeading: string,
  enMapDescription: string
): Promise<{ heading: string; description: string } | null> => {
  if (!geminiApiKey) {
    alert("Gemini API key not configured");
    return null;
  }

  const prompt = `Translate the following to ${targetLang}. Return ONLY valid JSON:
{"heading":"…","description":"…"}

English:
- Heading: ${enMapHeading}
- Description: ${enMapDescription}`;

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
    alert(`Map translation error: ${(e as Error).message}`);
    return null;
  }
};

/* ---------- Component ---------- */
const EditManager: React.FC<EditManagerProps> = ({
  managerData,
  supplierMapData,
  onSave,
  onCancel,
}) => {
  const [editedManager, setEditedManager] = useState(managerData);
  const [editedMap, setEditedMap] = useState(supplierMapData);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Crop state
  const [selectedImage, setSelectedImage] = useState<{ image: string; isMap: boolean } | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  // Default crop: 75% width, 100% height, centered
  const [crop, setCrop] = useState<Crop>({
    unit: "%",
    width: 75,
    height: 100,
    x: 12.5,
    y: 0,
  });

  const [draggingManager, setDraggingManager] = useState(false);
  const [draggingMap, setDraggingMap] = useState(false);

  const handleInputChange = (
    lang: "en" | "zh" | "si",
    field: keyof ManagerData | keyof SupplierMapData,
    value: string,
    isMap: boolean = false
  ) => {
    if (isMap && editedMap) {
      setEditedMap((prev) => ({
        ...prev!,
        [field]: {
          ...((prev![field as keyof SupplierMapData] as object) || {}),
          [lang]: value,
        },
      }));
    } else {
      setEditedManager((prev) => ({
        ...prev,
        [field]: {
          ...((prev[field as keyof ManagerData] as object) || {}),
          [lang]: value,
        },
      }));
    }
  };

  // Unified file handler
  const handleFile = (file?: File, isMap: boolean = false) => {
    if (file && file.type.startsWith("image/") && file.size <= 5 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setSelectedImage({ image: result, isMap });
        // Reset crop to default
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isMap: boolean = false) => {
    const file = e.target.files?.[0];
    handleFile(file, isMap);
  };

  const handleImageUpload = (event: React.DragEvent<HTMLDivElement>, isMap: boolean = false) => {
    event.preventDefault();
    if (isMap) setDraggingMap(false);
    else setDraggingManager(false);
    const file = event.dataTransfer.files[0];
    handleFile(file, isMap);
  };

  const handleRemoveImage = (isMap: boolean = false) => {
    if (isMap && editedMap) {
      setEditedMap((prev) => ({ ...prev!, imagePath: "" }));
    } else {
      setEditedManager((prev) => ({ ...prev, imagePath: "" }));
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
         const base64Image = canvas.toDataURL("image/png");
        setCroppedImage(base64Image);
      }
    }
  }, []);

  const saveCroppedImage = () => {
    if (croppedImage && selectedImage) {
      if (selectedImage.isMap && editedMap) {
        setEditedMap((prev) => ({ ...prev!, imagePath: croppedImage }));
      } else {
        setEditedManager((prev) => ({ ...prev, imagePath: croppedImage }));
      }
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
    const {
      name: { en: enName },
      role: { en: enRole },
      heading: { en: enHeading },
      description: { en: enDescription },
    } = editedManager;

    if (!enName || !enRole || !enHeading || !enDescription) {
      alert("Please fill all English manager fields first");
      return;
    }

    setIsTranslating(true);
    try {
      const [zhMgr, siMgr] = await Promise.all([
        translateToLang("Chinese (Simplified)", enName, enRole, enHeading, enDescription),
        translateToLang("Sinhala", enName, enRole, enHeading, enDescription),
      ]);

      if (zhMgr) {
        setEditedManager((prev) => ({
          ...prev,
          name: { ...prev.name, zh: zhMgr.name },
          role: { ...prev.role, zh: zhMgr.role },
          heading: { ...prev.heading, zh: zhMgr.heading },
          description: { ...prev.description, zh: zhMgr.description },
        }));
      }

      if (siMgr) {
        setEditedManager((prev) => ({
          ...prev,
          name: { ...prev.name, si: siMgr.name },
          role: { ...prev.role, si: siMgr.role },
          heading: { ...prev.heading, si: siMgr.heading },
          description: { ...prev.description, si: siMgr.description },
        }));
      }

      if (editedMap) {
        const {
          heading: { en: enMapHeading },
          description: { en: enMapDescription },
        } = editedMap;

        if (enMapHeading && enMapDescription) {
          const [zhMap, siMap] = await Promise.all([
            translateMapToLang("Chinese (Simplified)", enMapHeading, enMapDescription),
            translateMapToLang("Sinhala", enMapHeading, enMapDescription),
          ]);

          if (zhMap) {
            setEditedMap((prev) => ({
              ...prev!,
              heading: { ...prev!.heading, zh: zhMap.heading },
              description: { ...prev!.description, zh: zhMap.description },
            }));
          }

          if (siMap) {
            setEditedMap((prev) => ({
              ...prev!,
              heading: { ...prev!.heading, si: siMap.heading },
              description: { ...prev!.description, si: siMap.description },
            }));
          }
        }
      }
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
      setSaveMsg("Saved successfully!");
      onSave(editedManager, editedMap);
    } catch (err) {
      setSaveMsg(`Save failed: ${(err as Error).message}`);
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
          Edit Manager Section
        </h2>

        {/* Manager Image */}
        <div className="mb-10 bg-gray-50 p-6 rounded-xl">
          <label className="text-lg font-semibold mb-4 text-primary block">Manager Profile Image</label>
          <div
            className={`relative w-64 h-80 border-3 border-dashed rounded-xl flex items-center justify-center cursor-pointer overflow-hidden transition-all duration-300 ${
              draggingManager ? "border-primary bg-primary/10 scale-105" : "border-primary/30 hover:border-primary/50"
            }`}
            onDragEnter={() => setDraggingManager(true)}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={() => setDraggingManager(false)}
            onDrop={handleImageUpload}
          >
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer z-30"
              onChange={handleFileSelect}
            />
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-60 opacity-0 hover:opacity-100 transition-opacity duration-300 z-20 ${
                draggingManager ? "opacity-100" : ""
              }`}
            >
              <Upload className="h-12 w-12 text-white mb-2" />
              <span className="text-white text-center font-medium">
                Drop Here<br />
                <span className="text-sm">or Click</span>
              </span>
            </div>
            {editedManager.imagePath ? (
              <div className="relative w-full h-full group">
                <img src={editedManager.imagePath} alt="Manager" className="w-full h-full object-cover" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage();
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

        {/* Manager Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {(["en", "zh", "si"] as const).map((lang) => (
            <section key={lang}>
              <h3 className="text-xl font-semibold mb-4 border-b pb-2 text-center text-primary">
                {lang === "en" ? "English" : lang === "zh" ? "Mandarin" : "Sinhala"}
              </h3>
              <label className="block font-medium mb-1 text-gray-700">Name:</label>
              <input
                type="text"
                value={editedManager?.name?.[lang] || ""}
                onChange={(e) => handleInputChange(lang, "name", e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 mb-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
              <label className="block font-medium mb-1 text-gray-700">Role:</label>
              <input
                type="text"
                value={editedManager.role[lang] || ""}
                onChange={(e) => handleInputChange(lang, "role", e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 mb-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
              <label className="block font-medium mb-1 text-gray-700">Heading:</label>
              <input
                type="text"
                value={editedManager.heading[lang] || ""}
                onChange={(e) => handleInputChange(lang, "heading", e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 mb-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
              <label className="block font-medium mb-1 text-gray-700">Description:</label>
              <textarea
                value={editedManager.description[lang] || ""}
                onChange={(e) => handleInputChange(lang, "description", e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 h-40 resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
            </section>
          ))}
        </div>

        {/* Supplier Map Section */}
        {editedMap && (
          <>
            <div className="mb-10 bg-gray-50 p-6 rounded-xl">
              <label className="text-lg font-semibold mb-4 text-primary block">Supplier Map Image</label>
              <div
                className={`relative w-full h-64 border-3 border-dashed rounded-xl flex items-center justify-center cursor-pointer overflow-hidden transition-all duration-300 ${
                  draggingMap ? "border-primary bg-primary/10 scale-105" : "border-primary/30 hover:border-primary/50"
                }`}
                onDragEnter={() => setDraggingMap(true)}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={() => setDraggingMap(false)}
                onDrop={(e) => handleImageUpload(e, true)}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer z-30"
                  onChange={(e) => handleFileSelect(e, true)}
                />
                <div
                  className={`absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-60 opacity-0 hover:opacity-100 transition-opacity duration-300 z-20 ${
                    draggingMap ? "opacity-100" : ""
                  }`}
                >
                  <Upload className="h-12 w-12 text-white mb-2" />
                  <span className="text-white text-center font-medium">
                    Drop Here<br />
                    <span className="text-sm">or Click</span>
                  </span>
                </div>
                {editedMap.imagePath ? (
                  <div className="relative w-full h-full group">
                    <img src={editedMap.imagePath} alt="Map" className="w-full h-full object-cover" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(true);
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(["en", "zh", "si"] as const).map((lang) => (
                <section key={lang}>
                  <h3 className="text-xl font-semibold mb-4 border-b pb-2 text-center text-primary">
                    Map {lang === "en" ? "English" : lang === "zh" ? "Mandarin" : "Sinhala"}
                  </h3>
                  <label className="block font-medium mb-1 text-gray-700">Heading:</label>
                  <input
                    type="text"
                    value={editedMap.heading[lang] || ""}
                    onChange={(e) => handleInputChange(lang, "heading", e.target.value, true)}
                    className="w-full border border-gray-300 rounded-lg p-3 mb-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                  />
                  <label className="block font-medium mb-1 text-gray-700">Description:</label>
                  <textarea
                    value={editedMap.description[lang] || ""}
                    onChange={(e) => handleInputChange(lang, "description", e.target.value, true)}
                    className="w-full border border-gray-300 rounded-lg p-3 h-40 resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                  />
                </section>
              ))}
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex justify-between items-center">
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

        {/* Crop Modal - Dynamic Aspect Ratio */}
        {isModalOpen && selectedImage && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
              <h3 className="text-xl font-bold mb-4 text-center text-primary">
                Crop {selectedImage.isMap ? "Map" : "Manager"} Image
              </h3>

              {/* Enforced fixed 3:4 aspect ratio for Manager images */}
              <div
                className="relative mx-auto w-full max-w-2xl"
                style={{
                  aspectRatio: "3 / 4",
                  height: "400px",
                }}
              >
                <div className="absolute inset-0 overflow-hidden rounded-lg border-2 border-gray-300">
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={handleCropComplete}
                    aspect={selectedImage.isMap ? 16 / 9 : 3 / 4}
                    className="h-full w-full"
                  >
                    <img
                      src={selectedImage.image}
                      ref={imageRef}
                      alt="Crop preview"
                      className="h-100 w-full object-contain"
                      style={{ maxHeight: "100%" }}
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
                      ? "bg-primary text-white hover:bg-primary/90 shadow-md"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {croppedImage ? "Apply Crop" : "Cropping..."}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditManager;
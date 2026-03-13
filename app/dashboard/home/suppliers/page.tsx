"use client";

import { useEffect, useState, FormEvent, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import LoadingAnimation from "../../components/loading-animation";
import { Upload, X, Loader2 } from "lucide-react";
import ReactCrop, { Crop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;
const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

interface SupplierData {
  heading: { en: string; zh: string; si: string };
  description: { en: string; zh: string; si: string };
  imagePath: string;
}

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
    if (!text) throw new Error("Empty response from Gemini");

    const jsonMatch = text.match(/\{.*\}/s);
    if (!jsonMatch) throw new Error("No JSON found in response");

    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("Translation error:", e);
    alert(`Translation failed: ${(e as Error).message}`);
    return null;
  }
};

const SupplierPage = () => {
  const router = useRouter();

  const [data, setData] = useState<SupplierData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Crop state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: "%",
    width: 80,
    height: 45,
    x: 10,
    y: 27.5,
  });
  const [dragging, setDragging] = useState(false);

 useEffect(() => {
  const fetchData = async () => {
    try {
      const res = await fetch(`${baseURL}/home/get-supplier-section`);

      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status}`);
      }

      const json = await res.json();

      console.log("Supplier API Response:", json);

      if (json?.success && json?.data) {
        setData(json.data);
      } else {
        throw new Error("Invalid API response structure");
      }

    } catch (error) {
      console.error("Supplier Fetch Error:", error);
      setError((error as Error).message);
    }
  };

  fetchData();
}, []);

  const handleInputChange = (
    lang: "en" | "zh" | "si",
    field: "heading" | "description",
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

  // Unified file handler
  const handleFile = (file?: File) => {
    if (file && file.type.startsWith("image/") && file.size <= 5 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setSelectedImage(result);
        setCrop({
          unit: "%",
          width: 80,
          height: 45,
          x: 10,
          y: 27.5,
        });
        setIsModalOpen(true); // Ensure modal opens
      };
      reader.readAsDataURL(file);
    } else if (file) {
      alert("Image must be under 5MB");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    handleFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleRemoveImage = () => {
    setData((prev) => (prev ? { ...prev, imagePath: "" } : prev));
  };

  const handleTranslate = async () => {
    if (!data?.heading?.en || !data?.description?.en) {
      alert("Please fill English fields first");
      return;
    }

    setIsTranslating(true);
    try {
      const zh = await translateToLang("Chinese (Simplified)", data.heading.en, data.description.en);
      const si = await translateToLang("Sinhala", data.heading.en, data.description.en);

      if (zh) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                heading: { ...prev.heading, zh: zh.heading },
                description: { ...prev.description, zh: zh.description },
              }
            : prev
        );
      }

      if (si) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                heading: { ...prev.heading, si: si.heading },
                description: { ...prev.description, si: si.description },
              }
            : prev
        );
      }
    } catch (e) {
      console.error("Translation batch error:", e);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSave = async () => {
    if (!data) return;

    setIsSaving(true);
    setSaveMsg(null);

    try {
      const res = await fetch(`${baseURL}/home/update-supplier-section`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setSaveMsg("Saved successfully!");
      setIsEditing(false);
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
        // Draw the cropped image (transparent background)
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
    if (croppedImage) {
      setData((prev) => (prev ? { ...prev, imagePath: croppedImage } : prev));
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
          <h2 className="text-3xl font-bold text-gray-800">Home - Supplier Section</h2>
          <p className="mt-2 text-gray-600">Manage Supplier content in multiple languages</p>
        </div>

        {/* Preview */}
        <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-700">Current Preview (EN)</h3>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition"
            >
              {isEditing ? "Cancel" : "Edit"}
            </button>
          </div>

          <h2 className="text-2xl font-bold text-gray-800">
            {data.heading.en || "Heading not available"}
          </h2>
          <p className="text-gray-600 mt-4 leading-relaxed">
            {data.description.en || "Description not available"}
          </p>
          <img
            src={data.imagePath || "/default-image.jpg"}
            alt="Supplier Map"
            className="mt-6 rounded-lg shadow-md w-full h-80 object-cover"
          />
        </div>

        {/* Edit Modal */}
        {isEditing && (
          <div className="fixed inset-0 bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] overflow-y-auto p-6 relative">
              {/* Close Button */}
              <button
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition text-3xl font-light bg-gray-100 hover:bg-gray-200 rounded-full w-10 h-10 flex items-center justify-center"
                onClick={() => setIsEditing(false)}
              >
                ×
              </button>

              <h2 className="text-3xl font-bold mb-8 text-center text-primary border-b border-gray-200 pb-4">
                Edit Supplier Section
              </h2>

              {/* Language Columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {(["en", "zh", "si"] as const).map((lang) => (
                  <section key={lang}>
                    <h3 className="text-xl font-semibold mb-4 border-b pb-2 text-center text-primary">
                      {lang === "en" ? "English" : lang === "zh" ? "Mandarin" : "Sinhala"}
                    </h3>
                    <label className="block font-medium mb-1 text-gray-700">Heading:</label>
                    <input
                      type="text"
                      value={data.heading[lang] || ""}
                      onChange={(e) => handleInputChange(lang, "heading", e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-3 mb-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                    />
                    <label className="block font-medium mb-1 text-gray-700">Description:</label>
                    <textarea
                      value={data.description[lang] || ""}
                      onChange={(e) => handleInputChange(lang, "description", e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-3 h-40 resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                    />
                  </section>
                ))}
              </div>

              {/* Image Upload */}
              <div className="mb-10 bg-gray-50 p-6 rounded-xl">
                <h3 className="text-lg font-semibold mb-4 text-primary">Supplier Image</h3>
                <div
                  className={`relative h-64 border-3 border-dashed rounded-xl flex items-center justify-center cursor-pointer overflow-hidden transition-all duration-300 ${
                    dragging ? "border-primary bg-primary/10 scale-105" : "border-primary/30 hover:border-primary/50"
                  }`}
                  onDragEnter={() => setDragging(true)}
                  onDragOver={(e) => e.preventDefault()}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer z-30"
                    onChange={handleFileSelect}
                  />
                  <div
                    className={`absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-60 opacity-0 hover:opacity-100 transition-opacity duration-300 z-20 ${
                      dragging ? "opacity-100" : ""
                    }`}
                  >
                    <Upload className="h-12 w-12 text-white mb-2" />
                    <span className="text-white text-center font-medium">
                      Drop Here<br />
                      <span className="text-sm">or Click</span>
                    </span>
                  </div>
                  {data.imagePath ? (
                    <div className="relative w-full h-full group">
                      <img
                        src={data.imagePath}
                        alt="Supplier"
                        className="w-full h-full object-cover"
                      />
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
                      <p className="text-xs text-gray-400">Max 5MB • 16:9</p>
                    </div>
                  )}
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
                    onClick={() => setIsEditing(false)}
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

              {/* Crop Modal - 16:9 */}
              {isModalOpen && selectedImage && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-xl shadow-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
                    <h3 className="text-xl font-bold mb-4 text-center text-primary">
                      Crop Supplier Image
                    </h3>

                    {/* 16:9 Aspect Ratio Container */}
                    <div className="relative mx-auto w-full max-w-3xl" style={{ aspectRatio: '16 / 9', height: '400px' }}>
                      <div className="bg-white absolute inset-0 overflow-hidden rounded-lg border-2 border-gray-300">
                        <ReactCrop
                          crop={crop}
                          onChange={(_, percentCrop) => setCrop(percentCrop)}
                          onComplete={handleCropComplete}
                          aspect={16 / 9}
                          className="h-full w-full"
                        >
                          <img
                            src={selectedImage}
                            ref={imageRef}
                            alt="Crop preview"
                            className="h-100 w-full object-contain"
                            style={{ backgroundColor: "white", maxHeight: "100%" }}
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
        )}
      </div>
    </div>
  );
};

export default SupplierPage;
"use client";

import { useState, useRef, useCallback } from "react";
import { X, Upload, Loader2 } from "lucide-react";
import ReactCrop, { Crop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

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
{"heading":"...","description":"..."}

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

type Category = {
  id: string;
  name: {
    en: string;
    zh: string;
    si: string;
  };
  imagePath: string;
};

type ProductsData = {
  heading: {
    en: string;
    zh: string;
    si: string;
  };
  description: {
    en: string;
    zh: string;
    si: string;
  };
  categories: Category[];
};

interface EditProductsProps {
  productsData: ProductsData;
  onSave: (updatedData: ProductsData) => void;
  onCancel: () => void;
}

const EditProducts = ({ productsData, onSave, onCancel }: EditProductsProps) => {
  const [editedData, setEditedData] = useState(productsData);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Crop state
  const [selectedImage, setSelectedImage] = useState<{
    categoryId: string;
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
  const [draggingKey, setDraggingKey] = useState<string | null>(null);

  const handleInputChange = (
    lang: "en" | "zh" | "si",
    field: "heading" | "description",
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

  const handleCategoryNameChange = (
    categoryId: string,
    lang: "en" | "zh" | "si",
    value: string
  ) => {
    setEditedData((prev) => ({
      ...prev,
      categories: prev.categories.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              name: { ...cat.name, [lang]: value },
            }
          : cat
      ),
    }));
  };

  // Unified file handler
  const handleFile = (file?: File, categoryId?: string) => {
    if (file && file.type.startsWith("image/") && file.size <= 5 * 1024 * 1024 && categoryId) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setSelectedImage({ categoryId, image: result });
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
    categoryId: string
  ) => {
    const file = e.target.files?.[0];
    handleFile(file, categoryId);
  };

  const handleImageUpload = (
    event: React.DragEvent<HTMLDivElement>,
    categoryId: string
  ) => {
    event.preventDefault();
    setDraggingKey(null);
    const file = event.dataTransfer.files[0];
    handleFile(file, categoryId);
  };

  const handleRemoveImage = (categoryId: string) => {
    setEditedData((prev) => ({
      ...prev,
      categories: prev.categories.map((cat) =>
        cat.id === categoryId
          ? { ...cat, imagePath: "" }
          : cat
      ),
    }));
  };

  const handleTranslate = async () => {
    if (!editedData?.heading.en || !editedData?.description.en) {
      alert("Please fill English fields first");
      return;
    }

    setIsTranslating(true);
    try {
      const [zh, si] = await Promise.all([
        translateToLang("Chinese (Simplified)", editedData.heading.en, editedData.description.en),
        translateToLang("Sinhala", editedData.heading.en, editedData.description.en),
      ]);

      if (zh) {
        setEditedData((prev) => ({
          ...prev,
          heading: { ...prev.heading, zh: zh.heading },
          description: { ...prev.description, zh: zh.description },
        }));
      }

      if (si) {
        setEditedData((prev) => ({
          ...prev,
          heading: { ...prev.heading, si: si.heading },
          description: { ...prev.description, si: si.description },
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
    setSaveMsg(null);

    try {
      const res = await fetch(`${baseURL}/home/update-products-section`, {
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
      setEditedData((prev) => ({
        ...prev,
        categories: prev.categories.map((cat) =>
          cat.id === selectedImage.categoryId
            ? { ...cat, imagePath: croppedImage }
            : cat
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
          Edit Products Section
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
              <label className="block font-medium mb-1 text-gray-700">Description:</label>
              <textarea
                value={editedData.description[lang] || ""}
                onChange={(e) => handleInputChange(lang, "description", e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 h-32 resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
            </section>
          ))}
        </div>

        {/* Categories */}
        <div className="mb-10 bg-gray-50 p-6 rounded-xl">
          <h3 className="text-lg font-semibold mb-4 text-primary">Product Categories</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {editedData.categories.map((category) => (
              <div key={category.id} className="border border-gray-200 rounded-xl p-6 bg-white">
                {/* Image Upload */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                    Category Image
                  </label>
                  <div
                    className={`relative w-64 h-80 border-3 border-dashed rounded-xl flex items-center justify-center cursor-pointer overflow-hidden transition-all duration-300 ${
                      draggingKey === `${category.id}-cat`
                        ? "border-primary bg-primary/10 scale-105"
                        : "border-primary/30 hover:border-primary/50"
                    }`}
                    onDragEnter={() => setDraggingKey(`${category.id}-cat`)}
                    onDragOver={(e) => e.preventDefault()}
                    onDragLeave={() => setDraggingKey(null)}
                    onDrop={(e) => handleImageUpload(e, category.id)}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer z-30"
                      onChange={(e) => handleFileSelect(e, category.id)}
                    />
                    <div
                      className={`absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-60 opacity-0 hover:opacity-100 transition-opacity duration-300 z-20 ${
                        draggingKey === `${category.id}-cat` ? "opacity-100" : ""
                      }`}
                    >
                      <Upload className="h-12 w-12 text-white mb-2" />
                      <span className="text-white text-center font-medium">
                        Drop Here<br />
                        <span className="text-sm">or Click</span>
                      </span>
                    </div>
                    {category.imagePath ? (
                      <div className="relative w-full h-full group">
                        <img
                          src={category.imagePath}
                          alt={category.name.en}
                          className="w-full h-full object-"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage(category.id);
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

                {/* Category Name Inputs */}
                <div className="grid grid-cols-1 gap-4">
                  {(["en", "zh", "si"] as const).map((lang) => (
                    <div key={lang}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name ({lang.toUpperCase()})
                      </label>
                      <input
                        type="text"
                        value={category.name[lang]}
                        onChange={(e) =>
                          handleCategoryNameChange(category.id, lang, e.target.value)
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
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
              <h3 className="text-xl font-bold mb-4 text-center text-primary">
                Crop Category Image
              </h3>

              {/* 3:4 Aspect Ratio Container */}
              <div className="relative mx-auto w-full max-w-md" style={{ aspectRatio: '3 / 4', width: '300px' }}>
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

export default EditProducts;
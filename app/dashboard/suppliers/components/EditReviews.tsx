"use client";

import React, { useState, useRef, useCallback } from "react";
import { X, Upload, Loader2 } from "lucide-react";
import ReactCrop, { Crop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

type ReviewData = {
  id: string;
  supplierCompanyName: { en: string; zh?: string; si?: string };
  country: { en: string; zh?: string; si?: string };
  supplierLogoPath: string;
  message: { en: string; zh?: string; si?: string };
};

type EditReviewsProps = {
  reviewData: ReviewData;
  onSave: (updatedReview: ReviewData) => void;
  onCancel: () => void;
};

const EditReviews: React.FC<EditReviewsProps> = ({ reviewData, onSave, onCancel }) => {
  const [editedReview, setEditedReview] = useState(reviewData);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Crop state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  const [crop, setCrop] = useState<Crop>({
    unit: "%",
    width: 80,
    height: 80,
    x: 10,
    y: 10,
  });

  const handleInputChange = (
    lang: "en" | "zh" | "si",
    field: keyof ReviewData,
    value: string
  ) => {
    setEditedReview((prev) => ({
      ...prev,
      [field]: {
        ...((prev[field] as object) || {}),
        [lang]: value,
      },
    }));
  };

  // Unified file handler (same as EditDirectors)
  const handleFile = (file?: File) => {
    if (file && file.type.startsWith("image/") && file.size <= 5 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setSelectedImage(result);
        setCrop({ unit: "%", width: 80, height: 80, x: 10, y: 10 });
        setIsModalOpen(true);
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

  const handleImageUpload = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    handleFile(file);
  };

  const handleRemoveImage = () => {
    setEditedReview((prev) => ({ ...prev, supplierLogoPath: "" }));
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
        // Clip to circle
        ctx.beginPath();
        ctx.arc(
          cropParam.width / 2,
          cropParam.height / 2,
          cropParam.width / 2,
          0,
          2 * Math.PI
        );
        ctx.clip();

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
      setEditedReview((prev) => ({ ...prev, supplierLogoPath: croppedImage }));
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

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  const translateReviewToLang = async (
    targetLang: string,
    enCompanyName: string,
    enCountry: string,
    enMessage: string
  ): Promise<{
    supplierCompanyName: string;
    country: string;
    message: string;
  } | null> => {
    if (!geminiApiKey) {
      alert("Gemini API key not configured");
      return null;
    }

    const prompt = `Translate the following to ${targetLang}. Return ONLY valid JSON:
{"supplierCompanyName":"…","country":"…","message":"…"}

English:
- Supplier Company Name: ${enCompanyName}
- Country: ${enCountry}
- Message: ${enMessage}`;

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
    const {
      supplierCompanyName: { en: enCompanyName },
      country: { en: enCountry },
      message: { en: enMessage },
    } = editedReview;

    if (!enCompanyName || !enCountry || !enMessage) {
      alert("Please fill all English fields first");
      return;
    }

    setIsTranslating(true);
    try {
      const [zhReview, siReview] = await Promise.all([
        translateReviewToLang("Chinese (Simplified)", enCompanyName, enCountry, enMessage),
        translateReviewToLang("Sinhala", enCompanyName, enCountry, enMessage),
      ]);

      if (zhReview) {
        setEditedReview((prev) => ({
          ...prev,
          supplierCompanyName: { ...prev.supplierCompanyName, zh: zhReview.supplierCompanyName },
          country: { ...prev.country, zh: zhReview.country },
          message: { ...prev.message, zh: zhReview.message },
        }));
      }

      if (siReview) {
        setEditedReview((prev) => ({
          ...prev,
          supplierCompanyName: { ...prev.supplierCompanyName, si: siReview.supplierCompanyName },
          country: { ...prev.country, si: siReview.country },
          message: { ...prev.message, si: siReview.message },
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
      onSave({
        ...editedReview,
        supplierCompanyName: {
          ...editedReview.supplierCompanyName,
          zh: editedReview.supplierCompanyName.zh || "",
        },
      });
    } catch (error) {
      console.error("Error saving review:", error);
      alert(`Error: ${(error as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] overflow-y-auto p-6 relative">
        {/* Close Button */}
        {/* Close Button */}
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition text-3xl font-light bg-gray-100 hover:bg-gray-200 rounded-full w-10 h-10 flex items-center justify-center"
          onClick={onCancel}
        >
          ×
        </button>

        <h2 className="text-3xl font-bold mb-8 text-center text-primary border-b border-gray-200 pb-4">
          Edit Review
        </h2>

        {/* Logo Section */}
        <div className="flex flex-col items-center mb-10 bg-gray-50 p-6 rounded-xl">
          <label className="text-lg font-semibold mb-4 text-primary">Supplier Logo</label>
          <div
            className={`relative w-40 h-40 border-3 border-dashed rounded-full flex items-center justify-center cursor-pointer overflow-hidden transition-all duration-300 ${
              isDragging ? "border-primary bg-primary/10 scale-105" : "border-primary/30 hover:border-primary/50"
            }`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
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
                isDragging ? "opacity-100" : ""
              }`}
            >
              <Upload className="h-10 w-10 text-white mb-2" />
              <span className="text-white text-center font-medium text-sm">
                Drop Logo Here<br />
                <span className="text-xs">or Click to Browse</span>
              </span>
            </div>
            {editedReview.supplierLogoPath ? (
              <div className="relative w-full h-full group">
                <img
                  src={editedReview.supplierLogoPath}
                  alt="Logo"
                  className="w-full h-full object-cover rounded-full"
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
                <Upload className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                <p className="text-gray-500 font-medium text-sm">Click or Drag & Drop</p>
                <p className="text-xs text-gray-400">Max 5MB • JPG/PNG</p>
              </div>
            )}
          </div>
        </div>

        {/* Content in Three Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(["en", "zh", "si"] as const).map((lang) => (
            <section key={lang}>
              <h3 className="text-xl font-semibold mb-4 border-b pb-2 text-center text-primary">
                {lang === "en" ? "English" : lang === "zh" ? "Mandarin" : "Sinhala"}
              </h3>
              <label className="block font-medium mb-1 text-gray-700">Company Name:</label>
              <input
                type="text"
                value={editedReview.supplierCompanyName[lang] || ""}
                onChange={(e) => handleInputChange(lang, "supplierCompanyName", e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 mb-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
              <label className="block font-medium mb-1 text-gray-700">Country:</label>
              <input
                type="text"
                value={editedReview.country[lang] || ""}
                onChange={(e) => handleInputChange(lang, "country", e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 mb-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
              <label className="block font-medium mb-1 text-gray-700">Message:</label>
              <textarea
                value={editedReview.message[lang] || ""}
                onChange={(e) => handleInputChange(lang, "message", e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 h-40 resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
            </section>
          ))}
        </div>

        {/* Buttons */}
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

        {/* Crop Modal - Circular with Rounded Container */}
        {isModalOpen && selectedImage && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-auto">
              <h3 className="text-xl font-bold mb-4 text-center text-primary">Crop Logo (Circular)</h3>

              {/* Rounded Circular Crop Container */}
              <div className="relative mx-auto w-80 h-80 overflow-hidden border-4 border-primary/20">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={handleCropComplete}
                  circularCrop
                  keepSelection
                  className="h-full w-full"
                >
                  <img
                    src={selectedImage}
                    ref={imageRef}
                    alt="Crop preview"
                    className="h-96 w-full object-contain"
                  />
                </ReactCrop>
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

export default EditReviews;
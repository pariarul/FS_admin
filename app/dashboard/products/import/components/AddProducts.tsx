'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

/* -------------------------------------------------------------------------- */
/*                                 Interfaces                                 */
/* -------------------------------------------------------------------------- */
interface ImportCategoryItem {
  imagePath: string;
  imageName: string;
  origins: string[];
}

interface ImportCategory {
  category: string;
  items: ImportCategoryItem[];
  en: { category: string; assetName: string };
  si: { category: string; assetName: string };
  zh: { category: string; assetName: string };
}

interface ImportData {
  en: ImportCategory[];
  si: ImportCategory[];
  zh: ImportCategory[];
  categories: { [key: string]: ImportCategory };
}

interface LanguageDetails {
  categoryName: string;
  imageName: string;
  origins: string;
}

interface LanguageDetailsState {
  en: LanguageDetails;
  si: LanguageDetails;
  zh: LanguageDetails;
}

interface AddProductsModalProps {
  onClose: () => void;
  importData: ImportData | null;
  selectedAssetName?: string;
  selectedCategory?: string;
  setSelectedCategory?: (category: string) => void;
}

/* CategoryData matches the shape used in page.tsx */
interface CategoryData {
  en: { category: string; assetName: string };
  zh: { category: string; assetName: string };
  si: { category: string; assetName: string };
  items: {
    imagePath: string;
    en: { imageName: string; origins: string[] };
    zh: { imageName: string; origins: string[] };
    si: { imageName: string; origins: string[] };
  }[];
}

/* -------------------------------------------------------------------------- */
/*                              Modal Component                               */
/* -------------------------------------------------------------------------- */
const AddProductsModal: React.FC<AddProductsModalProps> = ({
  onClose,
  importData,
  selectedAssetName,
  selectedCategory: propCategory,
  setSelectedCategory: setPropCategory,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [languageDetails, setLanguageDetails] = useState<LanguageDetailsState>({
    en: { categoryName: '', imageName: '', origins: '' },
    si: { categoryName: '', imageName: '', origins: '' },
    zh: { categoryName: '', imageName: '', origins: '' },
  });
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [crop, setCrop] = useState<Crop>({ unit: '%', width: 75, height: 100, x: 12.5, y: 0 });
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

  /* ---------------------------------------------------------------------- */
  /*                     Sync prop category / assetName                     */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    if (propCategory && propCategory !== selectedCategory) {
      setSelectedCategory(propCategory);
    }
  }, [propCategory, selectedCategory]);

  /* ---------------------------------------------------------------------- */
  /*                     Update translated category names                  */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
      if (!selectedCategory || !importData || !importData.categories) return;

      const categoryKey = Object.keys(importData.categories).find(
        (key) => importData.categories[key]?.category === selectedCategory
      );
      if (!categoryKey || !importData.categories[categoryKey]) {
        console.warn('No matching category key found for:', selectedCategory);
        return;
      }

      // SAFE CAST – runtime object is CategoryData
      const categoryData = importData.categories[categoryKey] as unknown as CategoryData;
      if (!categoryData?.en || !categoryData?.si || !categoryData?.zh) {
        console.warn('Category data missing language details:', categoryData);
        return;
      }

      setLanguageDetails((prev) => ({
        ...prev,
        en: { ...prev.en, categoryName: categoryData.en.category },
        si: { ...prev.si, categoryName: categoryData.si.category },
        zh: { ...prev.zh, categoryName: categoryData.zh.category },
      }));
    }, [selectedCategory, importData]);

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setPropCategory?.(value);
  };

  const handleInputChange = (
    lang: keyof LanguageDetailsState,
    field: keyof LanguageDetails,
    value: string
  ) => {
    setLanguageDetails((prev) => ({
      ...prev,
      [lang]: { ...prev[lang], [field]: value },
    }));
  };

  /* ---------------------------------------------------------------------- */
  /*                               Image handling                           */
  /* ---------------------------------------------------------------------- */
  const handleFile = (file?: File) => {
    if (file && file.type.startsWith('image/') && file.size <= 3 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setSelectedImage(result);
        setCrop({ unit: '%', width: 75, height: 100, x: 12.5, y: 0 });
        setIsCropping(true);
      };
      reader.readAsDataURL(file);
      setSelectedFile(file);
    } else if (file) {
      alert('Image must be under 3 MB');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleCropComplete = useCallback((cropParam: PixelCrop) => {
    if (imageRef.current && cropParam.width && cropParam.height) {
      const canvas = document.createElement('canvas');
      const scaleX = imageRef.current.naturalWidth / imageRef.current.width;
      const scaleY = imageRef.current.naturalHeight / imageRef.current.height;
      canvas.width = cropParam.width;
      canvas.height = cropParam.height;
      const ctx = canvas.getContext('2d');
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
        const base64 = canvas.toDataURL('image/jpeg', 0.85);
        setCroppedImage(base64);
      }
    }
  }, []);

  const saveCroppedImage = () => {
    if (croppedImage) {
      setUploadedImage(croppedImage);
      setCroppedImage(null);
      setSelectedImage(null);
      setIsCropping(false);
    }
  };

  const cancelCrop = () => {
    setSelectedImage(null);
    setCroppedImage(null);
    setIsCropping(false);
  };

  const removeImage = () => {
    setUploadedImage(null);
    setSelectedFile(null);
    setSelectedImage(null);
    setCroppedImage(null);
  };

  /* ---------------------------------------------------------------------- */
  /*                                 Translation                             */
  /* ---------------------------------------------------------------------- */
  const translateToLang = async (
    targetLang: string,
    enName: string,
    enOrigins: string
  ) => {
    if (!apiKey) {
      alert('Gemini API key not found');
      return null;
    }

    const prompt = `Translate to ${targetLang}. Return ONLY valid JSON: {"name": "translated name", "origins": "comma-separated origins"}.

English:
- Product Name: ${enName}
- Origins: ${enOrigins}`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const jsonMatch = text?.match(/\{.*\}/s);
      if (!jsonMatch) throw new Error('No JSON found');

      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      console.error(err);
      alert(`Translation failed: ${(err as Error).message}`);
      return null;
    }
  };

  const handleTranslateBoth = async () => {
    if (!languageDetails.en.imageName.trim() || !languageDetails.en.origins.trim()) {
      alert('Fill English name and origins first');
      return;
    }

    setIsTranslating(true);
    try {
      const [siResult, zhResult] = await Promise.all([
        translateToLang('Sinhala', languageDetails.en.imageName, languageDetails.en.origins),
        translateToLang('Chinese (Simplified)', languageDetails.en.imageName, languageDetails.en.origins),
      ]);

      if (siResult) {
        setLanguageDetails((prev) => ({
          ...prev,
          si: { ...prev.si, imageName: siResult.name, origins: siResult.origins },
        }));
      }
      if (zhResult) {
        setLanguageDetails((prev) => ({
          ...prev,
          zh: { ...prev.zh, imageName: zhResult.name, origins: zhResult.origins },
        }));
      }
    } finally {
      setIsTranslating(false);
    }
  };

  /* ---------------------------------------------------------------------- */
  /*                                   Submit                               */
  /* ---------------------------------------------------------------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCategory || !uploadedImage || !languageDetails.en.imageName.trim() || !languageDetails.en.origins.trim()) {
      alert('Please fill all required fields (category, image, English name & origins).');
      return;
    }

    setIsSubmitting(true);
    try {
      // Find assetName (key) for the selected English category
      const assetNameEntry = Object.entries(importData?.categories ?? {}).find(
        ([_, cat]) => cat.category === selectedCategory
      );
      const assetName = assetNameEntry?.[0] ?? '';

      const payload = {
        assetName,
        imagePath: uploadedImage,
        en: {
          category: languageDetails.en.categoryName,
          imageName: languageDetails.en.imageName.trim(),
          origins: languageDetails.en.origins
            .split(',')
            .map((o) => o.trim())
            .filter(Boolean),
        },
        si: {
          category: languageDetails.si.categoryName,
          imageName: languageDetails.si.imageName.trim(),
          origins: languageDetails.si.origins
            .split(',')
            .map((o) => o.trim())
            .filter(Boolean),
        },
        zh: {
          category: languageDetails.zh.categoryName,
          imageName: languageDetails.zh.imageName.trim(),
          origins: languageDetails.zh.origins
            .split(',')
            .map((o) => o.trim())
            .filter(Boolean),
        },
      };

      const res = await fetch(`${baseURL}/products/add-import-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || 'Failed to add product');
      }

      alert('Product added successfully!');
      onClose();
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert(`Failed to add product: ${(err as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ---------------------------------------------------------------------- */
  /*                                   Render                               */
  /* ---------------------------------------------------------------------- */
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="p-6 overflow-y-auto flex-grow">
          <h2 className="text-2xl font-bold mb-6 text-center text-primary">Add New Product</h2>

          <form onSubmit={handleSubmit}>
            {/* ----------------------- Category & Image ----------------------- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Select a category</option>
                  {importData?.en?.map((cat) => (
                    <option key={cat.category} value={cat.category}>
                      {cat.category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Image</label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full h-48 border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer transition-all ${
                    isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                    className="hidden"
                  />
                  <div className="text-center">
                    <Upload className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                    <p className="text-sm font-medium text-gray-600">Click or Drag & Drop</p>
                    <p className="text-xs text-gray-500">Max 3 MB, JPG/PNG</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ----------------------- Image Preview ----------------------- */}
            {uploadedImage && (
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                <div className="relative w-full h-64 bg-gray-100 rounded-xl overflow-hidden group">
                  <img src={uploadedImage} alt="Preview" className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ----------------------- Language Details ----------------------- */}
            <div className="mb-8">
              <h3 className="text-lg font-bold mb-4 text-primary">Language Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(['en', 'si', 'zh'] as const).map((lang) => (
                  <div
                    key={lang}
                    className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border border-gray-200 shadow-sm"
                  >
                    <h4 className="text-lg font-bold mb-4 text-center uppercase text-primary">
                      {lang === 'en' ? 'EN' : lang === 'zh' ? '中' : 'SI'}
                    </h4>
                    <div className="space-y-3">
                      {/* Category – read-only */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <input
                          type="text"
                          value={(() => {
                            if (!selectedCategory || !importData || !importData.categories) return '';
                            const categoryKey = Object.keys(importData.categories).find(
                              (key) => importData.categories[key]?.category === selectedCategory
                            );
                            if (!categoryKey) return selectedCategory;
                            const catData = importData.categories[categoryKey];
                            if (lang === 'en') return catData.en?.category || selectedCategory;
                            if (lang === 'si') return catData.si?.category || selectedCategory;
                            if (lang === 'zh') return catData.zh?.category || selectedCategory;
                            return selectedCategory;
                          })()}
                          readOnly
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-600 cursor-not-allowed"
                        />
                      </div>

                      {/* Product Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Product Name {lang === 'en' && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="text"
                          required={lang === 'en'}
                          value={languageDetails[lang].imageName}
                          placeholder={lang === 'en' ? 'Required' : 'Optional'}
                          onChange={(e) => handleInputChange(lang, 'imageName', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                      </div>

                      {/* Origins */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Origins {lang === 'en' && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="text"
                          required={lang === 'en'}
                          value={languageDetails[lang].origins}
                          placeholder={lang === 'en' ? 'e.g. India, China' : 'Comma separated'}
                          onChange={(e) => handleInputChange(lang, 'origins', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ----------------------- Action Buttons ----------------------- */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleTranslateBoth}
                disabled={isTranslating || !languageDetails.en.imageName || !languageDetails.en.origins}
                className={`px-6 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-all ${
                  isTranslating || !languageDetails.en.imageName || !languageDetails.en.origins
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-primary text-white hover:bg-primary/90 shadow-md'
                }`}
              >
                {isTranslating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Translating...
                  </>
                ) : (
                  'Translate to Mandarin & Sinhala'
                )}
              </button>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-6 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-all ${
                    isSubmitting
                      ? 'bg-primary/70 text-white cursor-not-allowed'
                      : 'bg-primary text-white hover:bg-primary/90 shadow-md'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Product'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* ----------------------- Crop Modal (3:4) ----------------------- */}
      {isCropping && selectedImage && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full max-h-[90vh] overflow-auto">
            <h3 className="text-xl font-bold mb-4 text-center text-primary">Crop Product Image </h3>

            <div
              className="relative mx-auto w-full"
              style={{ aspectRatio: '3 / 4', height: '400px' }}
            >
              <div className="absolute inset-0 overflow-hidden rounded-lg border-4 border-primary/20">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={handleCropComplete}
                  aspect={3 / 4}
                >
                  <img
                    src={selectedImage}
                    ref={imageRef}
                    alt="Crop"
                    className="h-100 w-full object-contain"
                  />
                </ReactCrop>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={cancelCrop}
                className="px-5 py-2.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium"
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
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddProductsModal;
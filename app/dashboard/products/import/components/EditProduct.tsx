import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import ReactCrop, { Crop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

interface TranslationDetails {
  category: string;
  imageName: string;
  origins: string[];
}

interface ImportData {
  en: { category: string; items: { imagePath: string; imageName: string; origins: string[] }[] }[];
  si: { category: string; items: { imagePath: string; imageName: string; origins: string[] }[] }[];
  zh: { category: string; items: { imagePath: string; imageName: string; origins: string[] }[] }[];
  categories: {
    [key: string]: {
      category: string;
      items: { imagePath: string; imageName: string; origins: string[] }[];
      en: { category: string; assetName: string };
      si: { category: string; assetName: string };
      zh: { category: string; assetName: string };
    };
  };
}

interface EditProductModalProps {
  onClose: () => void;
  product: {
    category: string;
    assetName: string; // Required to identify category group
    imagePath: string;  // Required to identify the exact image
    imageName: string;
    origins: string[];
    translations: {
      si: TranslationDetails;
      zh: TranslationDetails;
    };
  };
  importData?: ImportData | null;
}

const EditProductModal: React.FC<EditProductModalProps> = ({ onClose, product, importData }) => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;


  const [languageDetails, setLanguageDetails] = useState({
    en: {
      category: product.category,
      imageName: product.imageName,
      origins: product.origins.join(', '),
    },
    si: {
      category: product.translations.si.category,
      imageName: product.translations.si.imageName,
      origins: product.translations.si.origins.join(', '),
    },
    zh: {
      category: product.translations.zh.category,
      imageName: product.translations.zh.imageName,
      origins: product.translations.zh.origins.join(', '),
    },
  });

  const [uploadedImage, setUploadedImage] = useState<string | null>(product.imagePath);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>({ unit: '%', width: 75, height: 100, x: 12.5, y: 0 });
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  // Translation using Gemini
  const translateToLang = async (targetLang: string, enName: string, enOrigins: string): Promise<{ name: string; origins: string } | null> => {
    if (!apiKey) {
      alert('Gemini API key not found');
      return null;
    }

    const prompt = `Translate to ${targetLang}. Return ONLY valid JSON: {"name": "translated name", "origins": "comma-separated origins"}.

English:
- Product Name: ${enName}
- Origins: ${enOrigins}`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const jsonMatch = text?.match(/\{.*\}/s);
      if (!jsonMatch) throw new Error('No JSON in response');

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Translation error:', error);
      alert(`Translation failed: ${(error as Error).message}`);
      return null;
    }
  };

  const handleTranslateBoth = async () => {
    if (!languageDetails.en.imageName.trim() || !languageDetails.en.origins.trim()) {
      alert('Please fill in English name and origins first');
      return;
    }
    setIsTranslating(true);
    try {
      const [siResult, zhResult] = await Promise.all([
        translateToLang('Sinhala', languageDetails.en.imageName, languageDetails.en.origins),
        translateToLang('Chinese (Simplified)', languageDetails.en.imageName, languageDetails.en.origins),
      ]);

      if (siResult) {
        setLanguageDetails(prev => ({
          ...prev,
          si: { ...prev.si, imageName: siResult.name, origins: siResult.origins },
        }));
      }
      if (zhResult) {
        setLanguageDetails(prev => ({
          ...prev,
          zh: { ...prev.zh, imageName: zhResult.name, origins: zhResult.origins },
        }));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsTranslating(false);
    }
  };

  // Image Handling
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
    } else if (file) {
      alert('Image must be under 3MB');
    }
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    setSelectedImage(null);
    setCroppedImage(null);
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
          0, 0, cropParam.width, cropParam.height
        );
         const base64Image = canvas.toDataURL("image/png");
        setCroppedImage(base64Image);
      }
    }
  }, []);

  const saveCroppedImage = () => {
    if (croppedImage) {
      setUploadedImage(croppedImage);
      setSelectedImage(null);
      setCroppedImage(null);
      setIsCropping(false);
    }
  };

  const cancelCrop = () => {
    setSelectedImage(null);
    setCroppedImage(null);
    setIsCropping(false);
  };

  const handleInputChange = (lang: 'en' | 'si' | 'zh', field: 'imageName' | 'origins', value: string) => {
    setLanguageDetails(prev => ({
      ...prev,
      [lang]: { ...prev[lang], [field]: value },
    }));
  };

  // Submit with full identifier
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const enName = languageDetails.en.imageName.trim();
    const enOrigins = languageDetails.en.origins.trim();
    if (!enName || !enOrigins) {
      alert('English Product Name and Origins are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        assetName: product.assetName,
        oldImagePath: product.imagePath,
        imagePath: uploadedImage && uploadedImage !== product.imagePath ? uploadedImage : product.imagePath,
        en: {
          category: product.category, // Category is fixed
          imageName: enName,
          origins: enOrigins.split(',').map(o => o.trim()).filter(Boolean),
        },
        si: {
          category: languageDetails.si.category,
          imageName: languageDetails.si.imageName.trim(),
          origins: languageDetails.si.origins.split(',').map(o => o.trim()).filter(Boolean),
        },
        zh: {
          category: languageDetails.zh.category,
          imageName: languageDetails.zh.imageName.trim(),
          origins: languageDetails.zh.origins.split(',').map(o => o.trim()).filter(Boolean),
        },
      };

      const response = await fetch(`${baseURL}/products/update-import-product`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Update failed: ${error}`);
      }

      alert('Product updated successfully!');
      onClose();
      window.location.reload();
    } catch (error) {
      console.error('Update error:', error);
      alert(`Failed to update product: ${(error as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Drag & Drop
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="p-6 overflow-y-auto flex-grow">
          <h2 className="text-2xl font-bold mb-6 text-center text-primary">Edit Product</h2>

          <form onSubmit={handleSubmit}>
            {/* Image Upload */}
            <div className="flex justify-center mb-8">
              <div
                className="relative w-72 h-96 border-3 border-dashed border-primary/30 rounded-xl flex items-center justify-center cursor-pointer overflow-hidden hover:border-primary/50 transition-all bg-gray-50"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />

                {uploadedImage ? (
                  <div className="relative group w-full h-full">
                    <img
                      src={uploadedImage}
                      alt="Product"
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage();
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <Upload className="mx-auto h-12 w-12 mb-2" />
                    <p className="text-sm font-medium">Click or Drag & Drop</p>
                    <p className="text-xs">Max 3MB • 3:4</p>
                  </div>
                )}
              </div>
            </div>

            {/* Language Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {(['en', 'si', 'zh'] as const).map((lang) => (
                <div key={lang} className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                  <h4 className="text-lg font-bold mb-4 text-center uppercase text-primary">
                    {lang === 'en' ? 'EN' : lang === 'zh' ? '中' : 'SI'}
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <input
                        type="text"
                        value={languageDetails[lang].category}
                        readOnly
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                      <input
                        type="text"
                        required={lang === 'en'}
                        value={languageDetails[lang].imageName}
                        onChange={(e) => handleInputChange(lang, 'imageName', e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                        placeholder={lang === 'en' ? 'Required' : 'Optional'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Origins</label>
                      <input
                        type="text"
                        required={lang === 'en'}
                        value={languageDetails[lang].origins}
                        onChange={(e) => handleInputChange(lang, 'origins', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
                        placeholder={lang === 'en' ? 'e.g. China, India' : 'Comma separated'}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center">
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
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Crop Modal */}
      {isCropping && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full max-h-[90vh] overflow-auto">
            <h3 className="text-xl font-bold mb-4 text-center text-primary">Crop Product Image</h3>
            <div
              className="relative mx-auto w-full"
              style={{ aspectRatio: '3 / 4', height: '400px' }}
            >
              <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-lg border-4 border-primary/20">
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

export default EditProductModal;
import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface TranslationDetails {
  category: string;
  imageName: string;
  origins: string[];
}

interface ExportData {
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

interface EditExportProductModalProps {
  onClose: () => void;
  product: {
    category: string;
    assetName: string;
    imagePath: string;
    imageName: string;
    origins: string[];
    translations: {
      si: TranslationDetails;
      zh: TranslationDetails;
    };
  };
  exportData?: ExportData | null;
}

const EditExportProductModal: React.FC<EditExportProductModalProps> = ({ onClose, product }) => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

  const [languageDetails, setLanguageDetails] = useState({
    en: { category: product.category, imageName: product.imageName, origins: product.origins.join(', ') },
    si: { category: product.translations.si.category, imageName: product.translations.si.imageName, origins: product.translations.si.origins.join(', ') },
    zh: { category: product.translations.zh.category, imageName: product.translations.zh.imageName, origins: product.translations.zh.origins.join(', ') },
  });

  const [uploadedImage, setUploadedImage] = useState<string | null>(product.imagePath);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>({ unit: '%', width: 100, height: 100, x: 0, y: 0 });
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  // --- Translation using Gemini ---
  const translateToLang = async (targetLang: string, enName: string, enOrigins: string) => {
    if (!apiKey) return null;
    const prompt = `Translate to ${targetLang}. Return ONLY valid JSON: {"name": "translated name", "origins": "comma-separated origins"}.
English:
- Product Name: ${enName}
- Origins: ${enOrigins}`;
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const jsonMatch = text?.match(/\{.*\}/s);
      if (!jsonMatch) throw new Error('No JSON in response');
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error(error);
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
      if (siResult) setLanguageDetails(prev => ({ ...prev, si: { ...prev.si, imageName: siResult.name, origins: siResult.origins } }));
      if (zhResult) setLanguageDetails(prev => ({ ...prev, zh: { ...prev.zh, imageName: zhResult.name, origins: zhResult.origins } }));
    } finally {
      setIsTranslating(false);
    }
  };

  // --- Image Cropper Handlers ---
  const handleFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setIsCropping(true);
      setCrop({ unit: '%', width: 100, height: 100, x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    setSelectedImage(null);
    setCroppedImage(null);
    setIsCropping(false);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); };

  const handleCropComplete = useCallback((c: PixelCrop) => {
    if (!imageRef.current || !c.width || !c.height) return;
    const canvas = document.createElement('canvas');
    canvas.width = c.width;
    canvas.height = c.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const scaleX = imageRef.current.naturalWidth / imageRef.current.width;
    const scaleY = imageRef.current.naturalHeight / imageRef.current.height;
    ctx.drawImage(imageRef.current, c.x * scaleX, c.y * scaleY, c.width * scaleX, c.height * scaleY, 0, 0, c.width, c.height);
    setCroppedImage(canvas.toDataURL('image/png'));
  }, []);

  const cancelCrop = () => { setSelectedImage(null); setCroppedImage(null); setIsCropping(false); };
  const saveCroppedImage = () => { if (!croppedImage) return; setUploadedImage(croppedImage); setSelectedImage(null); setCroppedImage(null); setIsCropping(false); };

  const handleInputChange = (lang: 'en' | 'si' | 'zh', field: 'imageName' | 'origins', value: string) => {
    setLanguageDetails(prev => ({ ...prev, [lang]: { ...prev[lang], [field]: value } }));
  };

  // --- Submit ---
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!languageDetails.en.imageName || !languageDetails.en.origins) { alert('English Product Name and Origins required'); return; }
    setIsSubmitting(true);
    try {
      const payload = {
        assetName: product.assetName,
        imagePath: uploadedImage || product.imagePath,
        en: { category: product.category, imageName: languageDetails.en.imageName.trim(), origins: languageDetails.en.origins.split(',').map(o => o.trim()) },
        si: { category: languageDetails.si.category, imageName: languageDetails.si.imageName.trim(), origins: languageDetails.si.origins.split(',').map(o => o.trim()) },
        zh: { category: languageDetails.zh.category, imageName: languageDetails.zh.imageName.trim(), origins: languageDetails.zh.origins.split(',').map(o => o.trim()) },
      };
      const res = await fetch(`${baseURL}/products/update-export-product`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      alert('Product updated successfully!');
      onClose();
    } catch (error) {
      console.error(error);
      alert(`Failed to update product: ${(error as Error).message}`);
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="p-6 overflow-y-auto flex-grow">
          <h2 className="text-2xl font-bold mb-6 text-center text-primary">Edit Export Product</h2>
          <form onSubmit={handleSubmit}>
            {/* Image Upload */}
            <div className="flex justify-center mb-4">
              <div className="relative w-72 h-96 border-2 border-dashed border-primary/30 rounded-xl flex items-center justify-center cursor-pointer overflow-hidden hover:border-primary/50 transition-all bg-gray-50" onDragOver={handleDragOver} onDrop={handleDrop}>
                <input type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0])} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                {isCropping && selectedImage ? (
                  <div className="relative w-full h-full">
                    <ReactCrop crop={crop} onChange={(newCrop) => setCrop(newCrop)} onComplete={handleCropComplete} aspect={3 / 4}>
                      <img ref={imageRef} src={selectedImage} alt="To Crop" className="w-full h-full object-cover" />
                    </ReactCrop>
                    <div className="flex justify-end gap-3 mt-2">
                      <button type="button" onClick={cancelCrop} className="px-5 py-2.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium">Cancel</button>
                      <button type="button" onClick={saveCroppedImage} disabled={!croppedImage} className={`px-5 py-2.5 rounded-lg font-medium transition ${croppedImage ? 'bg-primary text-white hover:bg-primary/90 shadow-md' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>Apply Crop</button>
                    </div>
                  </div>
                ) : uploadedImage ? (
                  <div className="relative w-full h-full group">
                    <img src={uploadedImage} alt="Product" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    <button type="button" onClick={handleRemoveImage} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <Upload className="mx-auto h-12 w-12 mb-2" />
                    <p className="text-sm font-medium">Click or Drag & Drop</p>
                    <p className="text-xs">Max 3MB • 3:4 ratio</p>
                  </div>
                )}
              </div>
            </div>

            {/* Language Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {(['en', 'si', 'zh'] as const).map((lang) => (
                <div key={lang} className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                  <h4 className="text-lg font-bold mb-4 text-center uppercase text-primary">{lang === 'en' ? 'EN' : lang === 'zh' ? '中' : 'SI'}</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <input type="text" value={languageDetails[lang].category} readOnly className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-600 cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                      <input type="text" required={lang==='en'} value={languageDetails[lang].imageName} onChange={(e)=>handleInputChange(lang,'imageName',e.target.value)} className="w-full border rounded-lg px-3 py-2 border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary" placeholder={lang==='en'?'Required':'Optional'} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Origins</label>
                      <input type="text" required={lang==='en'} value={languageDetails[lang].origins} onChange={(e)=>handleInputChange(lang,'origins',e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary" placeholder={lang==='en'?'e.g. China, India':'Comma separated'} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center">
              <button type="button" onClick={handleTranslateBoth} disabled={isTranslating || !languageDetails.en.imageName || !languageDetails.en.origins} className={`px-6 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-all ${isTranslating || !languageDetails.en.imageName || !languageDetails.en.origins ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-primary text-white hover:bg-primary/90 shadow-md'}`}>
                {isTranslating ? <><Loader2 className="w-5 h-5 animate-spin" /> Translating...</> : 'Translate to Mandarin & Sinhala'}
              </button>
              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="px-6 py-2.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium">Cancel</button>
                <button type="submit" disabled={isSubmitting} className={`px-6 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-all ${isSubmitting ? 'bg-primary/70 text-white cursor-not-allowed' : 'bg-primary text-white hover:bg-primary/90 shadow-md'}`}>
                  {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</> : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditExportProductModal;

'use client';

import React, { useState, useRef, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Upload, X, Loader2 } from 'lucide-react';

interface Director {
  id: string;
  name: { en: string; zh?: string; si?: string };
  title: { en: string; zh?: string; si?: string };
  description: { en: string; zh?: string; si?: string };
  imagePath: string;
}

interface EditDirectorsProps {
  data: Director;
  onSave: (updatedData: Director) => void;
  onCancel: () => void;
}

const EditDirectors: React.FC<EditDirectorsProps> = ({ data, onSave, onCancel }) => {
  const [name, setName] = useState(data.name || { en: '', zh: '', si: '' });
  const [title, setTitle] = useState(data.title || { en: '', zh: '', si: '' });
  const [description, setDescription] = useState(data.description || { en: '', zh: '', si: '' });
  const [imagePath, setImagePath] = useState(data.imagePath || '');

  const [isTranslating, setIsTranslating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const [crop, setCrop] = useState<Crop>({ unit: '%', width: 75, height: 100, x: 12.5, y: 0 });
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  const translateToLang = async (
    targetLang: string,
    enName: string,
    enTitle: string,
    enDescription: string
  ): Promise<{ name: string; title: string; description: string } | null> => {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      alert('Gemini API key not found');
      return null;
    }

    const prompt = `Translate the following content to ${targetLang}. Return ONLY valid JSON in this format: {"name": "translated name", "title": "translated title", "description": "translated description"}.

English:
- Name: ${enName}
- Title: ${enTitle}
- Description: ${enDescription}`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );

      if (!response.ok) throw new Error(`API request failed: ${response.status}`);

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('No content returned from API');

      const jsonMatch = text.match(/\{.*\}/s);
      if (!jsonMatch) throw new Error('No JSON found in response');

      return JSON.parse(jsonMatch[0]);
    } catch (err: unknown) {
      console.error(err);
      alert(`Translation failed: ${(err as Error).message}`);
      return null;
    }
  };

  const handleTranslate = async () => {
    if (!name.en || !title.en || !description.en) {
      alert('Fill English content first');
      return;
    }

    setIsTranslating(true);
    try {
      const [zhResult, siResult] = await Promise.all([
        translateToLang('Chinese (Simplified)', name.en, title.en, description.en),
        translateToLang('Sinhala', name.en, title.en, description.en)
      ]);

      if (zhResult) {
        setName((prev) => ({ ...prev, zh: zhResult.name }));
        setTitle((prev) => ({ ...prev, zh: zhResult.title }));
        setDescription((prev) => ({ ...prev, zh: zhResult.description }));
      }

      if (siResult) {
        setName((prev) => ({ ...prev, si: siResult.name }));
        setTitle((prev) => ({ ...prev, si: siResult.title }));
        setDescription((prev) => ({ ...prev, si: siResult.description }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSave = async () => {
    const updatedData: Director = {
      ...data,
      name,
      title,
      description,
      imagePath,
    };

    onSave(updatedData);
  };

  // Unified file handler
  const handleFile = (file?: File) => {
    if (file && file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setSelectedImage(result);
        setCrop({ unit: '%', width: 75, height: 100, x: 12.5, y: 0 });
        setIsModalOpen(true);
      };
      reader.readAsDataURL(file);
    } else if (file) {
      alert('Image must be under 5MB');
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
    setImagePath('');
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
         const base64Image = canvas.toDataURL("image/png");
        setCroppedImage(base64Image);
      }
    }
  }, []);

  const saveCroppedImage = () => {
    if (croppedImage) {
      setImagePath(croppedImage);
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
    setIsDragging(true);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
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

        <h2 className="text-3xl font-bold mb-8 text-center text-primary border-b border-gray-200 pb-4">Edit Director</h2>

        {/* Image Section */}
        <div className="flex flex-col items-center mb-10 bg-gray-50 p-6 rounded-xl">
          <label className="text-lg font-semibold mb-4 text-primary">Profile Image</label>
          <div
            className={`relative w-64 h-80 border-3 border-dashed rounded-xl flex items-center justify-center cursor-pointer overflow-hidden transition-all duration-300 ${
              isDragging ? 'border-primary bg-primary/10 scale-105' : 'border-primary/30 hover:border-primary/50'
            }`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDragEnd={handleDragEnd}
            onDrop={handleImageUpload}
          >
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer z-30"
              onChange={handleFileSelect}
            />
            <div className={`absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-60 opacity-0 hover:opacity-100 in-opacity-100 transition-opacity duration-300 z-20 ${isDragging ? 'opacity-100' : ''}`}>
              <Upload className="h-12 w-12 text-white mb-2" />
              <span className="text-white text-center font-medium">Drop Image Here<br/><span className="text-sm">or Click to Browse</span></span>
            </div>
            {imagePath ? (
              <div className="relative w-full h-full group">
                <img
                  src={imagePath}
                  alt="Preview"
                  className="w-full h-full object-contain"
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
                <p className="text-xs text-gray-400">Max 5MB • 3:4</p>
              </div>
            )}
          </div>
        </div>

        {/* Content in Three Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* English Section */}
          <section>
            <h3 className="text-xl font-semibold mb-4 border-b pb-2 text-center text-primary">English</h3>
            <label className="block font-medium mb-1 text-gray-700">Name:</label>
            <input
              type="text"
              value={name.en}
              onChange={(e) => setName({ ...name, en: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 mb-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
            <label className="block font-medium mb-1 text-gray-700">Title:</label>
            <input
              type="text"
              value={title.en}
              onChange={(e) => setTitle({ ...title, en: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 mb-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
            <label className="block font-medium mb-1 text-gray-700">Description:</label>
            <textarea
              value={description.en }
              onChange={(e) => setDescription({ ...description, en: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 h-40 resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </section>

          {/* Chinese Section */}
          <section>
            <h3 className="text-xl font-semibold mb-4 border-b pb-2 text-center text-primary">Mandarin</h3>
            <label className="block font-medium mb-1 text-gray-700">Name:</label>
            <input
              type="text"
              value={name.zh || ''}
              onChange={(e) => setName({ ...name, zh: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 mb-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
            <label className="block font-medium mb-1 text-gray-700">Title:</label>
            <input
              type="text"
              value={title.zh || ''}
              onChange={(e) => setTitle({ ...title, zh: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 mb-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
            <label className="block font-medium mb-1 text-gray-700">Description:</label>
            <textarea
              value={description.zh || ''}
              onChange={(e) => setDescription({ ...description, zh: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 h-40 resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </section>

          {/* Sinhala Section */}
          <section>
            <h3 className="text-xl font-semibold mb-4 border-b pb-2 text-center text-primary">Sinhala</h3>
            <label className="block font-medium mb-1 text-gray-700">Name:</label>
            <input
              type="text"
              value={name.si || ''}
              onChange={(e) => setName({ ...name, si: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 mb-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
            <label className="block font-medium mb-1 text-gray-700">Title:</label>
            <input
              type="text"
              value={title.si || ''}
              onChange={(e) => setTitle({ ...title, si: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 mb-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
            <label className="block font-medium mb-1 text-gray-700">Description:</label>
            <textarea
              value={description.si || ''}
              onChange={(e) => setDescription({ ...description, si: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 h-40 resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </section>
        </div>

        {/* Buttons */}
        <div className="mt-8 flex justify-between items-center">
          <button
            disabled={isTranslating}
            className={`px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium transition ${
              isTranslating
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
            }`}
            onClick={handleTranslate}
          >
            {isTranslating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Translating...
              </>
            ) : (
              'Translate to Sinhala & Mandarin'
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
                  ? 'bg-primary/70 cursor-not-allowed text-white'
                  : 'bg-primary text-white hover:bg-primary/90 shadow-md'
              }`}
              onClick={handleSave}
            >
              {isSaving ? (
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

        {/* Crop Modal - 3:4 Portrait with Fixed Container */}
        {isModalOpen && selectedImage && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full max-h-[90vh] overflow-auto">
              <h3 className="text-xl font-bold mb-4 text-center text-primary">Crop Profile Image (3:4)</h3>

              {/* Fixed 3:4 Container */}
              <div
                className="relative mx-auto w-full"
                style={{
                  aspectRatio: '3 / 4',
                  height: '400px',
                }}
              >
                <div className="absolute inset-0 overflow-hidden rounded-lg border-4 border-primary/20">
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={handleCropComplete}
                    aspect={3 / 4}
                    className="h-full w-full"
                  >
                    <img
                      src={selectedImage}
                      ref={imageRef}
                      alt="Crop preview"
                      className="h-100 w-full object-contain"
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

export default EditDirectors;
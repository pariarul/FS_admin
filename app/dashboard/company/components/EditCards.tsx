import React, { useState, useRef, useCallback } from 'react';
import { Upload, X } from 'lucide-react';
import ReactCrop, { Crop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

const languageMap: Record<string, string> = {
  en: 'English',
  zh: 'Mandarin',
  si: 'Sinhala',
};

interface CardLang {
  title: string;
  description: string;
}

interface Card {
  id: string;
  en: CardLang;
  zh?: CardLang;
  si?: CardLang;
  imagePath: string;
}

const EditCards = ({
  cardsData,
  onSave,
  onCancel,
}: {
  cardsData: Card[];
  onSave: (updatedData: Card[]) => void;
  onCancel: () => void;
}) => {
  const [formData, setFormData] = useState<Card[]>(cardsData);
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  const [currentCardIdx, setCurrentCardIdx] = useState<number | null>(null);
  const [crop, setCrop] = useState<Crop>({ x: 0, y: 0, width: 80, height: 80, unit: '%' });
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingCrop, setPendingCrop] = useState<{ idx: number; previousImage: string } | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleInputChange = (
    cardIdx: number,
    lang: keyof Card,
    field: keyof CardLang,
    value: string
  ) => {
    setFormData((prev) => {
      const updated = [...prev];
      updated[cardIdx] = {
        ...updated[cardIdx],
        [lang]: {
          ...(typeof updated[cardIdx][lang] === 'object' && updated[cardIdx][lang] !== null
            ? updated[cardIdx][lang]
            : {}),
          [field]: value,
        },
      };
      return updated;
    });
  };

  const translateToLang = async (
    targetLang: string,
    enTitle: string,
    enDescription: string
  ): Promise<{ title: string; description: string } | null> => {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      alert('Gemini API key not found');
      return null;
    }
    const prompt = `Translate the following content to ${targetLang}. Return ONLY valid JSON in this format: {"title": "...", "description": "..."}.

English:
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
    for (const card of formData) {
      if (!card.en?.title || !card.en?.description) {
        alert('Fill all English card titles and descriptions first');
        return;
      }
    }
    setIsTranslating(true);
    try {
      const updatedCards = await Promise.all(
        formData.map(async (card) => {
          const zhResult = await translateToLang(
            'Chinese (Simplified)',
            card.en?.title || '',
            card.en?.description || ''
          );
          const siResult = await translateToLang(
            'Sinhala',
            card.en?.title || '',
            card.en?.description || ''
          );
          return {
            ...card,
            zh: zhResult ? { ...card.zh, ...zhResult } : card.zh,
            si: siResult ? { ...card.si, ...siResult } : card.si,
          };
        })
      );
      setFormData(updatedCards);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        cards: formData.map(card => ({
          ...card,
          imagePath: card.imagePath || '', 
        })),
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/company/update-company`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to update cards');
      }

      onSave(payload.cards);
    } catch (error) {
      console.error(error);
      alert('An error occurred while saving cards.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Image upload logic ---
  const handleImageUpload = (
    cardIdx: number,
    event: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>
  ) => {
    let file: File | null = null;
    if ('dataTransfer' in event) {
      (event as React.DragEvent).preventDefault();
      file = (event as React.DragEvent).dataTransfer.files[0];
    } else {
      file = (event as React.ChangeEvent<HTMLInputElement>).target.files?.[0] || null;
    }

    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const imageDataUrl = reader.result as string;
        const previousImage = formData[cardIdx].imagePath || '';
        setPendingCrop({ idx: cardIdx, previousImage });
        setFormData((prev) => {
          const updated = [...prev];
          updated[cardIdx] = { ...updated[cardIdx], imagePath: imageDataUrl };
          return updated;
        });
        setSelectedImage(imageDataUrl);
        setCurrentCardIdx(cardIdx);
        setCrop({ x: 0, y: 0, width: 80, height: 80, unit: '%' });
        setIsModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (cardIdx: number) => {
    setFormData((prev) => {
      const updated = [...prev];
      updated[cardIdx].imagePath = '';
      return updated;
    });
  };

  const handleCropComplete = useCallback((cropParam: PixelCrop) => {
    if (typeof window !== 'undefined' && imageRef.current && cropParam.width && cropParam.height) {
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
    if (currentCardIdx !== null && croppedImage) {
      setFormData((prev) => {
        const updated = [...prev];
        updated[currentCardIdx] = { ...updated[currentCardIdx], imagePath: croppedImage };
        return updated;
      });
      setCroppedImage(null);
      setSelectedImage(null);
      setCurrentCardIdx(null);
      setPendingCrop(null);
      setIsModalOpen(false);
    }
  };

  const cancelCrop = () => {
    if (pendingCrop) {
      setFormData((prev) => {
        const updated = [...prev];
        updated[pendingCrop.idx] = { ...updated[pendingCrop.idx], imagePath: pendingCrop.previousImage };
        return updated;
      });
      setPendingCrop(null);
    }
    setSelectedImage(null);
    setCurrentCardIdx(null);
    setIsModalOpen(false);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return (
    <div className="fixed top-0 left-0 w-screen h-screen backdrop-blur bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl h-[90vh] overflow-y-auto p-6 relative">
        {/* Close Button */}
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition text-3xl font-light bg-gray-100 hover:bg-gray-200 rounded-full w-10 h-10 flex items-center justify-center"
          onClick={onCancel}
        >
          ×
        </button>

        <h2 className="text-2xl font-bold mb-6 text-center">Edit Cards Section</h2>

        <div className="space-y-10">
          {formData.map((card, cardIdx) => (
            <div key={card.id} className="border rounded-xl p-6 shadow-md bg-gray-50">
              {/* Image Upload */}
              <div className="mb-4 flex items-center gap-4">
                <div
                  className="relative w-64 h-64 border-2 border-dashed border-primary/30 rounded-lg flex items-center justify-center cursor-pointer overflow-hidden group transition-colors duration-300"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleImageUpload(cardIdx, e)}
                >
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none">
                    <Upload className="h-8 w-8 text-white mb-2" />
                    <span className="text-white text-sm text-center px-2">
                      Click here to upload an image or drag and drop
                    </span>
                  </div>

                  {/* Preview or Placeholder */}
                  {card.imagePath ? (
                    <>
                      <img
                        src={card.imagePath}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                      <button
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage(cardIdx);
                        }}
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center space-y-2 text-gray-400">
                      <Upload className="h-8 w-8" />
                      <span className="text-xs">Click or drag to upload</span>
                    </div>
                  )}

                  {/* File input */}
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => handleImageUpload(cardIdx, e)}
                  />
                </div>
              </div>

              {/* Language Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(['en', 'zh', 'si'] as Array<keyof Card>).map((lang) => {
                  const content = card[lang] as CardLang | undefined;
                  return (
                    <div key={lang} className="mb-4">
                      <h3 className="text-lg font-semibold mb-2">{languageMap[lang]}</h3>
                      <label className="block font-medium mb-1">Title:</label>
                      <input
                        type="text"
                        value={content?.title || ''}
                        onChange={(e) => handleInputChange(cardIdx, lang, 'title', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2 mb-3"
                      />
                      <label className="block font-medium mb-1">Description:</label>
                      <textarea
                        value={content?.description || ''}
                        onChange={(e) => handleInputChange(cardIdx, lang, 'description', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2 h-40 resize-none"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="mt-8 flex justify-between items-center">
          <button
            disabled={isTranslating}
            className={`px-6 py-2 rounded-lg flex items-center justify-center gap-2 ${
              isTranslating
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
            }`}
            onClick={handleTranslate}
          >
            {isTranslating ? (
              <>
                <span className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin" />
                Translating...
              </>
            ) : (
              'Translate to Sinhala and Mandarin'
            )}
          </button>

          <div className="flex gap-4">
            <button
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              disabled={isSaving}
              className={`px-6 py-2 rounded-lg flex items-center justify-center gap-2 ${
                isSaving
                  ? 'bg-primary/70 cursor-not-allowed text-white'
                  : 'bg-primary text-white hover:bg-primary/80'
              }`}
              onClick={handleSave}
            >
              {isSaving ? (
                <>
                  <span className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </div>

        {/* Image Cropper Modal - 1:1 Square */}
        {isModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Crop Card Image  </h3>

              {/* 1:1 Square Container */}
              <div className="relative mx-auto w-80 h-80 rounded-lg overflow-hidden border-4 border-primary/20">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={handleCropComplete}
                  aspect={1}
                  className="h-full w-full"
                >
                  <img
                    src={selectedImage || ''}
                    ref={imageRef}
                    alt="Crop"
                    className="h-100 w-full object-contain"
                  />
                </ReactCrop>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={saveCroppedImage}
                  disabled={!croppedImage}
                  className={`px-5 py-2 rounded-lg font-medium transition ${
                    croppedImage
                      ? 'bg-primary text-white hover:bg-primary/90 shadow-md'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {croppedImage ? 'Apply Crop' : 'Cropping...'}
                </button>
                <button
                  onClick={cancelCrop}
                  className="px-5 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditCards;
'use client';

import React, { useState, useRef, useCallback } from "react";
import ReactCrop, { Crop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Upload, X, Loader2 } from 'lucide-react';

interface Blog {
  heading: { en: string; zh?: string; si?: string };
  description: { en: string; zh?: string; si?: string };
}

interface Destination {
  name: { en: string; zh?: string; si?: string };
  title: { en: string; zh?: string; si?: string };
  imagePath: string;
  message?: { en: string; zh?: string; si?: string };
  blogs?: Blog[];
}

interface EditableDestination extends Destination {
  destinationKey: 'destination1' | 'destination2';
}

interface EditLeadershipProps {
  data: EditableDestination;
  onSave: (updatedData: Destination) => void;
  onCancel: () => void;
}

const EditLeadership: React.FC<EditLeadershipProps> = ({ data, onSave, onCancel }) => {
  // Loading states for individual field translations
  const [fieldsTranslating, setFieldsTranslating] = useState(false);

  // Translate Name only
  // Translate Name, Title, and Message together
  const handleTranslateFields = async () => {
    if (!name.en || !title.en || !message.en) {
      alert("Fill all English fields first");
      return;
    }
    setFieldsTranslating(true);
    try {
      const [zhName, siName] = await Promise.all([
        translateToLang("Chinese (Simplified)", name.en, '', []),
        translateToLang("Sinhala", name.en, '', []),
      ]);
      setName(prev => ({
        ...prev,
        zh: zhName?.name || prev.zh,
        si: siName?.name || prev.si,
      }));

      const [zhTitle, siTitle] = await Promise.all([
        translateToLang("Chinese (Simplified)", title.en, '', []),
        translateToLang("Sinhala", title.en, '', []),
      ]);
      setTitle(prev => ({
        ...prev,
        zh: zhTitle?.name || prev.zh,
        si: siTitle?.name || prev.si,
      }));

      const [zhMsg, siMsg] = await Promise.all([
        translateToLang("Chinese (Simplified)", '', message.en, []),
        translateToLang("Sinhala", '', message.en, []),
      ]);
      setMessage(prev => ({
        ...prev,
        zh: zhMsg?.message || prev.zh,
        si: siMsg?.message || prev.si,
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setFieldsTranslating(false);
    }
  };
  const [name, setName] = useState({
    en: data.name.en,
    zh: data.name.zh || '',
    si: data.name.si || '',
  });
  const [title, setTitle] = useState({
    en: data.title.en,
    zh: data.title.zh || '',
    si: data.title.si || '',
  });
  const [imagePath, setImagePath] = useState(data.imagePath);
  const [message, setMessage] = useState(
    data.message ? {
      en: data.message.en || '',
      zh: data.message.zh || '',
      si: data.message.si || '',
    } : { en: '', zh: '', si: '' }
  );
  const [blogs, setBlogs] = useState(
    data.blogs?.map(blog => ({
      heading: {
        en: blog.heading.en,
        zh: blog.heading.zh || '',
        si: blog.heading.si || '',
      },
      description: {
        en: blog.description.en,
        zh: blog.description.zh || '',
        si: blog.description.si || '',
      },
    })) || []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [blogTranslating, setBlogTranslating] = useState<boolean[]>(blogs.map(() => false));

  const [isDragging, setIsDragging] = useState(false);

  // Fixed: Initial crop must be 3:4 in percentage
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 75,        // 60% width
    height: 100,       // 80% height → 60:80 = 3:4
    x: 20,
    y: 10,
  });
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  const [activeLang, setActiveLang] = useState<'en' | 'zh' | 'si'>('en');

  const handleBlogChange = (
    index: number,
    field: "heading" | "description",
    lang: "en" | "zh" | "si",
    value: string
  ) => {
    const updatedBlogs = [...blogs];
    updatedBlogs[index][field][lang] = value;
    setBlogs(updatedBlogs);
    // Ensure blogTranslating array stays in sync
    setBlogTranslating(prev => {
      if (updatedBlogs.length !== prev.length) {
        return updatedBlogs.map(() => false);
      }
      return prev;
    });
  };

  // Translate a single blog section
  const handleTranslateBlogSection = async (index: number) => {
    const blog = blogs[index];
    if (!blog.heading.en || !blog.description.en) {
      alert("Fill English heading and description first");
      return;
    }
    setBlogTranslating(prev => prev.map((v, i) => i === index ? true : v));
    try {
      const [zhResult, siResult] = await Promise.all([
        translateToLang(
          "Chinese (Simplified)",
          blog.heading.en,
          blog.description.en,
          []
        ),
        translateToLang(
          "Sinhala",
          blog.heading.en,
          blog.description.en,
          []
        ),
      ]);

      setBlogs(prev => prev.map((b, i) => {
        if (i !== index) return b;
        return {
          ...b,
          heading: {
            ...b.heading,
            zh: zhResult?.name || b.heading.zh,
            si: siResult?.name || b.heading.si,
          },
          description: {
            ...b.description,
            zh: zhResult?.message || b.description.zh,
            si: siResult?.message || b.description.si,
          },
        };
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setBlogTranslating(prev => prev.map((v, i) => i === index ? false : v));
    }
  };

  const handleAddBlog = () => {
    setBlogs([
      ...blogs,
      { heading: { en: "", zh: "", si: "" }, description: { en: "", zh: "", si: "" } },
    ]);
    setBlogTranslating(prev => [...prev, false]);
  };

  const handleRemoveBlog = (index: number) => {
    setBlogs(blogs.filter((_, i) => i !== index));
    setBlogTranslating(blogTranslating.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setIsLoading(true);
    const updatedData: Destination = {
      name: {
        en: name.en,
        zh: name.zh || '',
        si: name.si || '',
      },
      title: {
        en: title.en,
        zh: title.zh || '',
        si: title.si || '',
      },
      imagePath,
      message: message ? {
        en: message.en,
        zh: message.zh || '',
        si: message.si || '',
      } : undefined,
      blogs: blogs.map(blog => ({
        heading: {
          en: blog.heading.en,
          zh: blog.heading.zh || '',
          si: blog.heading.si || '',
        },
        description: {
          en: blog.description.en,
          zh: blog.description.zh || '',
          si: blog.description.si || '',
        },
      })),
    };

    const payload = {
      destination: (data as EditableDestination).destinationKey,
      ...updatedData,
    };

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/leadership/update-leadership`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to update leadership data');
      }

      onSave(updatedData);
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert('An error occurred while updating leadership data.');
    } finally {
      setIsLoading(false);
    }
  };

  // Unified file handler
  const handleFile = (file?: File) => {
    if (file && file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setSelectedImage(result);
        // Reset crop to 3:4 centered
        setCrop({
          unit: '%',
          width: 60,
          height: 80,
          x: 20,
          y: 10,
        });
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

  const handleImageUpload = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
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
          0, 0, cropParam.width, cropParam.height
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

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const translateToLang = async (
    targetLang: string,
    enName: string,
    enMessage: string,
    enBlogs: { heading: string; description: string }[]
  ): Promise<{ name: string; message: string; blogs: { heading: string; description: string }[] } | null> => {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      alert("Gemini API key not found");
      return null;
    }

    const prompt = `Translate the following content to ${targetLang}. Return ONLY valid JSON in this format: {"name": "translated name", "message": "translated message", "blogs": [{"heading": "translated heading", "description": "translated description"}]}.\n\nEnglish:\n- Name: ${enName}\n- Message: ${enMessage}\n- Blogs: ${JSON.stringify(enBlogs)}`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );

      if (!response.ok) throw new Error(`API request failed: ${response.status}`);

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("No content returned from API");

      const jsonMatch = text.match(/\{.*\}/s);
      if (!jsonMatch) throw new Error("No JSON found in response");

      return JSON.parse(jsonMatch[0]);
    } catch (err: unknown) {
      console.error(err);
      alert(`Translation failed: ${(err as Error).message}`);
      return null;
    }
  };

  const handleTranslateBoth = async () => {
    if (!name.en || !message.en || blogs.length === 0) {
      alert("Fill English content first");
      return;
    }
    setIsTranslating(true);
    try {
      const [zhResult, siResult] = await Promise.all([
        translateToLang("Chinese (Simplified)", name.en, message.en, blogs.map(blog => ({ heading: blog.heading.en, description: blog.description.en }))),
        translateToLang("Sinhala", name.en, message.en, blogs.map(blog => ({ heading: blog.heading.en, description: blog.description.en })))
      ]);

      if (zhResult) {
        setName(prev => ({ ...prev, zh: zhResult.name }));
        setMessage(prev => ({ ...prev, zh: zhResult.message }));
        setBlogs(prev => prev.map((blog, i) => ({
          ...blog,
          heading: { ...blog.heading, zh: zhResult.blogs[i].heading },
          description: { ...blog.description, zh: zhResult.blogs[i].description },
        })));
      }

      if (siResult) {
        setName(prev => ({ ...prev, si: siResult.name }));
        setMessage(prev => ({ ...prev, si: siResult.message }));
        setBlogs(prev => prev.map((blog, i) => ({
          ...blog,
          heading: { ...blog.heading, si: siResult.blogs[i].heading },
          description: { ...blog.description, si: siResult.blogs[i].description },
        })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleLangSwitch = (lang: 'en' | 'zh' | 'si') => {
    setActiveLang(lang);
  };

  return (
    <div className="fixed inset-0 bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[92vh] overflow-y-auto p-8 relative">
        {/* Close Button */}
        <button
          className="absolute top-6 right-6 text-gray-500 hover:text-gray-800 transition-colors duration-200 bg-gray-100 hover:bg-gray-200 rounded-full p-2 w-10 h-10 flex items-center justify-center"
          onClick={onCancel}
        >
          ×
        </button>

        <h2 className="text-3xl font-bold mb-8 text-center text-primary border-b border-gray-200 pb-4">Edit Leadership</h2>

        {/* Image Section */}
        <div className="flex flex-col items-center mb-10 bg-gray-50 p-6 rounded-lg">
          <label className="text-lg font-semibold mb-4 text-primary">Profile Image</label>
          <div
            className={`relative w-72 h-96 border-3 border-dashed rounded-xl flex items-center justify-center cursor-pointer overflow-hidden transition-all duration-300 ${
              isDragging ? 'border-primary bg-primary/10 scale-105' : 'border-primary/30 hover:border-primary/50'
            }`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDragEnd={handleDragEnd}
            onDrop={handleImageUpload}
          >
            <input
              id="leadershipImageInput"
              type="file"
              accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer z-30"
              onChange={handleFileSelect}
            />
            <div className={`absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-60 opacity-0 hover:opacity-100 transition-opacity duration-300 z-20 ${isDragging ? 'opacity-100' : ''}`}>
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
                <p className="text-xs text-gray-400">Max 5MB • JPG/PNG</p>
              </div>
            )}
          </div>
        </div>

        {/* Language Switcher */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            className={`px-4 py-2 rounded-lg font-medium transition ${activeLang === 'en' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => handleLangSwitch('en')}
          >
            English
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium transition ${activeLang === 'zh' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => handleLangSwitch('zh')}
          >
            Mandarin
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium transition ${activeLang === 'si' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => handleLangSwitch('si')}
          >
            Sinhala
          </button>
        </div>

        {/* English Content */}
        {activeLang === 'en' && (
          <section className="mb-8">
            <h3 className="text-xl font-semibold mb-4 border-b pb-2 text-primary">English Content</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={name.en}
                  onChange={(e) => setName({ ...name, en: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={title.en}
                  readOnly
                  className="w-full border border-gray-200 rounded-lg p-3 bg-gray-50 cursor-not-allowed text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
                <textarea
                  value={message.en}
                  onChange={(e) => setMessage({ ...message, en: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-3 min-h-[120px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                />
              </div>
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleTranslateFields}
                  disabled={isLoading || fieldsTranslating}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                    isLoading || fieldsTranslating
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-primary text-white hover:bg-primary/90'
                  }`}
                  style={{ marginLeft: 'auto' }}
                >
                  {fieldsTranslating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Translating...
                    </>
                  ) : (
                    'Translate to Mandarin & Sinhala'
                  )}
                </button>
              </div>
            </div>

            <div className="mt-8">
              <h4 className="text-lg font-semibold text-primary mb-4">Blogs</h4>
              <div className="space-y-6">
                {blogs.map((blog, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-6 relative">
                    <div className="absolute right-4 top-4 flex gap-2">
                      <button
                        onClick={() => handleRemoveBlog(i)}
                        className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded-full transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Blog {i + 1} Heading
                        </label>
                        <input
                          type="text"
                          value={blog.heading.en}
                          onChange={(e) => handleBlogChange(i, "heading", "en", e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Blog {i + 1} Description
                        </label>
                        <textarea
                          value={blog.description.en}
                          onChange={(e) => handleBlogChange(i, "description", "en", e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-3 min-h-[100px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                        />
                      </div>
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={() => handleTranslateBlogSection(i)}
                          disabled={isLoading || blogTranslating[i]}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                            isLoading || blogTranslating[i]
                              ? 'bg-gray-400 text-white cursor-not-allowed'
                              : 'bg-primary text-white hover:bg-primary/90'
                          }`}
                          style={{ marginLeft: 'auto' }}
                        >
                          {blogTranslating[i] ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Translating...
                            </>
                          ) : (
                            'Translate to Mandarin & Sinhala'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center gap-4 justify-between">
                <button
                  onClick={handleAddBlog}
                  className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 flex items-center gap-2 font-medium transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Add Blog
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Mandarin & Sinhala Sections (unchanged) */}
        {activeLang === 'zh' && (
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-1 bg-primary rounded-full"></div>
              <h3 className="text-xl font-semibold text-primary">Mandarin Content</h3>
            </div>
            <div className="space-y-4 bg-gray-50 p-6 rounded-lg">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={name.zh}
                  onChange={(e) => setName({ ...name, zh: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={title.zh}
                  readOnly
                  className="w-full border border-gray-200 rounded-lg p-3 bg-gray-50 cursor-not-allowed text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
                <textarea
                  value={message.zh}
                  onChange={(e) => setMessage({ ...message, zh: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-3 min-h-[120px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>
            </div>
            <div className="mt-8">
              <h4 className="text-lg font-semibold text-primary mb-4">Blogs</h4>
              <div className="space-y-6">
                {blogs.map((blog, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Blog {i + 1} Heading
                        </label>
                        <input
                          type="text"
                          value={blog.heading.zh}
                          onChange={(e) => handleBlogChange(i, "heading", "zh", e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Blog {i + 1} Description
                        </label>
                        <textarea
                          value={blog.description.zh}
                          onChange={(e) => handleBlogChange(i, "description", "zh", e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-3 min-h-[100px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeLang === 'si' && (
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-1 bg-primary rounded-full"></div>
              <h3 className="text-xl font-semibold text-primary">Sinhala Content</h3>
            </div>
            <div className="space-y-4 bg-gray-50 p-6 rounded-lg">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={name.si}
                  onChange={(e) => setName({ ...name, si: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={title.si}
                  readOnly
                  className="w-full border border-gray-200 rounded-lg p-3 bg-gray-50 cursor-not-allowed text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
                <textarea
                  value={message.si}
                  onChange={(e) => setMessage({ ...message, si: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-3 min-h-[120px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>
            </div>
            <div className="mt-8">
              <h4 className="text-lg font-semibold text-primary mb-4">Blogs</h4>
              <div className="space-y-6">
                {blogs.map((blog, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Blog {i + 1} Heading
                        </label>
                        <input
                          type="text"
                          value={blog.heading.si}
                          onChange={(e) => handleBlogChange(i, "heading", "si", e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Blog {i + 1} Description
                        </label>
                        <textarea
                          value={blog.description.si}
                          onChange={(e) => handleBlogChange(i, "description", "si", e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-3 min-h-[100px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end gap-4">
          <button
            onClick={handleSave}
            disabled={isLoading}
            className={`px-6 py-2.5 rounded-lg flex items-center gap-2 font-medium transition ${
              isLoading ? 'bg-primary/70 text-white cursor-not-allowed' : 'bg-primary text-white hover:bg-primary/90 shadow-md'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
          <button
            onClick={onCancel}
            className="bg-gray-300 text-gray-700 px-6 py-2.5 rounded-lg hover:bg-gray-400 font-medium"
            disabled={isLoading}
          >
            Cancel
          </button>
        </div>

        {/* Crop Modal - Fixed with 3:4 container */}
        {isModalOpen && selectedImage && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
              <h3 className="text-xl font-bold mb-4 text-center text-primary">Crop Leadership Image</h3>

              {/* 3:4 Aspect Ratio Container */}
              <div className="relative mx-auto w-full max-w-md" style={{ aspectRatio: '3 / 4', height: '400px' }}>
                <div className="absolute inset-0 overflow-hidden rounded-lg border-2 border-gray-300">
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

export default EditLeadership;
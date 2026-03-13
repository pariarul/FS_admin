import React, { useState, useRef } from 'react';

export interface AboutData {
    en?: {
        heading?: string;
        title?: string;
        description?: string;
    };
    zh?: {
        heading?: string;
        title?: string;
        description?: string;
    };
    si?: {
        heading?: string;
        title?: string;
        description?: string;
    };
    videoPath?: string;
}

const EditAbout = ({ aboutData, onSave, onCancel }: { aboutData: AboutData; onSave: (updatedData: AboutData) => void; onCancel: () => void }) => {
    const [formData, setFormData] = useState<AboutData>(aboutData);
    const [videoPreview, setVideoPreview] = useState('');
    const [isTranslating, setIsTranslating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleInputChange = (lang: keyof AboutData, field: string, value: string) => {
        setFormData((prev) => ({
            ...prev,
            [lang]: {
                ...(typeof prev[lang] === 'object' && prev[lang] !== null ? prev[lang] : {}),
                [field]: value,
            },
        }));
    };

    const translateToLang = async (
        targetLang: string,
        enHeading: string,
        enTitle: string,
        enDescription: string
    ): Promise<{ heading: string; title: string; description: string } | null> => {
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) {
            alert('Gemini API key not found');
            return null;
        }

        const prompt = `Translate the following content to ${targetLang}. Return ONLY valid JSON in this format: {"heading": "translated heading", "title": "translated title", "description": "translated description"}.

English:
- Heading: ${enHeading}
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
        if (!formData.en?.heading || !formData.en?.title || !formData.en?.description) {
            alert('Fill English content first');
            return;
        }

        setIsTranslating(true);
        try {
            const zhResult = await translateToLang('Chinese (Simplified)', formData.en.heading, formData.en.title, formData.en.description);
            if (zhResult) {
                setFormData((prev) => ({
                    ...prev,
                    zh: {
                        heading: zhResult.heading,
                        title: zhResult.title,
                        description: zhResult.description,
                    },
                }));
            }

            const siResult = await translateToLang('Sinhala', formData.en.heading, formData.en.title, formData.en.description);
            if (siResult) {
                setFormData((prev) => ({
                    ...prev,
                    si: {
                        heading: siResult.heading,
                        title: siResult.title,
                        description: siResult.description,
                    },
                }));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsTranslating(false);
        }
    };

    const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
        let file: File | null = null;

        if ('dataTransfer' in event) {
            event.preventDefault();
            file = event.dataTransfer.files[0];
        } else {
            file = event.target.files?.[0] || null;
        }

        if (file) {
            if (file.size > 50 * 1024 * 1024) {
                alert('File size exceeds the maximum limit of 50MB.');
                return;
            }

            if (file.type.startsWith('video/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const base64 = e.target?.result as string;
                    setVideoPreview(base64);
                    setFormData((prev) => ({
                        ...prev,
                        videoPath: base64,
                    }));
                };
                reader.readAsDataURL(file);
            }
        }
    };

    const handleRemoveVideo = () => {
        setVideoPreview('');
        setFormData((prev) => ({
            ...prev,
            videoPath: '',
        }));
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Prepare payload
            const payload = {
                about: {
                    en: {
                        heading: formData.en?.heading || '',
                        title: formData.en?.title || '',
                        description: formData.en?.description || '',
                    },
                    zh: {
                        heading: formData.zh?.heading || '',
                        title: formData.zh?.title || '',
                        description: formData.zh?.description || '',
                    },
                    si: {
                        heading: formData.si?.heading || '',
                        title: formData.si?.title || '',
                        description: formData.si?.description || '',
                    },
                },
                videoSection: {
                    path: formData.videoPath || '',
                },
            };

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/company/update-about`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error('Failed to update about section');
            }

            onSave(payload.about); // Update parent state
        } catch (error) {
            console.error(error);
            alert('An error occurred while saving data.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed top-0 left-0 w-screen h-screen backdrop-blur bg-opacity-50 flex items-center justify-center z-[100]">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl h-[90vh] overflow-y-auto p-6 relative">
                {/* Close Button */}
                <button
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl"
                    onClick={onCancel}
                >
                    &times;
                </button>

                <h2 className="text-2xl font-bold mb-6 text-center">Edit About Section</h2>

                {/* Hidden File Input */}
                <input
                    id="video-upload"
                    type="file"
                    accept="video/*"
                    ref={fileInputRef}
                    onChange={handleVideoUpload}
                    style={{ display: 'none' }}
                />

                {/* Video Section */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    {/* Old Video */}
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Existing Video</h3>
                        {aboutData.videoPath ? (
                            <video controls className="w-full h-80 rounded-lg object-cover">
                                <source src={aboutData.videoPath} type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                        ) : (
                            <div className="w-full h-64 bg-gray-100 flex items-center justify-center text-gray-400 rounded-lg">
                                No existing video
                            </div>
                        )}
                    </div>

                    {/* New Video Preview */}
                    <div>
                        <h3 className="text-lg font-semibold mb-2">New Video Preview</h3>
                        <label
                            htmlFor="video-upload"
                            className="group relative w-full h-80 bg-gray-100 flex items-center justify-center text-gray-400 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors"
                        >
                            {videoPreview ? (
                                <>
                                    <video
                                        className="w-full h-80 rounded-lg object-cover cursor-pointer"
                                        onClick={() => fileInputRef.current?.click()}
                                        controls={true}
                                    >
                                        <source src={videoPreview} type="video/mp4" />
                                        Your browser does not support the video tag.
                                    </video>
                                    <button
                                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveVideo();
                                        }}
                                    >
                                        &times;
                                    </button>
                                </>
                            ) : (
                                <span>Click to upload new video</span>
                            )}
                        </label>
                    </div>
                </div>

                {/* Content in Three Columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* English Section */}
                    <section>
                        <h3 className="text-xl font-semibold mb-4 border-b pb-2 text-center">English</h3>
                        <label className="block font-medium mb-1">Heading:</label>
                        <input
                            type="text"
                            value={formData.en?.heading || ''}
                            onChange={(e) => handleInputChange('en', 'heading', e.target.value)}
                            className="w-full text-sm border border-gray-300 rounded-lg p-2 mb-3"
                        />
                        <label className="block font-medium mb-1">Title:</label>
                        <input
                            type="text"
                            value={formData.en?.title || ''}
                            onChange={(e) => handleInputChange('en', 'title', e.target.value)}
                            className="w-full text-sm border border-gray-300 rounded-lg p-2 mb-3"
                        />
                        <label className="block font-medium mb-1">Description:</label>
                        <textarea
                            value={formData.en?.description || ''}
                            onChange={(e) => handleInputChange('en', 'description', e.target.value)}
                            className="w-full text-sm border border-gray-300 rounded-lg p-2 h-40 resize-none"
                        />
                    </section>

                    {/* Mandarin Section */}
                    <section>
                        <h3 className="text-xl font-semibold mb-4 border-b pb-2 text-center">Mandarin</h3>
                        <label className="block font-medium mb-1">Heading:</label>
                        <input
                            type="text"
                            value={formData.zh?.heading || ''}
                            onChange={(e) => handleInputChange('zh', 'heading', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2 mb-3"
                        />
                        <label className="block font-medium mb-1">Title:</label>
                        <input
                            type="text"
                            value={formData.zh?.title || ''}
                            onChange={(e) => handleInputChange('zh', 'title', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2 mb-3"
                        />
                        <label className="block font-medium mb-1">Description:</label>
                        <textarea
                            value={formData.zh?.description || ''}
                            onChange={(e) => handleInputChange('zh', 'description', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2 h-40 resize-none"
                        />
                    </section>

                    {/* Sinhala Section */}
                    <section>
                        <h3 className="text-xl font-semibold mb-4 border-b pb-2 text-center">Sinhala</h3>
                        <label className="block font-medium mb-1">Heading:</label>
                        <input
                            type="text"
                            value={formData.si?.heading || ''}
                            onChange={(e) => handleInputChange('si', 'heading', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2 mb-3"
                        />
                        <label className="block font-medium mb-1">Title:</label>
                        <input
                            type="text"
                            value={formData.si?.title || ''}
                            onChange={(e) => handleInputChange('si', 'title', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2 mb-3"
                        />
                        <label className="block font-medium mb-1">Description:</label>
                        <textarea
                            value={formData.si?.description || ''}
                            onChange={(e) => handleInputChange('si', 'description', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2 h-40 resize-none"
                        />
                    </section>
                </div>

                {/* Buttons */}
                <div className="mt-8 flex justify-between items-center">
                    <button
                        disabled={isTranslating}
                        className={`px-6 py-2 rounded-lg flex items-center justify-center gap-2 ${isTranslating
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
                            className={`px-6 py-2 rounded-lg flex items-center justify-center gap-2 ${isSaving
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
            </div>
        </div>
    );
};

export default EditAbout;

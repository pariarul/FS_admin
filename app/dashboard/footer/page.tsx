'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import LoadingAnimation from '../components/loading-animation';
import { useRouter } from 'next/navigation';
import { Loader2, Upload } from 'lucide-react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface FooterData {
  footer: {
    logoPath?: string;
    companyName: Record<string, string>;
    companyAddress: Record<string, string>;
    links?: {
      side4?: {
        phone?: string;
        email?: string;
        heading?: Record<string, string>;
        whatsappHref?: string; // Added WhatsApp link
        emailHref?: string;    // Added email link
        facebookHref?: string; // Added Facebook link
        wechatHref?: string;   // Added WeChat link
      };
    };
  };
}

const translateToLang = async (
  targetLang: string,
  enText: string
): Promise<string | null> => {
  if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
    alert('Gemini API key not configured');
    return null;
  }

  const prompt = `Translate the following to ${targetLang}. Return ONLY valid JSON:
{"text":"..."}

English:
- Text: ${enText}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    if (!res.ok) throw new Error(`Gemini ${res.status}`);

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response from Gemini');

    const jsonMatch = text.match(/\{.*\}/s);
    if (!jsonMatch) throw new Error('No JSON found in response');

    return JSON.parse(jsonMatch[0]).text;
  } catch (e) {
    console.error('Translation error:', e);
    alert(`Translation failed: ${(e as Error).message}`);
    return null;
  }
};

const FooterPage = () => {
  const [footerData, setFooterData] = useState<FooterData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    logoPath: footerData?.footer?.logoPath || '',
    companyName: footerData?.footer?.companyName || { en: '', zh: '', si: '' },
    companyAddress: footerData?.footer?.companyAddress || { en: '', zh: '', si: '' },
    phone: footerData?.footer?.links?.side4?.phone || '',
    email: footerData?.footer?.links?.side4?.email || '',
    whatsappHref: footerData?.footer?.links?.side4?.whatsappHref || '',
    emailHref: footerData?.footer?.links?.side4?.emailHref || '',
    facebookHref: footerData?.footer?.links?.side4?.facebookHref || '',
    wechatHref: footerData?.footer?.links?.side4?.wechatHref || '',
  });
  const [selectedLogo, setSelectedLogo] = useState<string | null>(null);
  const [croppedLogo, setCroppedLogo] = useState<string | null>(null);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const logoRef = useRef<HTMLImageElement>(null);
  const [logoCrop, setLogoCrop] = useState<Crop>({
    unit: '%',
    width: 50,
    height: 50,
    x: 25,
    y: 25,
  });
  const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;
  const router = useRouter();
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    const fetchFooter = async () => {
      try {
        const response = await fetch(`${baseURL}/footer/get-footer`);
        if (!response.ok) throw new Error('Failed to fetch footer data');
        const data = await response.json();
        setFooterData(data);
      } catch (error) {
        console.error('Error fetching footer data:', error);
      }
    };

    if (baseURL) fetchFooter();
  }, [baseURL]);

  useEffect(() => {
    if (footerData) {
      setFormData({
        logoPath: footerData.footer?.logoPath || '',
        companyName: footerData.footer?.companyName || { en: '', zh: '', si: '' },
        companyAddress: footerData.footer?.companyAddress || { en: '', zh: '', si: '' },
        phone: footerData.footer?.links?.side4?.phone || '',
        email: footerData.footer?.links?.side4?.email || '',
        whatsappHref: footerData.footer?.links?.side4?.whatsappHref || '',
        emailHref: footerData.footer?.links?.side4?.emailHref || '',
        facebookHref: footerData.footer?.links?.side4?.facebookHref || '',
        wechatHref: footerData.footer?.links?.side4?.wechatHref || '',
      });
    }
  }, [footerData]);

  const handleInputChange = (
    lang: 'en' | 'zh' | 'si' | null,
    field: keyof typeof formData,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: typeof prev[field] === 'object' && lang ? { ...prev[field], [lang]: value } : value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMsg(null);

    try {
      const res = await fetch(`${baseURL}/footer/update-footer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setSaveMsg('Saved successfully!');
      setIsEditing(false);
      router.refresh();
    } catch (err) {
      setSaveMsg(`Save failed: ${(err as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoFile = (file?: File) => {
    if (file && file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setSelectedLogo(result);
        setLogoCrop({
          unit: '%',
          width: 50,
          height: 50,
          x: 25,
          y: 25,
        });
        setIsLogoModalOpen(true);
      };
      reader.readAsDataURL(file);
    } else if (file) {
      alert('Image must be under 5MB');
    }
  };

  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    handleLogoFile(file);
  };

  const handleLogoCropComplete = useCallback((cropParam: PixelCrop) => {
    if (logoRef.current && cropParam.width && cropParam.height) {
      const canvas = document.createElement('canvas');
      const scaleX = logoRef.current.naturalWidth / logoRef.current.width;
      const scaleY = logoRef.current.naturalHeight / logoRef.current.height;
      canvas.width = cropParam.width;
      canvas.height = cropParam.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {

        // Draw the cropped image on top of the white background
        ctx.drawImage(
          logoRef.current,
          cropParam.x * scaleX,
          cropParam.y * scaleY,
          cropParam.width * scaleX,
          cropParam.height * scaleY,
          0,
          0,
          cropParam.width,
          cropParam.height
        );
        const base64Logo = canvas.toDataURL('image/jpeg', 0.85);
        setCroppedLogo(base64Logo);
      }
    }
  }, []);

  const saveCroppedLogo = () => {
    if (croppedLogo) {
      setFormData((prev) => ({ ...prev, logoPath: croppedLogo }));
      setCroppedLogo(null);
      setSelectedLogo(null);
      setIsLogoModalOpen(false);
    }
  };

  const cancelLogoCrop = () => {
    setSelectedLogo(null);
    setCroppedLogo(null);
    setIsLogoModalOpen(false);
  };

  const handleTranslate = async () => {
    setIsTranslating(true);
    try {
      const zhName = await translateToLang('Chinese (Simplified)', formData.companyName.en);
      const siName = await translateToLang('Sinhala', formData.companyName.en);

      const zhAddress = await translateToLang('Chinese (Simplified)', formData.companyAddress.en);
      const siAddress = await translateToLang('Sinhala', formData.companyAddress.en);

      if (zhName && siName && zhAddress && siAddress) {
        setFormData((prev) => ({
          ...prev,
          companyName: { ...prev.companyName, zh: zhName, si: siName },
          companyAddress: { ...prev.companyAddress, zh: zhAddress, si: siAddress },
        }));
      }
    } catch (e) {
      console.error('Translation batch error:', e);
    } finally {
      setIsTranslating(false);
    }
  };

  if (!footerData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <LoadingAnimation />
        <p className="mt-4 text-gray-600"></p>
      </div>
    );
  }

  const footer = footerData?.footer;

  return (
    <div className="flex bg-gradient-to-br from-gray-50 via-white to-gray-100 min-h-screen">
      <div className="fixed w-64 h-screen shadow-xl">
        <Sidebar />
      </div>

      <div className="flex-1 ml-64 p-12 space-y-12">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
              Footer Management
            </h1>
            <p className="text-gray-600">View your current multilingual footer content</p>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition"
          >
            Edit
          </button>
        </div>

        <div className="bg-white/90 backdrop-blur-md border border-gray-200/50 rounded-3xl shadow-xl p-10">
          <div className="flex items-center gap-6 mb-8">
            {footer?.logoPath ? (
              <img
                src={footer.logoPath}
                alt="Company Logo"
                className="w-64 h-64 object-contain rounded-xl shadow-md border border-gray-200"
              />
            ) : (
              <div className="w-64 h-64 bg-gray-200 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center">
                <span className="text-gray-500">No Logo</span>
              </div>
            )}
            <div>
              <h3 className="text-2xl font-bold text-primary">
                {footer?.companyName?.en || 'Company Name (EN)'}
              </h3>
              <p className="text-gray-600 leading-relaxed text-base">
                {footer?.companyAddress?.en || 'Company Address (EN)'}
              </p>
            </div>
          </div>

          {footer?.links?.side4?.heading && (
             <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-700 mb-2">
                {footer.links.side4.heading.en}
              </h4>
              {footer.links.side4.phone && <li>Phone: {footer.links.side4.phone}</li>}
                {footer.links.side4.email && <li>Email: {footer.links.side4.email}</li>}
              <ul className="flex space-x-4 text-primary mt-5">
                {footer.links.side4.whatsappHref && (
                  <li>
                    <a
                      href={footer.links.side4.whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500"
                    >
                      <img src="https://img.icons8.com/ios-filled/250/whatsapp--v1.png" alt="WhatsApp" className="w-6 h-6" />
                    </a>
                  </li>
                )}
                {footer.links.side4.wechatHref && (
                  <li>
                    <a
                      href={footer.links.side4.wechatHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500"
                    >
                      <img src="https://img.icons8.com/sf-black-filled/64/weixing.png" alt="WeChat" className="w-6 h-6" />
                    </a>
                  </li>
                )}
                {footer.links.side4.facebookHref && (
                  <li>
                    <a
                      href={footer.links.side4.facebookHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500"
                    >
                      <img src="https://img.icons8.com/ios-filled/250/facebook-new.png" alt="Facebook" className="w-6 h-6" />
                    </a>
                  </li>
                )}
                {footer.links.side4.emailHref && (
                  <li>
                    <a
                      href={footer.links.side4.emailHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500"
                    >
                      <img src="https://img.icons8.com/pastel-glyph/64/new-post--v1.png" alt="Email" className="w-6 h-6" />
                    </a>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {isEditing && (
          <div className="fixed inset-0 bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] overflow-y-auto p-6 relative">
              <button
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition text-3xl font-light bg-gray-100 hover:bg-gray-200 rounded-full w-10 h-10 flex items-center justify-center"
                onClick={() => setIsEditing(false)}
              >
                ×
              </button>

              <h2 className="text-3xl font-bold mb-8 text-center text-primary border-b border-gray-200 pb-4">
                Edit Footer Section
              </h2>

              {/* Logo Display */}
              <div className="mb-10 bg-gray-50 p-6 rounded-xl">
                <h3 className="text-lg font-semibold mb-4 text-primary text-center">Company Logo</h3>
                <div
                  className={`relative h-60 w-60 mx-auto border-3 border-dashed rounded-2xl flex items-center justify-center cursor-pointer overflow-hidden transition-all duration-300`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer z-30"
                    onChange={handleLogoFileSelect}
                  />
                  {formData.logoPath ? (
                    <div className="relative w-full h-full group">
                      <img
                        src={formData.logoPath}
                        alt="Company Logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="text-center z-10">
                      <Upload className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                      <p className="text-gray-500 font-medium">Click or Drag & Drop</p>
                      <p className="text-xs text-gray-400">Max 5MB</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {(['en', 'zh', 'si'] as const).map((lang) => (
                  <section key={lang}>
                    <h3 className="text-xl font-semibold mb-4 border-b pb-2 text-center text-primary">
                      {lang === 'en' ? 'English' : lang === 'zh' ? 'Mandarin' : 'Sinhala'}
                    </h3>
                    <label className="block font-medium mb-1 text-gray-700">Company Name:</label>
                    <input
                      type="text"
                      value={formData.companyName[lang] || ''}
                      onChange={(e) => handleInputChange(lang, 'companyName', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-3 mb-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                    />
                    <label className="block font-medium mb-1 text-gray-700">Company Address:</label>
                    <textarea
                      value={formData.companyAddress[lang] || ''}
                      onChange={(e) => handleInputChange(lang, 'companyAddress', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-3 h-40 resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                    />
                  </section>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <div>
                  <label className="block font-medium mb-1 text-gray-700">Phone:</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => handleInputChange(null, 'phone', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 text-gray-700">Email:</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange(null, 'email', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                  />
                </div>
              </div>

              <div className="mb-10">
                <label className="block font-medium mb-1 text-gray-700">WhatsApp Link:</label>
                <input
                  type="text"
                  value={formData.whatsappHref}
                  onChange={(e) => handleInputChange(null, 'whatsappHref', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 mb-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
                <label className="block font-medium mb-1 text-gray-700">WeChat Link:</label>
                <input
                  type="text"
                  value={formData.wechatHref}
                  onChange={(e) => handleInputChange(null, 'wechatHref', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 mb-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
                <label className="block font-medium mb-1 text-gray-700">Facebook Link:</label>
                <input
                  type="text"
                  value={formData.facebookHref}
                  onChange={(e) => handleInputChange(null, 'facebookHref', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 mb-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
                <label className="block font-medium mb-1 text-gray-700">Email Link:</label>
                <input
                  type="text"
                  value={formData.emailHref}
                  onChange={(e) => handleInputChange(null, 'emailHref', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>

              <div className="flex justify-between items-center gap-4 mb-6">
                <button
                  disabled={isTranslating}
                  className={`px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium transition ${isTranslating
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
                <div className="flex-1" />
                <button
                  className="px-6 py-2.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium transition"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  disabled={isSaving}
                  className={`px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium transition ${isSaving
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

              {saveMsg && (
                <p
                  className={`mt-4 text-center font-medium ${saveMsg.includes('failed') ? 'text-red-600' : 'text-green-600'
                    }`}
                >
                  {saveMsg}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Logo Crop Modal */}
        {isLogoModalOpen && selectedLogo && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-auto">
              <h3 className="text-xl font-bold mb-4 text-center text-primary">Crop Company Logo</h3>

              <div className="relative mx-auto w-full max-w-3xl" style={{ aspectRatio: '1 / 1', height: '400px' }}>
                <div className="absolute inset-0 overflow-hidden rounded-lg border-2 border-gray-300">
                  <ReactCrop
                    crop={logoCrop}
                    onChange={(_, percentCrop) => setLogoCrop(percentCrop)}
                    onComplete={handleLogoCropComplete}
                    aspect={1 / 1}
                    className="h-full w-full"
                  >
                    <img
                      src={selectedLogo}
                      ref={logoRef}
                      alt="Crop preview"
                      className="h-100 w-full object-contain"
                      style={{ maxHeight: '100%' }}
                    />
                  </ReactCrop>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={cancelLogoCrop}
                  className="px-5 py-2.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCroppedLogo}
                  disabled={!croppedLogo}
                  className={`px-5 py-2.5 rounded-lg font-medium transition ${croppedLogo
                      ? 'bg-primary text-white hover:bg-primary/90 shadow-md'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                >
                  {croppedLogo ? 'Apply Crop' : 'Cropping...'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default FooterPage;
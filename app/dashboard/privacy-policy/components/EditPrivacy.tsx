'use client';

import React, { useState } from 'react';
import { PrivacyPolicy, PrivacySection, Block } from '../types';

interface EditPrivacyProps {
  data: PrivacyPolicy;
  onSave: (updated: PrivacyPolicy) => void;
  onCancel: () => void;
}

/* --------------------------------------------------------------- */
/* --------------------------  COMPONENT  ------------------------ */
/* --------------------------------------------------------------- */
const EditPrivacy: React.FC<EditPrivacyProps> = ({ data, onSave, onCancel }) => {
  /* ---------- migrate legacy data (single description) ---------- */
  const migrate = (src: PrivacyPolicy): PrivacyPolicy => ({
    ...src,
    sections: src.sections.map(sec => ({
      ...sec,
      en: {
        title: sec.en.title || '',
        blocks:
          sec.en.description !== undefined
            ? [
                ...sec.en.description.map(desc => ({
                  type: 'description' as const,
                  text: [desc],
                })),
                ...(sec.en.points?.map((p: string[]) => ({
                  type: 'points' as const,
                  items: p,
                })) ?? []),
              ]
            : sec.en.blocks ?? [],
      },
      zh: {
        title: sec.zh.title || '',
        blocks:
          sec.zh.description !== undefined
            ? [
                ...sec.zh.description.map(desc => ({
                  type: 'description' as const,
                  text: [desc],
                })),
                ...(sec.zh.points?.map((p: string[]) => ({
                  type: 'points' as const,
                  items: p,
                })) ?? []),
              ]
            : sec.zh.blocks ?? [],
      },
      si: {
        title: sec.si.title || '',
        blocks:
          sec.si.description !== undefined
            ? [
                ...sec.si.description.map(desc => ({
                  type: 'description' as const,
                  text: [desc],
                })),
                ...(sec.si.points?.map((p: string[]) => ({
                  type: 'points' as const,
                  items: p,
                })) ?? []),
              ]
            : sec.si.blocks ?? [],
      },
    })),
  });

  const [formData, setFormData] = useState<PrivacyPolicy>(migrate(data));
  const [isSaving, setIsSaving] = useState(false);
  const [sectionTranslating, setSectionTranslating] = useState<boolean[]>(data.sections.map(() => false));
  const [activeLang, setActiveLang] = useState<'en' | 'zh' | 'si'>('en');

  /* --------------------------  BLOCK HELPERS  -------------------------- */
  const updateBlock = (
    lang: 'en' | 'zh' | 'si',
    secIdx: number,
    blockIdx: number,
    newBlock: Block
  ) => {
    const upd = [...formData.sections];
    upd[secIdx][lang].blocks[blockIdx] = newBlock;
    setFormData({ ...formData, sections: upd });
  };

  const addBlock = (
    lang: 'en' | 'zh' | 'si',
    secIdx: number,
    afterIdx: number,
    type: 'description' | 'points'
  ) => {
    const upd = [...formData.sections];
    const newB: Block =
      type === 'description' ? { type, text: [''] } : { type, items: [''] };

    (['en', 'zh', 'si'] as const).forEach((language) => {
      upd[secIdx][language].blocks.splice(afterIdx + 1, 0, { ...newB });
    });

    setFormData({ ...formData, sections: upd });
  };

  const removeBlock = (lang: 'en' | 'zh' | 'si', secIdx: number, blockIdx: number) => {
    const updatedSections = [...formData.sections];

    // Remove the block for all languages
    (['en', 'zh', 'si'] as const).forEach((language) => {
      updatedSections[secIdx][language].blocks.splice(blockIdx, 1);
    });

    setFormData({ ...formData, sections: updatedSections });
  };

  const addPointInside = (
    lang: 'en' | 'zh' | 'si',
    secIdx: number,
    blockIdx: number
  ) => {
    const upd = [...formData.sections];
    const points = upd[secIdx][lang].blocks[blockIdx] as { type: 'points'; items: string[] };
    points.items.push('');
    setFormData({ ...formData, sections: upd });
  };

  const updatePoint = (
    lang: 'en' | 'zh' | 'si',
    secIdx: number,
    blockIdx: number,
    pointIdx: number,
    value: string
  ) => {
    const upd = [...formData.sections];
    const points = upd[secIdx][lang].blocks[blockIdx] as { type: 'points'; items: string[] };
    points.items[pointIdx] = value;
    setFormData({ ...formData, sections: upd });
  };

  const removePointInside = (
    lang: 'en' | 'zh' | 'si',
    secIdx: number,
    blockIdx: number,
    pointIdx: number
  ) => {
    const updatedSections = [...formData.sections];

    // Remove the point for all languages
    (['en', 'zh', 'si'] as const).forEach((language) => {
      const points = updatedSections[secIdx][language].blocks[blockIdx] as { type: 'points'; items: string[] };
      points.items.splice(pointIdx, 1);
    });

    setFormData({ ...formData, sections: updatedSections });
  };

  /* --------------------------  SYNC POINTS (EN → ZH/SI)  -------------------------- */
  const syncPoints = (secIdx: number) => {
    const upd = [...formData.sections];
    const enPoints: string[] = [];
    upd[secIdx].en.blocks.forEach(b => {
      if (b.type === 'points') enPoints.push(...b.items);
    });

    const fill = (target: typeof upd[0]['zh']) => {
      const existing: string[] = [];
      target.blocks.forEach(b => {
        if (b.type === 'points') existing.push(...b.items);
      });
      const newItems = enPoints.map((_, i) => existing[i] ?? '');
      let ptr = 0;
      target.blocks = target.blocks.map(b => {
        if (b.type === 'points') {
          const slice = newItems.slice(ptr, ptr + b.items.length);
          ptr += b.items.length;
          return { ...b, items: slice };
        }
        return b;
      });
    };

    fill(upd[secIdx].zh);
    fill(upd[secIdx].si);
    setFormData({ ...formData, sections: upd });
  };

  const addEnglishPointBlock = (secIdx: number) => {
    const upd = [...formData.sections];
    upd[secIdx].en.blocks.push({ type: 'points', items: [''] });
    syncPoints(secIdx);
  };

  /* --------------------------  SECTION HELPERS  -------------------------- */
  const addSection = () => {
    const newSec: PrivacySection = {
      id: `section-${formData.sections.length + 1}`,
      en: { title: 'New Section', blocks: [{ type: 'description', text: [''] }] },
      zh: { title: '', blocks: [{ type: 'description', text: [''] }] },
      si: { title: '', blocks: [{ type: 'description', text: [''] }] },
    };

    setFormData({ ...formData, sections: [...formData.sections, newSec] });
    setSectionTranslating(prev => [...prev, false]);
  };

  const removeSectionAcrossLanguages = (secIdx: number) => {
    const updatedSections = formData.sections.filter((_, index) => index !== secIdx);
    setFormData({ ...formData, sections: updatedSections });
    setSectionTranslating(prev => prev.filter((_, i) => i !== secIdx));
  };

  // Replace the existing removeSection function with this one
  const removeSection = (secIdx: number) => {
    const updatedSections = formData.sections.filter((_, index) => index !== secIdx);
    setFormData({ ...formData, sections: updatedSections });
    setSectionTranslating(prev => prev.filter((_, i) => i !== secIdx));
  };

  /* --------------------------  PAYLOAD TRANSFORMATION STRICT ORDER  -------------------------- */
  const transformPayloadWithStrictOrder = (formData: PrivacyPolicy) => {
    return {
      heading: formData.heading,
      sections: formData.sections.map((section) => {
        const transformBlocks = (blocks: Block[]) => {
          const result: Record<string, string | string[]> = {};
          let order = 1;

          blocks.forEach((block) => {
            if (block.type === 'description') {
              result[`order${order}_description`] = Array.isArray(block.text) ? block.text.join(' ') : block.text;
              order++;
            } else if (block.type === 'points') {
              result[`order${order}_points`] = block.items;
              order++;
            }
          });

          return result;
        };

        return {
          id: section.id,
          en: {
            title: section.en.title,
            ...transformBlocks(section.en.blocks),
          },
          zh: {
            title: section.zh.title,
            ...transformBlocks(section.zh.blocks),
          },
          si: {
            title: section.si.title,
            ...transformBlocks(section.si.blocks),
          },
        };
      }),
    };
  };

  /* --------------------------  SAVE WITH STRICT ORDER  -------------------------- */
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE_URL || '';

      // Transform formData to match the required payload structure with strict order
      const payload = transformPayloadWithStrictOrder(formData);

      const resp = await fetch(`${base}/privacy-policy/update-privacy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) throw new Error('Failed');
      onSave(formData);
    } catch (e) {
      console.error(e);
      alert('Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  /* --------------------------  TRANSLATE  -------------------------- */
  const translateToLang = async (
    targetLang: string,
    enTitle: string,
    enBlocks: Block[]
  ) => {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      alert('Gemini key missing');
      return null;
    }

    const descs: string[] = [];
    const points: string[] = [];
    enBlocks.forEach(b => {
      if (b.type === 'description') descs.push(...b.text);
      else points.push(...b.items);
    });

    const prompt = `Translate to ${targetLang}. Return ONLY JSON:
{"title":"...","descriptionBlocks":["..."],"points":["..."]}

English:
- Title: ${enTitle}
- Descriptions: ${descs.join(' || ')}
- Points: ${points.join(', ')}`;

    try {
      console.log('Sending translation request:', { targetLang, prompt });
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );

      if (!r.ok) {
        console.error('API error:', r.status, r.statusText);
        throw new Error('API error');
      }

      const d = await r.json();
      console.log('Translation API response:', d);

      const txt = d?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!txt) {
        console.error('No text in API response');
        throw new Error('No text in API response');
      }

      const json = txt.match(/\{.*\}/s);
      if (!json) {
        console.error('No JSON in API response text:', txt);
        throw new Error('No JSON in API response text');
      }

      const parsed = JSON.parse(json[0]);
      console.log('Parsed translation:', parsed);
      return parsed;
    } catch (e) {
      console.error('Translation failed:', e);
      alert(`Translate failed: ${(e as Error).message}`);
      return null;
    }
  };

  const handleTranslateSection = async (secIdx: number) => {
    const sec = formData.sections[secIdx];
    const enTitle = sec.en.title || 'Untitled Section';
    if (!enTitle.trim()) {
      alert('Add English title before translating');
      return;
    }
    setSectionTranslating(prev => prev.map((v, i) => i === secIdx ? true : v));
    try {
      // Use only the current English field values for translation
      const enBlocks: Block[] = sec.en.blocks.map((block) => {
        if (block.type === 'description') {
          return { type: 'description', text: block.text };
        } else if (block.type === 'points') {
          return { type: 'points', items: block.items };
        }
        return block;
      });

      const zh = await translateToLang('Chinese (Simplified)', enTitle, enBlocks);
      const si = await translateToLang('Sinhala', enTitle, enBlocks);

      const syncTranslatedBlocks = (translatedBlocks: { descriptionBlocks: string[]; points: string[] } | undefined): Block[] => {
        if (!translatedBlocks) return sec.en.blocks;
        const { descriptionBlocks, points } = translatedBlocks;

        const blocks: Block[] = [];
        let descIndex = 0;
        let pointIndex = 0;

        // Maintain the exact order of descriptions and points as in English
        sec.en.blocks.forEach((enBlock) => {
          if (enBlock.type === 'description' && descIndex < descriptionBlocks.length) {
            blocks.push({ type: 'description', text: [descriptionBlocks[descIndex]] });
            descIndex++;
          } else if (enBlock.type === 'points' && pointIndex < points.length) {
            blocks.push({ type: 'points', items: points.slice(pointIndex, pointIndex + enBlock.items.length) });
            pointIndex += enBlock.items.length;
          } else {
            blocks.push(enBlock); // Fallback to the original block if no translation is available
          }
        });

        return blocks;
      };

      const updatedSections = [...formData.sections];
      updatedSections[secIdx] = {
        ...sec,
        zh: {
          title: zh?.title || sec.zh.title,
          blocks: syncTranslatedBlocks(zh),
        },
        si: {
          title: si?.title || sec.si.title,
          blocks: syncTranslatedBlocks(si),
        },
      };
      setFormData({ ...formData, sections: updatedSections });
    } catch (error) {
      console.error(error);
      alert('Translation failed. Please try again.');
    } finally {
      setSectionTranslating(prev => prev.map((v, i) => i === secIdx ? false : v));
    }
  };

  const rebuildBlocks = (descs: string[], points: string[]) => {
    const out: Block[] = [];
    let pIdx = 0;
    descs.forEach(d => {
      out.push({ type: 'description', text: [d] }); // Wrap `d` in an array
      const chunk = points.slice(pIdx, pIdx + 1);
      if (chunk.length) out.push({ type: 'points', items: chunk });
      pIdx += chunk.length;
    });
    if (pIdx < points.length) out.push({ type: 'points', items: points.slice(pIdx) });
    return out;
  };

  /* --------------------------  TITLE HELPERS  -------------------------- */
  const updateTitle = (lang: 'en' | 'zh' | 'si', secIdx: number, newTitle: string) => {
    const upd = [...formData.sections];
    upd[secIdx][lang].title = newTitle;
    setFormData({ ...formData, sections: upd });
  };

  const renderTitle = (lang: 'en' | 'zh' | 'si', secIdx: number) => {
    const labelTitle =
      lang === 'en' ? 'Title' :
      lang === 'zh' ? '标题 (Title)' :
      'ශීර්ෂය (Title)';

    return (
      <div className="mb-4">
        <label className="block font-medium mb-1 text-black">{labelTitle}:</label>
        <input
          type="text"
          value={formData.sections[secIdx][lang].title || ''}
          onChange={e => updateTitle(lang, secIdx, e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-2 font-semibold"
          placeholder={lang === 'en' ? 'Enter section title' : ''}
        />
      </div>
    );
  };

  /* --------------------------  RENDER HELPERS  -------------------------- */
  const renderBlocks = (lang: 'en' | 'zh' | 'si', secIdx: number, blocks: Block[]) => {
    const labelDesc =
      lang === 'en' ? 'Description' :
      lang === 'zh' ? '描述 (Description)' :
      'විස්තරය (Description)';

    const labelPoints =
      lang === 'en' ? 'Points' :
      lang === 'zh' ? '要点 (Points)' :
      'කාරණා (Points)';

    return blocks.map((block, bIdx) => (
      <div key={`${secIdx}-${lang}-block-${bIdx}`} className="mb-6 p-4 border rounded-lg bg-gray-50">

        {/* ----- DESCRIPTION ----- */}
        {block.type === 'description' && (
          <>
            <label className="block font-medium mb-1">{labelDesc}:</label>
            <textarea
              value={Array.isArray(block.text) ? block.text.join(', ') : block.text}
              onChange={e =>
                updateBlock(lang, secIdx, bIdx, { ...block, text: e.target.value.split(', ') })
              }
              className="w-full border border-gray-300 rounded-lg p-2 h-24 resize-none"
            />
          </>
        )}

        {/* ----- POINTS ----- */}
        {block.type === 'points' && (
          <>
            <label className="block font-medium mb-1">{labelPoints}:</label>
            {block.items.map((p, pIdx) => (
              <div key={pIdx} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={p}
                  onChange={e =>
                    updatePoint(lang, secIdx, bIdx, pIdx, e.target.value)
                  }
                  className="flex-1 border border-gray-300 rounded-lg p-2"
                />
                {lang === 'en' && (
                  <button
                    type="button"
                    onClick={() => removePointInside(lang, secIdx, bIdx, pIdx)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            {lang === 'en' && (
              <button
                type="button"
                onClick={() => addPointInside(lang, secIdx, bIdx)}
                className="bg-teal-600 text-white px-3 py-1 rounded hover:bg-teal-700 text-sm"
              >
                + Add Point
              </button>
            )}
          </>
        )}

        {/* ----- ADD BUTTONS BELOW EACH BLOCK ----- */}
        {lang === 'en' && (
          <div className="flex gap-3 mt-3">
            <button
              type="button"
              onClick={() => addBlock(lang, secIdx, bIdx, 'description')}
              className="bg-indigo-600 text-white px-4 py-1 rounded hover:bg-indigo-700 text-sm"
            >
              + Add Description
            </button>
            <button
              type="button"
              onClick={() => addBlock(lang, secIdx, bIdx, 'points')}
              className="bg-teal-600 text-white px-4 py-1 rounded hover:bg-teal-700 text-sm"
            >
              + Add Points
            </button>
            {blocks.length > 0 && (
              <button
                type="button"
                onClick={() => removeBlock(lang, secIdx, bIdx)}
                className="bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 text-sm"
              >
                Remove Block
              </button>
            )}
          </div>
        )}
      </div>
    ));
  };

  /* --------------------------  BLOCKS ORDER SYNC  -------------------------- */
  const syncBlocksOrder = () => {
    const updatedSections = formData.sections.map((section) => {
      const enBlocks = section.en.blocks;

      const syncLanguageBlocks = (langBlocks: Block[]) => {
        return enBlocks.map((enBlock, index) => {
          const correspondingBlock = langBlocks[index];
          if (correspondingBlock && correspondingBlock.type === enBlock.type) {
            return { ...correspondingBlock, ...enBlock };
          }
          return { ...enBlock };
        });
      };

      return {
        ...section,
        zh: {
          ...section.zh,
          blocks: syncLanguageBlocks(section.zh.blocks),
        },
        si: {
          ...section.si,
          blocks: syncLanguageBlocks(section.si.blocks),
        },
      };
    });

    setFormData({ ...formData, sections: updatedSections });
  };

  /* --------------------------  MAIN RENDER  -------------------------- */
  return (
    <div className="fixed inset-0 bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[92vh] overflow-y-auto p-8 relative">
        {/* CLOSE */}
        <button
          className="absolute top-6 right-6 text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-full p-2 w-10 h-10 flex items-center justify-center"
          onClick={onCancel}
        >
          ×
        </button>

        <h2 className="text-3xl font-bold mb-8 text-center border-b pb-4">
          Edit Privacy Policy
        </h2>

        {/* LANG TABS */}
        <div className="flex justify-center gap-4 mb-6">
          {(['en', 'zh', 'si'] as const).map(l => (
            <button
              key={l}
              onClick={() => setActiveLang(l)}
              className={`px-4 py-2 rounded-lg ${
                activeLang === l ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {l === 'en' ? 'English' : l === 'zh' ? 'Mandarin' : 'Sinhala'}
            </button>
          ))}
        </div>

        {/* SECTIONS */}
        {formData.sections.map((section, sIdx) => (
          <div key={`${section.id}-${activeLang}`} className="mb-12 p-6 rounded-r-lg bg-white shadow-lg">

            {/* SECTION HEADING */}
            {activeLang === 'en' && (
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">
                  Section {sIdx + 1} - English
                </h3>
                <button
                  type="button"
                  onClick={() => removeSection(sIdx)}
                  disabled={formData.sections.length === 1}
                  className="bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 border border-red-300 text-sm"
                >
                  Remove Section
                </button>
              </div>
            )}
            {activeLang === 'zh' && (
              <h3 className="text-xl font-semibold mb-4">
                Section {sIdx + 1} - Mandarin (中文)
              </h3>
            )}
            {activeLang === 'si' && (
              <h3 className="text-xl font-semibold mb-4">
                Section {sIdx + 1} - Sinhala (සිංහල)
              </h3>
            )}

            {/* TITLE - NOW CONSISTENT FOR ALL LANGUAGES */}
            {renderTitle(activeLang, sIdx)}

            {/* Blocks */}
            {renderBlocks(activeLang, sIdx, section[activeLang].blocks)}

            {/* Bottom actions */}
            <div className="mt-6 flex justify-end gap-4">
              {sIdx === formData.sections.length - 1 && (
                <button
                  onClick={addSection}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  Add New Section
                </button>
              )}
              <button
                onClick={() => handleTranslateSection(sIdx)}
                disabled={sectionTranslating[sIdx] || isSaving}
                className={`bg-gray-600 text-white px-4 py-2 rounded flex items-center gap-2 ${
                  sectionTranslating[sIdx] ? 'opacity-70 cursor-not-allowed' : 'hover:bg-gray-700'
                }`}
                style={{ marginLeft: 'auto' }}
              >
                {sectionTranslating[sIdx] && (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" className="opacity-75" />
                  </svg>
                )}
                {sectionTranslating[sIdx] ? 'Translating...' : 'Translate to Sinhala & Mandarin'}
              </button>
            </div>
          </div>
        ))}

        {/* FOOTER */}
        <div className="mt-8 flex justify-end gap-4 border-t pt-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-6 py-2 rounded flex items-center gap-2 ${
              isSaving ? 'bg-primary/70 cursor-not-allowed text-white' : 'bg-primary text-white hover:bg-primary/80'
            }`}
          >
            {isSaving && (
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" className="opacity-75" />
              </svg>
            )}
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditPrivacy;
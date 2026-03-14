import React, { useState } from 'react';

const languageMap: Record<string, string> = {
	en: 'English',
	zh: 'Mandarin',
	si: 'Sinhala',
};

interface SectionContent {
	heading?: string;
	description?: string;
}

export interface VisionMissionData {
	connection?: SectionContent;
	vision?: SectionContent;
	mission?: SectionContent;
}

interface VisionMissionProps {
	visionMissionData: Record<string, VisionMissionData>;
	onSave: (updatedData: Record<string, VisionMissionData>) => void;
	onCancel: () => void;
}

const EditVisionMission = ({ visionMissionData, onSave, onCancel }: VisionMissionProps) => {
	const [formData, setFormData] = useState<Record<string, VisionMissionData>>(visionMissionData);
	const [isTranslating, setIsTranslating] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	const handleInputChange = (lang: string, section: keyof VisionMissionData, field: keyof SectionContent, value: string) => {
		setFormData((prev) => ({
			...prev,
			[lang]: {
				...prev[lang],
				[section]: {
					...prev[lang]?.[section],
					[field]: value,
				},
			},
		}));
	};

	const translateToLang = async (
		targetLang: string,
		enConnection: SectionContent,
		enVision: SectionContent,
		enMission: SectionContent
	): Promise<Record<string, VisionMissionData> | null> => {
		const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
		if (!apiKey) {
			alert('Gemini API key not found');
			return null;
		}

		const prompt = `Translate the following content to ${targetLang}. Return ONLY valid JSON in this format: {"connection": {"heading": "..."}, "vision": {"heading": "...", "description": "..."}, "mission": {"heading": "...", "description": "..."}}.

English:
- Connection Heading: ${enConnection.heading}
- Vision Heading: ${enVision.heading}
- Vision Description: ${enVision.description}
- Mission Heading: ${enMission.heading}
- Mission Description: ${enMission.description}`;

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
		if (!formData.en?.connection?.heading ||
			!formData.en?.vision?.heading || !formData.en?.vision?.description ||
			!formData.en?.mission?.heading || !formData.en?.mission?.description) {
			alert('Fill all English content first');
			return;
		}

		setIsTranslating(true);
		try {
			const zhResult = await translateToLang('Chinese (Simplified)', formData.en.connection!, formData.en.vision!, formData.en.mission!);
			if (zhResult) {
				setFormData((prev) => ({
					...prev,
					zh: zhResult,
				}));
			}

			const siResult = await translateToLang('Sinhala', formData.en.connection!, formData.en.vision!, formData.en.mission!);
			if (siResult) {
				setFormData((prev) => ({
					...prev,
					si: siResult,
				}));
			}
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
				connection: {
					en: formData.en.connection,
					zh: formData.zh.connection,
					si: formData.si.connection,
				},
				vision: {
					en: formData.en.vision,
					zh: formData.zh.vision,
					si: formData.si.vision,
				},
				mission: {
					en: formData.en.mission,
					zh: formData.zh.mission,
					si: formData.si.mission,
				},
			};

			const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/company/update-company`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload),
			});

			if (response.ok) {
				onSave(formData);
			} else {
				alert('Failed to update Vision and Mission.');
			}
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

				<h2 className="text-2xl font-bold mb-6 text-center">Edit Vision & Mission Section</h2>

				{/* Content in Three Columns */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{Object.entries(languageMap).map(([lang, label]) => (
						<section key={lang}>
							<h3 className="text-xl font-semibold mb-4 border-b pb-2 text-center">{label}</h3>
							{/* Connection */}
							<label className="block font-medium mb-1">Connection Heading:</label>
							<input
								type="text"
								value={formData[lang]?.connection?.heading || ''}
								onChange={(e) => handleInputChange(lang, 'connection', 'heading', e.target.value)}
								className="w-full text-sm border border-gray-300 rounded-lg p-2 mb-3"
							/>
							{/* Vision */}
							<label className="block font-medium mb-1">Vision Heading:</label>
							<input
								type="text"
								value={formData[lang]?.vision?.heading || ''}
								onChange={(e) => handleInputChange(lang, 'vision', 'heading', e.target.value)}
								className="w-full text-sm border border-gray-300 rounded-lg p-2 mb-3"
							/>
							<label className="block font-medium mb-1">Vision Description:</label>
							<textarea
								value={formData[lang]?.vision?.description || ''}
								onChange={(e) => handleInputChange(lang, 'vision', 'description', e.target.value)}
								className="w-full text-sm border border-gray-300 rounded-lg p-2 h-24 resize-none mb-3"
							/>
							{/* Mission */}
							<label className="block font-medium mb-1">Mission Heading:</label>
							<input
								type="text"
								value={formData[lang]?.mission?.heading || ''}
								onChange={(e) => handleInputChange(lang, 'mission', 'heading', e.target.value)}
								className="w-full text-sm border border-gray-300 rounded-lg p-2 mb-3"
							/>
							<label className="block font-medium mb-1">Mission Description:</label>
							<textarea
								value={formData[lang]?.mission?.description || ''}
								onChange={(e) => handleInputChange(lang, 'mission', 'description', e.target.value)}
								className="w-full text-sm border border-gray-300 rounded-lg p-2 h-24 resize-none"
							/>
						</section>
					))}
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

export default EditVisionMission;

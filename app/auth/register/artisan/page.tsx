
"use client";
import { ChangeEvent, useMemo, useRef, useState } from 'react';
const BaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:4000/api/v1';
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StepIndex = 1 | 2 | 3 | 4 | 5;

type FormState = {
  fullName: string;
  shopName: string;
  shopSlug: string;
  specialties: string[];
  yearsOfExperience: string;
  shortBio: string;
  region: string;
  city: string;
  technique: string;
  culturalSignificance: string;
  /** Blob-URL strings used only for <img> preview — NOT sent to the API */
  profileImage: string;
  coverImage: string;
  sampleImages: string[];
};

/**
 * Holds the actual File objects that will be sent via FormData.
 * Kept separate so we never mutate FormState or change any preview logic.
 */
type FileState = {
  profileImageFile: File | null;
  coverImageFile: File | null;
  sampleImageFiles: File[];
};

type SubmitPhase =
  | 'idle'
  | 'creating-draft'
  | 'uploading-images'
  | 'submitting-draft'
  | 'done'
  | 'error';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const specialtyOptions = ['Weaving', 'Pottery', 'Jewelry', 'Leather', 'Embroidery', 'Other'];
const regionOptions = ['Addis Ababa', 'Amhara', 'Oromia', 'Tigray', 'Sidama', 'SNNPR', 'Afar', 'Somali'];

const initialForm: FormState = {
  fullName: 'Meron Bekele',
  shopName: '',
  shopSlug: '',
  specialties: [],
  yearsOfExperience: '',
  shortBio: '',
  region: '',
  city: '',
  technique: '',
  culturalSignificance: '',
  profileImage: '',
  coverImage: '',
  sampleImages: [],
};

const initialFiles: FileState = {
  profileImageFile: null,
  coverImageFile: null,
  sampleImageFiles: [],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/** Returns the user-facing label for each submit phase. */
function phaseLabel(phase: SubmitPhase): string {
  switch (phase) {
    case 'creating-draft': return 'Creating draft…';
    case 'uploading-images': return 'Uploading images…';
    case 'submitting-draft': return 'Submitting for verification…';
    default: return 'Submit for Verification';
  }
}

/** Client uses cookie-based auth; local token storage removed. */
function getAuthToken(): string | null {
  return null;
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

/**
 * Step 1 — Create a product draft with JSON data.
 * POST /artisan/products/samples
 */
async function createProductSamples(payload: Record<string, unknown>): Promise<string> {
  const res = await fetch(`${BaseUrl}/artisan/products/samples`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Draft creation failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  // The API wraps the draft in a { data: { ... }, message: "..." } envelope
  const sample = json?.data ?? json;
  const sampleId: string | undefined = sample?.sampleId ?? sample?.id ?? sample?.sample?.id;

  if (!sampleId) {
    console.log("No sampleId returned from server. Check the API response shape.", json);
    throw new Error('No sampleId returned from server. Check the API response shape.');

  }

  return sampleId;
}

/**
 * Step 2 — Upload images via multipart/form-data.
 * POST /artisan/products/samples/:sampleId/images
 *
 * NOTE: Do NOT set Content-Type manually; the browser sets it automatically
 *       with the correct boundary when using FormData.
 */
async function uploadSampleImages(sampleId: string, files: File[]): Promise<void> {
  const formData = new FormData();
  files.forEach((file) => formData.append('images', file));

  const res = await fetch(`${BaseUrl}/artisan/products/samples/${sampleId}/images`, {
    method: 'POST',
    credentials: 'include',
    // Note: do not set Content-Type here so the browser attaches the boundary
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Image upload failed (${res.status}): ${text}`);
  }
}

/* Submission for verification is an admin/reviewer responsibility.
   The artisan flow creates the draft and uploads images only; reviewers
   will submit drafts for verification from the admin side. */

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function App() {
  const [step, setStep] = useState<StepIndex>(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>('idle');
  const [isUnderReview, setIsUnderReview] = useState(false);

  const [form, setForm] = useState<FormState>(initialForm);
  const [fileState, setFileState] = useState<FileState>(initialFiles);

  const isSubmitting = submitPhase !== 'idle' && submitPhase !== 'error';
  const progressPercent = useMemo(() => (step / 5) * 100, [step]);

  // -------------------------------------------------------------------------
  // Form field handlers
  // -------------------------------------------------------------------------

  const updateForm = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleShopNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextShopName = event.target.value;
    const autoSlug = createSlug(nextShopName);
    setForm((prev) => ({ ...prev, shopName: nextShopName, shopSlug: autoSlug }));
  };

  const handleSlugChange = (event: ChangeEvent<HTMLInputElement>) => {
    const cleanedSlug = createSlug(event.target.value);
    setForm((prev) => ({ ...prev, shopSlug: cleanedSlug }));
  };

  const toggleSpecialty = (specialty: string) => {
    setForm((prev) => {
      const exists = prev.specialties.includes(specialty);
      return {
        ...prev,
        specialties: exists
          ? prev.specialties.filter((item) => item !== specialty)
          : [...prev.specialties, specialty],
      };
    });
  };

  /**
   * Handles image selection for profile, cover, and sample images.
   * — Stores blob URLs in FormState for <img> previews (unchanged behaviour).
   * — Stores the actual File objects in fileState for later FormData upload.
   */
  const handleImageUpload = (
    event: ChangeEvent<HTMLInputElement>,
    target: 'profileImage' | 'coverImage' | 'sampleImages',
  ) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    if (target === 'sampleImages') {
      const incomingFiles = Array.from(fileList).slice(0, 6); // API accepts up to 6
      const previewUrls = incomingFiles.map((file) => URL.createObjectURL(file));
      setForm((prev) => ({ ...prev, sampleImages: previewUrls }));
      setFileState((prev) => ({ ...prev, sampleImageFiles: incomingFiles }));
      return;
    }

    const [firstFile] = fileList;
    const previewUrl = URL.createObjectURL(firstFile);
    setForm((prev) => ({ ...prev, [target]: previewUrl }));

    if (target === 'profileImage') {
      setFileState((prev) => ({ ...prev, profileImageFile: firstFile }));
    } else {
      setFileState((prev) => ({ ...prev, coverImageFile: firstFile }));
    }
  };

  // -------------------------------------------------------------------------
  // Navigation / validation
  // -------------------------------------------------------------------------

  const validateStep = (): boolean => {
    const stepErrors: string[] = [];

    if (step === 1) {
      if (!form.shopName.trim()) stepErrors.push('Shop name is required.');
    }

    if (step === 2) {
      if (form.specialties.length === 0) stepErrors.push('Select at least one specialty.');
      if (!form.shortBio.trim()) stepErrors.push('Short bio is required.');
      if (form.shortBio.trim().length > 300) stepErrors.push('Short bio must be 300 characters or fewer.');
    }

    if (step === 4) {
      if (!form.profileImage) stepErrors.push('Profile image is required.');
    }

    setErrors(stepErrors);
    return stepErrors.length === 0;
  };

  const goToNextStep = () => {
    if (!validateStep()) return;
    setIsAnimating(true);
    window.setTimeout(() => {
      setStep((prev) => (prev < 5 ? ((prev + 1) as StepIndex) : prev));
      setErrors([]);
      setIsAnimating(false);
    }, 180);
  };

  const goToPreviousStep = () => {
    if (step === 1) return;
    setIsAnimating(true);
    window.setTimeout(() => {
      setStep((prev) => (prev > 1 ? ((prev - 1) as StepIndex) : prev));
      setErrors([]);
      setIsAnimating(false);
    }, 180);
  };

  // -------------------------------------------------------------------------
  // Final submit — three-step API flow
  // -------------------------------------------------------------------------

  const handleFinalSubmit = async () => {
    // 1. Client-side validation
    const allErrors: string[] = [];
    if (!form.shopName.trim()) allErrors.push('Shop name is required.');
    if (!form.shortBio.trim()) allErrors.push('Short bio is required.');
    if (form.specialties.length === 0) allErrors.push('Select at least one specialty.');
    if (!fileState.profileImageFile) allErrors.push('Profile image is required.');

    if (allErrors.length > 0) {
      setErrors(allErrors);
      return;
    }

    setErrors([]);

    // 2. Cookie-based auth is used; server will validate via cookie on API calls.

    try {
      // ── Step 1: Create draft (JSON) ────────────────────────────────────────
      setSubmitPhase('creating-draft');

      const draftPayload = {
        title: form.shopName,        // map to your product title field
        description: form.shortBio,
        category: form.specialties[0],  // primary specialty as category
        materials: form.technique ? [form.technique] : ["wood"],
        dimensions: { "length": 10, "width": 10, "height": 10 },                   // not collected in this flow
        price: 5000,                    // not collected in this flow
        stock: 10,                   // not collected in this flow

      };

      const draftId = await createProductSamples(draftPayload);

      // ── Step 2: Upload images (FormData) ────────────────────────────────────
      setSubmitPhase('uploading-images');

      const imagesToUpload: File[] = [
        ...(fileState.profileImageFile ? [fileState.profileImageFile] : []),
        ...(fileState.coverImageFile ? [fileState.coverImageFile] : []),
        ...fileState.sampleImageFiles,
      ].slice(0, 6); // enforce the API's 6-image cap

      if (imagesToUpload.length > 0) {
        await uploadSampleImages(draftId, imagesToUpload);
      }

      // ── Step 3: Finalize — do NOT auto-submit for verification (admin action)
      // The artisan creates the draft and uploads images; a reviewer will submit it.
      // No call to the review/submit endpoint is made from the artisan flow.

      // ── Done ────────────────────────────────────────────────────────────────
      setSubmitPhase('done');
      setIsUnderReview(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setErrors([message]);
      setSubmitPhase('error');
    }
  };

  // -------------------------------------------------------------------------
  // Render — "Under Review" screen
  // -------------------------------------------------------------------------

  if (isUnderReview) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] px-6 text-[#1C1C1C]">
        <div className="max-w-xl text-center">
          <p className="font-aeonik text-xs uppercase tracking-[0.2em] text-[#7a746b]">
            Application Received
          </p>
          <h1
            className="font-druk-medium mt-5 text-4xl uppercase leading-tight md:text-5xl"
          >
            Your Craft Is Under Review
          </h1>
          <p className="mt-6 text-base leading-relaxed text-[#504a41]">
            Thank you for sharing your story. Our team will review your artisan profile before it goes live.
          </p>
          <a
            href="/auth/login"
            className="font-aeonik mt-10 inline-flex items-center gap-2 text-sm text-[#C6A75E] transition-colors hover:text-[#a78944]"
          >
            Return to sign in
            <span>→</span>
          </a>
        </div>
        <style jsx>{`
          .font-druk-medium { font-family: var(--font-druk-medium), sans-serif; }
          .font-aeonik { font-family: var(--font-aeonik), sans-serif; }
        `}</style>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render — Main form
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-[#FAFAF9] px-4 py-6 text-[#1C1C1C] md:px-10 md:py-10 font-inter">
      <main className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-4xl flex-col rounded-2xl border border-[#e9e3d8] bg-[#fdfcf9] p-6 md:p-10">
        <div className="mb-4">
          <a
            href="/"
            className="font-aeonik inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-[#7a746b] transition-colors hover:text-[#C6A75E]"
          >
            <span aria-hidden="true">←</span>
            Back to Home
          </a>
        </div>

        {/* Progress header */}
        <header>
          <div className="flex items-center justify-between gap-4">
            <p className="font-aeonik text-xs uppercase tracking-[0.14em] text-[#7a746b]">
              Step {step} of 5
            </p>
            <p className="font-aeonik text-xs text-[#8a847a]">
              Guided Artisan Onboarding
            </p>
          </div>
          <div className="mt-3 h-[2px] w-full bg-[#ece5d9]">
            <div className="h-full bg-[#C6A75E] transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
        </header>

        {/* Step content */}
        <section className="mt-10 flex-1">
          <div
            key={step}
            className="step-fade"
            style={{ opacity: isAnimating ? 0 : 1, transition: 'opacity 180ms ease' }}
          >
            {/* ── Step 1: Identity ─────────────────────────────────────────── */}
            {step === 1 && (
              <>
                <h1 className="font-druk-medium text-3xl uppercase tracking-[0.04em] md:text-4xl">
                  Introduce Yourself
                </h1>
                <p className="mt-3 max-w-[52ch] text-sm text-[#5c554b]">
                  Share your identity so your shop can be discovered with trust and clarity.
                </p>

                <div className="mt-8 grid gap-6 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm text-[#665f55]">Full Name</span>
                    <input
                      type="text"
                      value={form.fullName}
                      onChange={(event) => updateForm('fullName', event.target.value)}
                      className="w-full border-0 border-b border-[#ddd6c9] bg-transparent px-0 py-2 text-[15px] outline-none transition-colors duration-300 focus:border-[#C6A75E]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm text-[#665f55]">Shop Name *</span>
                    <input
                      type="text"
                      value={form.shopName}
                      onChange={handleShopNameChange}
                      placeholder="Alkebulan Weaving"
                      className="w-full border-0 border-b border-[#ddd6c9] bg-transparent px-0 py-2 text-[15px] outline-none transition-colors duration-300 placeholder:text-[#b8b0a3] focus:border-[#C6A75E]"
                    />
                  </label>

                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-sm text-[#665f55]">Shop URL / Slug</span>
                    <input
                      type="text"
                      value={form.shopSlug}
                      onChange={handleSlugChange}
                      placeholder="alkebulan-weaving"
                      className="w-full border-0 border-b border-[#ddd6c9] bg-transparent px-0 py-2 text-[15px] outline-none transition-colors duration-300 placeholder:text-[#b8b0a3] focus:border-[#C6A75E]"
                    />
                    <p className="font-aeonik mt-2 text-xs text-[#7f786e]">
                      Preview: /shop/{form.shopSlug || 'your-shop-slug'}
                    </p>
                  </label>
                </div>
              </>
            )}

            {/* ── Step 2: Craft ─────────────────────────────────────────────── */}
            {step === 2 && (
              <>
                <h1 className="font-druk-medium text-3xl uppercase tracking-[0.04em] md:text-4xl">
                  Your Craft
                </h1>
                <p className="mt-3 max-w-[52ch] text-sm text-[#5c554b]">
                  Tell customers what makes your craft unique.
                </p>

                <div className="mt-8 space-y-7">
                  <div>
                    <p className="mb-3 text-sm text-[#665f55]">Specialties *</p>
                    <div className="flex flex-wrap gap-2">
                      {specialtyOptions.map((specialty) => {
                        const selected = form.specialties.includes(specialty);
                        return (
                          <button
                            key={specialty}
                            type="button"
                            onClick={() => toggleSpecialty(specialty)}
                            className={`font-aeonik px-4 py-2 text-sm transition-all duration-300 ${selected
                              ? 'bg-[#1C1C1C] text-[#FAFAF9]'
                              : 'border border-[#ddd6c9] text-[#5f584f] hover:border-[#C6A75E] hover:text-[#1C1C1C]'
                              }`}
                          >
                            {specialty}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label className="block max-w-sm">
                    <span className="mb-2 block text-sm text-[#665f55]">Years of Experience</span>
                    <select
                      value={form.yearsOfExperience}
                      onChange={(event) => updateForm('yearsOfExperience', event.target.value)}
                      className="w-full border-0 border-b border-[#ddd6c9] bg-transparent px-0 py-2 text-[15px] outline-none transition-colors duration-300 focus:border-[#C6A75E]"
                    >
                      <option value="">Select</option>
                      <option value="0-2">0-2 years</option>
                      <option value="3-5">3-5 years</option>
                      <option value="6-10">6-10 years</option>
                      <option value="10+">10+ years</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm text-[#665f55]">Short Bio * (max 300)</span>
                    <textarea
                      value={form.shortBio}
                      onChange={(event) => updateForm('shortBio', event.target.value)}
                      maxLength={300}
                      rows={4}
                      placeholder="Share what makes your work meaningful."
                      className="w-full resize-none border border-[#e4dece] bg-transparent p-4 text-[15px] outline-none transition-colors duration-300 placeholder:text-[#b8b0a3] focus:border-[#C6A75E]"
                    />
                    <p className="font-aeonik mt-2 text-xs text-[#7f786e]">
                      {form.shortBio.length}/300 characters
                    </p>
                  </label>
                </div>
              </>
            )}

            {/* ── Step 3: Roots ─────────────────────────────────────────────── */}
            {step === 3 && (
              <>
                <h1 className="font-druk-medium text-3xl uppercase tracking-[0.04em] md:text-4xl">
                  Your Roots
                </h1>
                <p className="mt-3 max-w-[54ch] text-sm text-[#5c554b]">
                  Anchor your work in place, heritage, and the traditions your process carries forward.
                </p>

                <div className="mt-8 grid gap-6 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm text-[#665f55]">Region</span>
                    <select
                      value={form.region}
                      onChange={(event) => updateForm('region', event.target.value)}
                      className="w-full border-0 border-b border-[#ddd6c9] bg-transparent px-0 py-2 text-[15px] outline-none transition-colors duration-300 focus:border-[#C6A75E]"
                    >
                      <option value="">Select region</option>
                      {regionOptions.map((region) => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm text-[#665f55]">City (optional)</span>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(event) => updateForm('city', event.target.value)}
                      className="w-full border-0 border-b border-[#ddd6c9] bg-transparent px-0 py-2 text-[15px] outline-none transition-colors duration-300 focus:border-[#C6A75E]"
                    />
                  </label>

                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-sm text-[#665f55]">Technique</span>
                    <input
                      type="text"
                      value={form.technique}
                      onChange={(event) => updateForm('technique', event.target.value)}
                      placeholder="Handloom weaving, lost-wax casting, coiled pottery..."
                      className="w-full border-0 border-b border-[#ddd6c9] bg-transparent px-0 py-2 text-[15px] outline-none transition-colors duration-300 placeholder:text-[#b8b0a3] focus:border-[#C6A75E]"
                    />
                  </label>

                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-sm text-[#665f55]">Cultural Significance</span>
                    <textarea
                      value={form.culturalSignificance}
                      onChange={(event) => updateForm('culturalSignificance', event.target.value)}
                      rows={4}
                      placeholder="Share the cultural meaning behind your craft and patterns."
                      className="w-full resize-none border border-[#e4dece] bg-transparent p-4 text-[15px] outline-none transition-colors duration-300 placeholder:text-[#b8b0a3] focus:border-[#C6A75E]"
                    />
                  </label>
                </div>
              </>
            )}

            {/* ── Step 4: Images ────────────────────────────────────────────── */}
            {step === 4 && (
              <>
                <h1 className="font-druk-medium text-3xl uppercase tracking-[0.04em] md:text-4xl">
                  Show Your Work
                </h1>
                <p className="mt-3 max-w-[52ch] text-sm text-[#5c554b]">
                  Add imagery that reflects your process and quality. Strong visuals help customers trust your work.
                </p>

                <div className="mt-8 space-y-6">
                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm text-[#665f55]">Profile Image *</span>
                      <label className="upload-dropzone block cursor-pointer border border-dashed border-[#d5cdbe] bg-[#fbf9f4] p-5 text-sm text-[#746d63] transition-colors hover:border-[#C6A75E]">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => handleImageUpload(event, 'profileImage')}
                        />
                        Drag &amp; drop or click to upload
                      </label>
                      {form.profileImage && (
                        <img src={form.profileImage} alt="Profile preview" className="image-preview mt-3 h-24 w-24 object-cover" />
                      )}
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm text-[#665f55]">Cover Image (optional)</span>
                      <label className="upload-dropzone block cursor-pointer border border-dashed border-[#d5cdbe] bg-[#fbf9f4] p-5 text-sm text-[#746d63] transition-colors hover:border-[#C6A75E]">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => handleImageUpload(event, 'coverImage')}
                        />
                        Drag &amp; drop or click to upload
                      </label>
                      {form.coverImage && (
                        <img src={form.coverImage} alt="Cover preview" className="image-preview mt-3 h-24 w-full object-cover" />
                      )}
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-sm text-[#665f55]">Sample Product Images (up to 6)</span>
                    <label className="upload-dropzone block cursor-pointer border border-dashed border-[#d5cdbe] bg-[#fbf9f4] p-5 text-sm text-[#746d63] transition-colors hover:border-[#C6A75E]">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(event) => handleImageUpload(event, 'sampleImages')}
                      />
                      Drag &amp; drop or click to upload
                    </label>
                    {form.sampleImages.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 gap-3">
                        {form.sampleImages.map((image, index) => (
                          <img
                            key={`${image}-${index}`}
                            src={image}
                            alt={`Sample preview ${index + 1}`}
                            className="image-preview h-24 w-full object-cover"
                          />
                        ))}
                      </div>
                    )}
                  </label>
                </div>
              </>
            )}

            {/* ── Step 5: Review ────────────────────────────────────────────── */}
            {step === 5 && (
              <>
                <h1 className="font-druk-medium text-3xl uppercase tracking-[0.04em] md:text-4xl">
                  Ready to Join
                </h1>
                <p className="mt-3 max-w-[54ch] text-sm text-[#5c554b]">
                  Review your profile before submission. This helps us present your work with the care it deserves.
                </p>

                <div className="mt-8 grid gap-5 border-t border-[#ece5d9] pt-6 text-sm md:grid-cols-2">
                  <p>
                    <span className="block text-xs uppercase tracking-[0.12em] text-[#7b756c]">Shop Name</span>
                    <span className="mt-1 block text-[15px]">{form.shopName || '-'}</span>
                  </p>
                  <p>
                    <span className="block text-xs uppercase tracking-[0.12em] text-[#7b756c]">Shop URL</span>
                    <span className="mt-1 block text-[15px]">/shop/{form.shopSlug || '-'}</span>
                  </p>
                  <p className="md:col-span-2">
                    <span className="block text-xs uppercase tracking-[0.12em] text-[#7b756c]">Bio</span>
                    <span className="mt-1 block text-[15px]">{form.shortBio || '-'}</span>
                  </p>
                  <p>
                    <span className="block text-xs uppercase tracking-[0.12em] text-[#7b756c]">Specialties</span>
                    <span className="mt-1 block text-[15px]">{form.specialties.join(', ') || '-'}</span>
                  </p>
                  <p>
                    <span className="block text-xs uppercase tracking-[0.12em] text-[#7b756c]">Location</span>
                    <span className="mt-1 block text-[15px]">{[form.city, form.region].filter(Boolean).join(', ') || '-'}</span>
                  </p>
                </div>

                <p className="mt-6 text-sm text-[#6b645a]">
                  Our team will review your profile before it goes live.
                </p>
              </>
            )}
          </div>

          {/* Error banner */}
          {errors.length > 0 && (
            <div className="mt-7 border border-[#ecd7cf] bg-[#fff6f1] p-4 text-sm text-[#8b4a40]">
              {errors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          )}
        </section>

        {/* Navigation footer */}
        <footer className="font-aeonik mt-8 flex items-center justify-between border-t border-[#ece5d9] pt-6">
          <button
            type="button"
            onClick={goToPreviousStep}
            disabled={step === 1 || isSubmitting}
            className="px-2 py-2 text-sm text-[#5e574d] transition-colors duration-300 hover:text-[#1C1C1C] disabled:cursor-not-allowed disabled:text-[#b0a99d]"
          >
            Back
          </button>

          {step < 5 ? (
            <button
              type="button"
              onClick={goToNextStep}
              className="bg-[#1C1C1C] px-6 py-3 text-sm text-[#FAFAF9] transition-all duration-300 hover:-translate-y-[1px] hover:opacity-90"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="bg-[#1C1C1C] px-6 py-3 text-sm text-[#FAFAF9] transition-all duration-300 hover:-translate-y-[1px] hover:opacity-90 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? phaseLabel(submitPhase) : 'Submit for Verification'}
            </button>
          )}
        </footer>
      </main>
      <style jsx>{`
        .font-druk-medium { font-family: var(--font-druk-medium), sans-serif; }
        .font-aeonik { font-family: var(--font-aeonik), sans-serif; }
        .font-inter { font-family: var(--font-inter), sans-serif; }
      `}</style>
    </div>
  );
}
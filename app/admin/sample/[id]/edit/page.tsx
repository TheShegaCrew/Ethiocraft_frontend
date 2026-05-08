'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

export default function EditPage() {
  const params = useParams() as { id?: string }
  const id = params?.id ?? 'unknown'
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    id,
    title: '',
    description: '',
    culturalContext: '',
    suggestedPrice: 0,
    materials: '',
    region: '',
    technique: '',
    dimensions: '',
    culturalTags: '',
  })

  useEffect(() => {
    if (id === 'unknown') {
      setLoading(false)
      return
    }

    const fetchSample = async () => {
      try {
        const res = await fetch(`http://localhost:4000/api/v1/admin/products/samples/${id}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!res.ok) throw new Error('Failed to fetch')
        const json = await res.json()

        const item = json.data
        if (item) {
          setForm({
            id: item.id,
            title: item.title || '',
            description: item.description || '',
            culturalContext: item.culturalMetadata?.culturalSignificance || '',
            suggestedPrice: Number(item.price) || 0,
            materials: item.materials ? item.materials.join(', ') : '',
            region: item.culturalMetadata?.origin || '',
            technique: item.culturalMetadata?.technique || '',
            dimensions: item.dimensions ? `${item.dimensions.width || item.dimensions.widthCm || 0}x${item.dimensions.height || item.dimensions.heightCm || 0}` : '',
            culturalTags: item.tags ? item.tags.join(', ') : '',
          })
        }
      } catch (err) {
        console.error('Failed to fetch sample data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSample()
  }, [id])

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const [saving, setSaving] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      
      const payload = {
        title: form.title,
        description: form.description,
        price: Number(form.suggestedPrice),
        materials: form.materials.split(',').map(s => s.trim()).filter(Boolean),
        tags: form.culturalTags.split(',').map(s => s.trim()).filter(Boolean),
        culturalMetadata: {
          origin: form.region,
          technique: form.technique,
          culturalSignificance: form.culturalContext
        }
      }

      const res = await fetch(`http://localhost:4000/api/v1/admin/samples/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        throw new Error('Failed to update sample')
      }

      router.push(`/admin/sample/${id}`)
    } catch (err) {
      console.error(err)
      alert('Error updating sample. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] text-[#1C1C1C]">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] px-4 py-6 text-[#1C1C1C] md:px-8" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.08em] text-[#7c7065]" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>
            Admin <ChevronRight className="inline h-3 w-3" /> Samples <ChevronRight className="inline h-3 w-3" /> Edit
          </p>
          <h1 className="mt-3 text-3xl uppercase tracking-[0.04em]" style={{ fontFamily: '"Druk Wide", "Arial Black", sans-serif' }}>
            Edit Sample
          </h1>
          <p className="mt-2 text-sm text-[#6f655d]">Edit product with id: {id}</p>
        </div>

        <form className="space-y-6" onSubmit={onSubmit}>
          
          {/* Basic Information */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-xs uppercase tracking-[0.08em] text-[#85796d] mb-5" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>Basic Information</h2>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="text-sm md:col-span-2 flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.05em] text-[#85796d] font-semibold">Title</span>
                <input name="title" value={form.title} onChange={onChange} className="w-full rounded-xl border border-neutral-200 bg-[#fbf9f6] px-4 py-3 outline-none focus:border-[#C6A75E] focus:bg-white transition-colors" placeholder="Enter product title" />
              </label>
              <label className="text-sm md:col-span-2 flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.05em] text-[#85796d] font-semibold">Description</span>
                <textarea name="description" rows={4} value={form.description} onChange={onChange} className="w-full rounded-xl border border-neutral-200 bg-[#fbf9f6] px-4 py-3 outline-none focus:border-[#C6A75E] focus:bg-white transition-colors" placeholder="Describe the product..." />
              </label>
              <label className="text-sm flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.05em] text-[#85796d] font-semibold">Suggested Price (ETB)</span>
                <input name="suggestedPrice" type="number" value={String(form.suggestedPrice)} onChange={(e) => onChange(e as any)} className="w-full rounded-xl border border-neutral-200 bg-[#fbf9f6] px-4 py-3 outline-none focus:border-[#C6A75E] focus:bg-white transition-colors" />
              </label>
            </div>
          </div>

          {/* Cultural Metadata */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-xs uppercase tracking-[0.08em] text-[#85796d] mb-5" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>Cultural Context</h2>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="text-sm flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.05em] text-[#85796d] font-semibold">Origin Region</span>
                <input name="region" value={form.region} onChange={onChange} className="w-full rounded-xl border border-neutral-200 bg-[#fbf9f6] px-4 py-3 outline-none focus:border-[#C6A75E] focus:bg-white transition-colors" placeholder="e.g., Amhara, Oromia, etc." />
              </label>
              <label className="text-sm flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.05em] text-[#85796d] font-semibold">Technique</span>
                <input name="technique" value={form.technique} onChange={onChange} className="w-full rounded-xl border border-neutral-200 bg-[#fbf9f6] px-4 py-3 outline-none focus:border-[#C6A75E] focus:bg-white transition-colors" placeholder="e.g., Handwoven, Carved" />
              </label>
              <label className="text-sm md:col-span-2 flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.05em] text-[#85796d] font-semibold">Cultural Story & Significance</span>
                <textarea name="culturalContext" rows={4} value={form.culturalContext} onChange={onChange} className="w-full rounded-xl border border-neutral-200 bg-[#fbf9f6] px-4 py-3 outline-none focus:border-[#C6A75E] focus:bg-white transition-colors" placeholder="Share the heritage and story behind this piece..." />
              </label>
              <label className="text-sm md:col-span-2 flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.05em] text-[#85796d] font-semibold">Cultural Tags (Comma Separated)</span>
                <input name="culturalTags" value={form.culturalTags} onChange={onChange} className="w-full rounded-xl border border-neutral-200 bg-[#fbf9f6] px-4 py-3 outline-none focus:border-[#C6A75E] focus:bg-white transition-colors" placeholder="e.g., Traditional, Wedding, Handcrafted" />
              </label>
            </div>
          </div>

          {/* Physical Details */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-xs uppercase tracking-[0.08em] text-[#85796d] mb-5" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>Physical Details</h2>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="text-sm flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.05em] text-[#85796d] font-semibold">Materials (Comma Separated)</span>
                <input name="materials" value={form.materials} onChange={onChange} className="w-full rounded-xl border border-neutral-200 bg-[#fbf9f6] px-4 py-3 outline-none focus:border-[#C6A75E] focus:bg-white transition-colors" placeholder="e.g., Cotton, Leather, Clay" />
              </label>
              <label className="text-sm flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.05em] text-[#85796d] font-semibold">Dimensions</span>
                <input name="dimensions" value={form.dimensions} onChange={onChange} className="w-full rounded-xl border border-neutral-200 bg-[#fbf9f6] px-4 py-3 outline-none focus:border-[#C6A75E] focus:bg-white transition-colors" placeholder="e.g., 20x30cm" />
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2" style={{ fontFamily: 'Aeonik, Inter, sans-serif' }}>
            <button type="button" className="rounded-xl border border-neutral-200 bg-white px-6 py-3 text-sm font-medium text-[#5f554b] hover:bg-neutral-50 transition-colors" onClick={() => router.push(`/admin/sample/${id}`)}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-xl bg-[#1C1C1C] px-8 py-3 text-sm font-medium text-white transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 disabled:hover:translate-y-0">
              {saving ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

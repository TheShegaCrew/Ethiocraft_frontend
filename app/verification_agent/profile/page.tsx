'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DashboardHeader } from '@/components/shared/dashboard-header'
import { Footer } from '@/components/shared/footer'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'react-toastify'

export default function AgentProfilePage() {
  const { role } = useAuth()

  const rolePath = role
    ? (() => {
        const r = role.toLowerCase()

        if (
          r.includes('verification') ||
          r.includes('varification')
        ) {
          return 'agent'
        }

        return r
      })()
    : 'customer'

  const [isEditing, setIsEditing] = useState(false)

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    serviceRegions: '',
    phone: '',
    email: '',
  })

  const [errors, setErrors] = useState<{
    firstName?: string
    lastName?: string
    serviceRegions?: string
    phone?: string
    email?: string
  }>({})

  const [saving, setSaving] = useState(false)
  const [original, setOriginal] = useState<any>(null)

  
  // Password Modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] =
    useState(false)

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [passwordErrors, setPasswordErrors] = useState<{
    currentPassword?: string
    newPassword?: string
    confirmPassword?: string
  }>({})

  const [changingPassword, setChangingPassword] =
    useState(false)

  useEffect(() => {
    const base =
      (process.env.NEXT_PUBLIC_BASE_URL ?? '').replace(
        /\/$/,
        ''
      ) || 'http://localhost:4000/api/v1'

    async function load() {
      try {
        const res = await fetch(`${base}/users/me`, {
          credentials: 'include',
        })

        if (!res.ok) return

        const body = await res.json()
        const data = body.data || {}

        const firstName = data.firstName || ''
        const lastName = data.lastName || ''
        const serviceRegions =
          data.artisanProfile?.region || ''
        // Drop ID upload handling from the profile form
            setForm({
          firstName,
          lastName,
          serviceRegions,
          phone: data.phone || '',
          email: data.email || '',
        })

        setOriginal(data)
      } catch (e) {
        console.error(e)
      }
    }

    load()
  }, [role])

  const validateField = (field: string) => {
    const newErrors: any = {}

    if (
      field === 'firstName' ||
      field === 'all'
    ) {
      if (!form.firstName.trim()) {
        newErrors.firstName =
          'First name is required'
      }
    }

    if (
      field === 'lastName' ||
      field === 'all'
    ) {
      if (!form.lastName.trim()) {
        newErrors.lastName =
          'Last name is required'
      }
    }

    if (
      field === 'serviceRegions' ||
      field === 'all'
    ) {
      if (!form.serviceRegions.trim()) {
        newErrors.serviceRegions =
          'Service region is required'
      }
    }

    if (
      field === 'phone' ||
      field === 'all'
    ) {
      const phoneRegex =
        /^\+?[0-9\s\-]{7,20}$/

      if (!form.phone.trim()) {
        newErrors.phone = 'Phone is required'
      } else if (
        !phoneRegex.test(form.phone.trim())
      ) {
        newErrors.phone =
          'Enter a valid phone number'
      }
    }

    if (
      field === 'email' ||
      field === 'all'
    ) {
      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/

      if (!form.email.trim()) {
        newErrors.email = 'Email is required'
      } else if (
        !emailRegex.test(form.email.trim())
      ) {
        newErrors.email =
          'Enter a valid email'
      }
    }

    setErrors((s) => ({
      ...s,
      ...newErrors,
    }))

    return Object.keys(newErrors).length === 0
  }

  const handleCancel = () => {
    if (!original) return

    const firstName = original.firstName || ''
    const lastName = original.lastName || ''
    const serviceRegions =
      original.artisanProfile?.region || ''

    setForm({
      firstName,
      lastName,
      serviceRegions,
      phone: original.phone || '',
      email: original.email || '',
    })

    setErrors({})
  }

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    // ID upload removed from profile
  }

  const handleSave = async () => {
    if (!validateField('all')) {
      toast.error(
        'Please fix validation errors'
      )
      return
    }

    const base =
      (process.env.NEXT_PUBLIC_BASE_URL ?? '').replace(
        /\/$/,
        ''
      ) || 'http://localhost:4000/api/v1'

    const payload: any = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
    }

    // Only include artisan-specific fields when the user is an artisan
    if (
      role &&
      role.toLowerCase().includes('artisan')
    ) {
      payload.artisanProfile = {
        region: form.serviceRegions,
      }
    }

    try {
      setSaving(true)

      const res = await fetch(
        `${base}/users/me`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify(payload),
        }
      )

      if (!res.ok) {
        let msg = 'Save failed'

        try {
          const body = await res.json()
          msg = body.message || body.error || JSON.stringify(body)
        } catch (e) {
          try {
            const text = await res.text()
            if (text) msg = text
          } catch {}
        }

        console.error('Profile save error:', res.status, msg)
        toast.error(msg)
        return
      }

      toast.success('Profile updated successfully')
      setIsEditing(false)
    } catch {
      toast.error('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    const errs: any = {}

    if (!passwordForm.currentPassword) {
      errs.currentPassword =
        'Current password required'
    }

    if (
      !passwordForm.newPassword ||
      passwordForm.newPassword.length < 8
    ) {
      errs.newPassword =
        'Minimum 8 characters required'
    }

    if (
      passwordForm.newPassword !==
      passwordForm.confirmPassword
    ) {
      errs.confirmPassword =
        'Passwords do not match'
    }

    setPasswordErrors(errs)

    if (Object.keys(errs).length) return

    const base =
      (process.env.NEXT_PUBLIC_BASE_URL ?? '').replace(
        /\/$/,
        ''
      ) || 'http://localhost:4000/api/v1'

    try {
      setChangingPassword(true)

      const res = await fetch(
        `${base}/users/me/password`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            currentPassword:
              passwordForm.currentPassword,
            newPassword:
              passwordForm.newPassword,
          }),
        }
      )

      if (!res.ok) {
        throw new Error()
      }

      toast.success('Password changed')

      setIsPasswordModalOpen(false)

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch {
      toast.error(
        'Failed to change password'
      )
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader statusText="Real-time sync active" />

      <main className="flex-1 pt-28 md:pt-32">
        <div className="container mx-auto px-4 py-8">
          {/* Top */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">
                Agent Profile
              </h1>

              <p className="text-muted-foreground mt-1">
                Manage your profile information
              </p>
            </div>

            <Link
              href={`/verification_agent/dashboard`}
              className="text-sm text-muted-foreground hover:underline"
            >
              Back to dashboard
            </Link>
          </div>

          {/* Card */}
          <Card className="max-w-5xl mx-auto overflow-hidden border shadow-sm">
            {!isEditing ? (
              <>
                {/* Banner */}
                <div className="h-40 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />

                <div className="px-6 pb-8">
                  {/* Header */}
                  <div className="-mt-16 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                    <div className="flex items-end gap-5">
                      {/* Avatar */}
                      <div className="w-28 h-28 rounded-3xl bg-primary text-primary-foreground flex items-center justify-center text-4xl font-bold border-4 border-background shadow-lg">
                        {form.firstName?.charAt(0)}
                        {form.lastName?.charAt(0)}
                      </div>

                      <div className="pb-2">
                        <h2 className="text-3xl font-bold">
                          {form.firstName}{' '}
                          {form.lastName}
                        </h2>

                        <p className="text-muted-foreground mt-1">
                          Verification Agent
                        </p>

                        <div className="mt-3 flex gap-2">
                          <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                            Active
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() =>
                          setIsPasswordModalOpen(
                            true
                          )
                        }
                      >
                        Reset Password
                      </Button>

                      <Button
                        onClick={() =>
                          setIsEditing(true)
                        }
                      >
                        Edit Profile
                      </Button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-10">
                    <div className="rounded-2xl border p-5">
                      <p className="text-xs uppercase text-muted-foreground mb-2">
                        Email
                      </p>

                      <p className="font-medium">
                        {form.email || '-'}
                      </p>
                    </div>

                    <div className="rounded-2xl border p-5">
                      <p className="text-xs uppercase text-muted-foreground mb-2">
                        Phone
                      </p>

                      <p className="font-medium">
                        {form.phone || '-'}
                      </p>
                    </div>

                    <div className="rounded-2xl border p-5">
                      <p className="text-xs uppercase text-muted-foreground mb-2">
                        Service Region
                      </p>

                      <p className="font-medium">
                        {form.serviceRegions ||
                          '-'}
                      </p>
                    </div>

                    <div className="rounded-2xl border p-5">
                      <p className="text-xs uppercase text-muted-foreground mb-2">
                        Official ID
                      </p>

                      {original?.artisanProfile?.idUrl || original?.idUrl ? (
                        <a
                          href={original?.artisanProfile?.idUrl || original?.idUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline text-primary"
                        >
                          View Uploaded ID
                        </a>
                      ) : (
                        <p>No ID on file</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-6 md:p-8">
                {/* Edit Header */}
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold">
                      Edit Profile
                    </h2>

                    <p className="text-muted-foreground mt-1">
                      Update your profile
                      information
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    onClick={() => {
                      handleCancel()
                      setIsEditing(false)
                    }}
                  >
                    Cancel
                  </Button>
                </div>

                {/* Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      First Name
                    </label>

                    <input
                      type="text"
                      value={form.firstName}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          firstName:
                            e.target.value,
                        }))
                      }
                      className="w-full h-12 px-4 rounded-xl border bg-background"
                    />

                    {errors.firstName && (
                      <p className="text-xs text-destructive">
                        {
                          errors.firstName
                        }
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Last Name
                    </label>

                    <input
                      type="text"
                      value={form.lastName}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          lastName:
                            e.target.value,
                        }))
                      }
                      className="w-full h-12 px-4 rounded-xl border bg-background"
                    />

                    {errors.lastName && (
                      <p className="text-xs text-destructive">
                        {errors.lastName}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Email
                    </label>

                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          email:
                            e.target.value,
                        }))
                      }
                      className="w-full h-12 px-4 rounded-xl border bg-background"
                    />

                    {errors.email && (
                      <p className="text-xs text-destructive">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Phone
                    </label>

                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          phone:
                            e.target.value,
                        }))
                      }
                      className="w-full h-12 px-4 rounded-xl border bg-background"
                    />

                    {errors.phone && (
                      <p className="text-xs text-destructive">
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-medium">
                      Service Region(s)
                    </label>

                    <input
                      type="text"
                      value={
                        form.serviceRegions
                      }
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          serviceRegions:
                            e.target.value,
                        }))
                      }
                      className="w-full h-12 px-4 rounded-xl border bg-background"
                    />

                    {errors.serviceRegions && (
                      <p className="text-xs text-destructive">
                        {
                          errors.serviceRegions
                        }
                      </p>
                    )}
                  </div>
                </div>

                {/* Upload removed */}
                <div className="mt-8 rounded-2xl border border-dashed p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">Official ID</h3>
                      <p className="text-sm text-muted-foreground mt-1">ID upload disabled on this profile.</p>
                    </div>

                    <div className="flex items-center gap-4">
                      {original?.artisanProfile?.idUrl || original?.idUrl ? (
                        <a href={original?.artisanProfile?.idUrl || original?.idUrl} target="_blank" rel="noreferrer" className="underline text-primary text-sm">View Existing ID</a>
                      ) : (
                        <p className="text-sm text-muted-foreground">No ID on file</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3 mt-10">
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleCancel()
                      setIsEditing(false)
                    }}
                  >
                    Cancel
                  </Button>

                  <Button
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving
                      ? 'Saving...'
                      : 'Save Changes'}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>

      {/* Password Modal */}
      <Dialog
        open={isPasswordModalOpen}
        onOpenChange={setIsPasswordModalOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Change Password
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            <div>
              <label className="text-sm font-medium">
                Current Password
              </label>

              <input
                type="password"
                className="w-full h-12 px-4 rounded-xl border mt-2"
                value={
                  passwordForm.currentPassword
                }
                onChange={(e) =>
                  setPasswordForm((p) => ({
                    ...p,
                    currentPassword:
                      e.target.value,
                  }))
                }
              />

              {passwordErrors.currentPassword && (
                <p className="text-xs text-destructive mt-1">
                  {
                    passwordErrors.currentPassword
                  }
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">
                New Password
              </label>

              <input
                type="password"
                className="w-full h-12 px-4 rounded-xl border mt-2"
                value={
                  passwordForm.newPassword
                }
                onChange={(e) =>
                  setPasswordForm((p) => ({
                    ...p,
                    newPassword:
                      e.target.value,
                  }))
                }
              />

              {passwordErrors.newPassword && (
                <p className="text-xs text-destructive mt-1">
                  {
                    passwordErrors.newPassword
                  }
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">
                Confirm Password
              </label>

              <input
                type="password"
                className="w-full h-12 px-4 rounded-xl border mt-2"
                value={
                  passwordForm.confirmPassword
                }
                onChange={(e) =>
                  setPasswordForm((p) => ({
                    ...p,
                    confirmPassword:
                      e.target.value,
                  }))
                }
              />

              {passwordErrors.confirmPassword && (
                <p className="text-xs text-destructive mt-1">
                  {
                    passwordErrors.confirmPassword
                  }
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <DialogClose asChild>
                <Button variant="outline">
                  Cancel
                </Button>
              </DialogClose>

              <Button
                onClick={
                  handlePasswordChange
                }
                disabled={
                  changingPassword
                }
              >
                {changingPassword
                  ? 'Changing...'
                  : 'Change Password'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
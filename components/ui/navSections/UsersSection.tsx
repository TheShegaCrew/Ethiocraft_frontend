"use client"
import React, { useMemo, useState } from 'react';
import GenericSection from './GenericSection';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

// ─── Types ────────────────────────────────────────────────────────────────────

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const ROLES = ['CUSTOMER', 'ARTISAN', 'VERIFICATION_AGENT', 'ADMIN'] as const;

// ─── Validation ───────────────────────────────────────────────────────────────

function validateForm(f: FormState): FormErrors {
  const errs: FormErrors = {};
  if (!f.firstName.trim()) errs.firstName = 'First name is required.';
  else if (f.firstName.trim().length > 50) errs.firstName = 'Max 50 characters.';
  if (!f.lastName.trim()) errs.lastName = 'Last name is required.';
  else if (f.lastName.trim().length > 50) errs.lastName = 'Max 50 characters.';
  if (!f.email.trim()) errs.email = 'Email is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) errs.email = 'Invalid email address.';
  if (!f.password) errs.password = 'Password is required.';
  else if (f.password.length < 8) errs.password = 'Password must be at least 8 characters.';
  if (!f.role) errs.role = 'Role is required.';
  return errs;
}

const EMPTY_FORM: FormState = { firstName: '', lastName: '', email: '', phone: '', password: '', role: 'CUSTOMER' };

// ─── Field component ──────────────────────────────────────────────────────────

function Field({
  label, id, error, children,
}: { label: string; id: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs font-bold uppercase tracking-[0.1em] text-[#5f564e]">
        {label}
      </label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-500">
          <AlertCircle className="h-3 w-3 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-[#dfd3c1] bg-[#fdfbf7] px-3 py-2 text-sm text-[#2a211a] outline-none transition focus:border-[#C6A75E] focus:ring-2 focus:ring-[#C6A75E]/20 placeholder:text-[#b0a497]';

// ─── Create User Drawer ───────────────────────────────────────────────────────

function CreateUserDrawer({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [endpointMissing, setEndpointMissing] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setApiError(null);
  };

  const handleClose = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setApiError(null);
    setEndpointMissing(false);
    setSuccess(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateForm(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSubmitting(true);
    setApiError(null);
    setEndpointMissing(false);

    try {
      const res = await apiFetch('/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          phone: form.phone.trim() || undefined,
          role: form.role,
        }),
      });

      if (res.status === 404) {
        setEndpointMissing(true);
        return;
      }

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setApiError(json?.message || `Server responded with ${res.status}. Please try again.`);
        return;
      }

      setSuccess(true);
      onSuccess(json?.data ?? json);
      setTimeout(handleClose, 1800);
    } catch (err: any) {
      setApiError(err?.message || 'Network error. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={(v) => !v && handleClose()}>
      <DrawerContent className="fixed bottom-0 right-0 top-0 mt-0 h-full w-full max-w-md rounded-none border-l border-[#e8dece] bg-[#fffdf9]">
        <DrawerHeader className="flex items-center justify-between border-b border-[#e8dece] p-6">
          <DrawerTitle
            className="text-xl uppercase tracking-[0.04em]"
            style={{ fontFamily: '"Druk Wide", "Arial Black", sans-serif' }}
          >
            New User
          </DrawerTitle>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#6f6258]" onClick={handleClose}>
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Endpoint missing fallback */}
          {endpointMissing ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
              <p className="font-semibold mb-1">Endpoint unavailable</p>
              <p>
                The <code className="rounded bg-amber-100 px-1 font-mono text-xs">/admin/users</code> route
                returned 404. Verify the backend is running and this route is registered.
              </p>
            </div>
          ) : success ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <p className="text-base font-semibold text-[#3E2723]">User created successfully</p>
              <p className="text-sm text-[#85786d]">The action has been recorded in audit logs.</p>
            </div>
          ) : (
            <form id="create-user-form" onSubmit={handleSubmit} noValidate className="space-y-5">
              {/* API-level error banner */}
              {apiError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{apiError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Field label="First Name" id="cu-firstName" error={errors.firstName}>
                  <input
                    id="cu-firstName"
                    className={inputCls}
                    placeholder="Meklit"
                    value={form.firstName}
                    onChange={set('firstName')}
                    autoComplete="given-name"
                  />
                </Field>
                <Field label="Last Name" id="cu-lastName" error={errors.lastName}>
                  <input
                    id="cu-lastName"
                    className={inputCls}
                    placeholder="Tadesse"
                    value={form.lastName}
                    onChange={set('lastName')}
                    autoComplete="family-name"
                  />
                </Field>
              </div>

              <Field label="Email" id="cu-email" error={errors.email}>
                <input
                  id="cu-email"
                  type="email"
                  className={inputCls}
                  placeholder="user@example.com"
                  value={form.email}
                  onChange={set('email')}
                  autoComplete="email"
                />
              </Field>

              <Field label="Phone (optional)" id="cu-phone" error={errors.phone}>
                <input
                  id="cu-phone"
                  type="tel"
                  className={inputCls}
                  placeholder="+251 9XX XXX XXXX"
                  value={form.phone}
                  onChange={set('phone')}
                  autoComplete="tel"
                />
              </Field>

              <Field label="Password" id="cu-password" error={errors.password}>
                <input
                  id="cu-password"
                  type="password"
                  className={inputCls}
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={set('password')}
                  autoComplete="new-password"
                />
              </Field>

              <Field label="Role" id="cu-role" error={errors.role}>
                <select
                  id="cu-role"
                  className={inputCls}
                  value={form.role}
                  onChange={set('role')}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </Field>

              <p className="text-xs text-[#85786d] leading-relaxed">
                The new account will be created with <strong>ACTIVE</strong> status. This action is recorded
                in the platform audit log.
              </p>
            </form>
          )}
        </div>

        {!endpointMissing && !success && (
          <DrawerFooter className="border-t border-[#e8dece] p-6">
            <Button
              type="submit"
              form="create-user-form"
              disabled={submitting}
              className="w-full bg-[#3E2723] text-white hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating…
                </span>
              ) : (
                'Create User'
              )}
            </Button>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────────

export default function UsersSection(props: any) {
  const router = useRouter();
  const { role: adminRole } = useAuth();
  const { users = [], usersLoading = false, overview, overviewLoading } = props;

  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

  const isAdmin = adminRole === 'ADMIN';

  const rows = users.map((u: any) => {
    const name = u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown';
    const statusLabel = u.status || (u.isActive !== undefined ? (u.isActive ? 'Active' : 'Inactive') : '—');
    return {
      id: u.id || u._id || 'N/A',
      name,
      owner: u.email || u.role || '—',
      status: statusLabel,
      updated: u.updatedAt || u.createdAt ? new Date(u.updatedAt || u.createdAt).toLocaleString() : 'N/A',
    };
  });

  const displayRows = usersLoading
    ? [{ id: '—', name: 'Loading users…', owner: '—', status: '—', updated: '—' }]
    : rows.length
      ? rows
      : [{ id: '—', name: 'No users available', owner: '—', status: '—', updated: '—' }];

  const metrics = useMemo(() => {
    const loading = overviewLoading || usersLoading;
    const dash = overview;
    const totalUsers = loading ? '…' : Number(dash?.counts?.totalUsers ?? users.length);
    const activeUsers = loading ? '…' : users.filter((u: any) => u.status === 'ACTIVE' || u.isActive).length;
    const byRole = (dash?.users || []) as { key: string; count?: number }[];
    const customers = loading ? '…' : (byRole.find((r) => r.key === 'CUSTOMER')?.count ?? users.filter((u: any) => u.role === 'CUSTOMER').length);
    return [
      { label: 'Total Users', value: String(totalUsers), description: 'All roles — live from backend' },
      { label: 'Active Accounts', value: String(activeUsers), description: 'Status = ACTIVE' },
      { label: 'Customers', value: String(customers), description: 'Users with CUSTOMER role' },
    ];
  }, [overview, overviewLoading, users, usersLoading]);

  const handleViewDetails = (row: any) => {
    if (row.id === '—') return;
    setSelectedUser(row);
    setIsViewDrawerOpen(true);
  };

  const handleOpenFullRecord = () => {
    if (selectedUser?.id) {
      router.push(`/admin/users/${selectedUser.id}`);
      setIsViewDrawerOpen(false);
    }
  };

  const handleUserCreated = (newUser: any) => {
    props.showFeedback?.(`User ${newUser?.firstName ?? ''} ${newUser?.lastName ?? ''}`.trim() || 'New user created');
  };

  return (
    <>
      <GenericSection
        {...props}
        title="Users"
        description={props.sectionDescriptions?.Users}
        placeholderRows={displayRows}
        loading={usersLoading}
        showFeedback={props.showFeedback}
        setActiveNav={props.setActiveNav}
        onViewDetails={handleViewDetails}
        metrics={metrics}
        isPlaceholder={false}
        // Only admins see the "New User" button — pass undefined to hide it for non-admins
        onCreateNew={isAdmin ? () => setIsCreateDrawerOpen(true) : undefined}
      />

      {/* View User Drawer */}
      <Drawer open={isViewDrawerOpen} onOpenChange={setIsViewDrawerOpen}>
        <DrawerContent className="fixed bottom-0 right-0 top-0 mt-0 h-full w-full max-w-md rounded-none border-l border-[#e8dece] bg-[#fffdf9]">
          <DrawerHeader className="flex items-center justify-between border-b border-[#e8dece] p-6">
            <DrawerTitle className="text-xl uppercase tracking-[0.04em]" style={{ fontFamily: '"Druk Wide", "Arial Black", sans-serif' }}>
              User Overview
            </DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-[#6f6258]">
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-6">
            {selectedUser ? (
              <div className="space-y-6 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#85786d]">User ID</p>
                  <p className="mt-1 font-medium">{selectedUser.id}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#85786d]">Name</p>
                  <p className="mt-1 font-medium">{selectedUser.name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#85786d]">Email / Role</p>
                  <p className="mt-1 font-medium">{selectedUser.owner}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#85786d]">Status</p>
                  <p className="mt-1 font-medium">{selectedUser.status}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#85786d]">Member Since</p>
                  <p className="mt-1 font-medium">{selectedUser.updated}</p>
                </div>
              </div>
            ) : <p className="text-center text-[#85786d]">No user selected.</p>}
          </div>
          <DrawerFooter className="border-t border-[#e8dece] p-6">
            <Button onClick={handleOpenFullRecord} className="w-full bg-[#3E2723] text-white hover:opacity-90">Open Full Record</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Create User Drawer — admin only */}
      {isAdmin && (
        <CreateUserDrawer
          open={isCreateDrawerOpen}
          onClose={() => setIsCreateDrawerOpen(false)}
          onSuccess={handleUserCreated}
        />
      )}
    </>
  );
}

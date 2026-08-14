'use client';

import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { submitInquiry, type InquiryPayload } from '@/lib/strapi';
import { cn, whatsappLink } from '@/lib/utils';
import type { Global } from '@/types/strapi';

interface InquiryFormProps {
  /** Marks the enquiry so admins can triage it in Strapi. */
  type?: InquiryPayload['type'];
  /** documentId of the property being asked about, when applicable. */
  propertyId?: string;
  /** documentId of the service being asked about, when applicable. */
  serviceId?: string;
  /** Prefills the subject line, e.g. the property title. */
  subject?: string;
  /** Extra fields for the "request a property" flow. */
  showBudgetFields?: boolean;
  global?: Global | null;
  className?: string;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

export function InquiryForm({
  type = 'general',
  propertyId,
  serviceId,
  subject,
  showBudgetFields = false,
  global,
  className,
}: InquiryFormProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    setStatus('submitting');
    setErrorMessage('');

    try {
      await submitInquiry({
        name: String(data.get('name') ?? '').trim(),
        email: String(data.get('email') ?? '').trim(),
        phone: String(data.get('phone') ?? '').trim() || undefined,
        subject: subject ?? (String(data.get('subject') ?? '').trim() || undefined),
        message: String(data.get('message') ?? '').trim(),
        budget: String(data.get('budget') ?? '').trim() || undefined,
        preferredLocation: String(data.get('preferredLocation') ?? '').trim() || undefined,
        type,
        property: propertyId,
        service: serviceId,
      });

      setStatus('success');
      form.reset();
    } catch (error) {
      setStatus('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'Something went wrong. Please try again.'
      );
    }
  }

  if (status === 'success') {
    return (
      <div
        role="status"
        className={cn(
          'rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center',
          className
        )}
      >
        <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-600" aria-hidden="true" />
        <h3 className="text-lg text-emerald-900">Thank you for reaching out</h3>
        <p className="mt-2 text-sm text-emerald-800">
          We have received your enquiry and will get back to you shortly.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => setStatus('idle')}
            className="rounded-lg border border-emerald-300 px-5 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
          >
            Send another message
          </button>
          {global?.whatsappNumber || global?.phonePrimary ? (
            <a
              href={whatsappLink(global, 'Hello Sholem Properties, I just submitted an enquiry.')}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1fb855]"
            >
              Chat on WhatsApp
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  const submitting = status === 'submitting';

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)} noValidate={false}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" name="name" required autoComplete="name" />
        <Field label="Email address" name="email" type="email" required autoComplete="email" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone number" name="phone" type="tel" autoComplete="tel" />
        {subject ? (
          <Field label="Regarding" name="subject" defaultValue={subject} readOnly />
        ) : (
          <Field label="Subject" name="subject" />
        )}
      </div>

      {showBudgetFields ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Budget range" name="budget" placeholder="e.g. ₦50M – ₦80M" />
          <Field label="Preferred location" name="preferredLocation" placeholder="e.g. Lekki" />
        </div>
      ) : null}

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-brand-800">
          Message <span className="text-red-500">*</span>
        </span>
        <textarea
          name="message"
          required
          rows={5}
          placeholder="Tell us what you are looking for…"
          className="w-full rounded-lg border border-brand-200 px-3.5 py-2.5 text-sm placeholder:text-brand-400 focus:border-accent-500 focus:outline-none"
        />
      </label>

      {status === 'error' ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent-500 px-6 py-3 text-sm font-semibold text-brand-950 transition-colors hover:bg-accent-400 disabled:opacity-60 sm:w-auto"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Sending…
          </>
        ) : (
          'Send enquiry'
        )}
      </button>

      <p className="text-xs text-brand-500">
        By submitting this form you agree to be contacted regarding your enquiry.
      </p>
    </form>
  );
}

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
}

function Field({ label, name, required, ...props }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-brand-800">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </span>
      <input
        name={name}
        required={required}
        className="w-full rounded-lg border border-brand-200 px-3.5 py-2.5 text-sm placeholder:text-brand-400 read-only:bg-brand-50 read-only:text-brand-500 focus:border-accent-500 focus:outline-none"
        {...props}
      />
    </label>
  );
}

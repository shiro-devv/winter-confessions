import { AppError } from '../db/errors';
import { supabase } from '../lib/supabase';
import { cleanText } from './validation';
import { getVisitorId } from './visitor';

/**
 * The fixed set of reasons someone can pick when reporting a confession. Keep
 * these in sync with the `reports_reason_check` constraint in the database
 * (`db/supabase.sql`, `db/migrations/20261115_reports.sql`).
 */
export const REPORT_REASONS = [
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'hate', label: 'Hate speech or discrimination' },
  { value: 'sexual', label: 'Sexual content' },
  { value: 'violence', label: 'Violence or threats' },
  { value: 'self_harm', label: 'Self-harm or suicide' },
  { value: 'spam', label: 'Spam or advertising' },
  { value: 'other', label: 'Something else' },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]['value'];

/** Matches the `reports_details_length` check in the database. */
export const REPORT_DETAILS_MAX = 500;

export interface ReportInput {
  confessionId: string;
  reason: ReportReason;
  /** Optional free text, at most REPORT_DETAILS_MAX characters. */
  details?: string;
}

/**
 * Flags a confession for the operator to review. Works on public confessions
 * and on confessions you received; reports are never readable through the API.
 * Rate limited to 5 per browser per hour by the database.
 */
export async function reportConfession({
  confessionId,
  reason,
  details,
}: ReportInput): Promise<void> {
  const cleaned = details ? cleanText(details) : '';
  if (cleaned.length > REPORT_DETAILS_MAX) {
    throw new AppError(
      'validation',
      `Notes can be up to ${REPORT_DETAILS_MAX} characters. Please shorten yours.`,
    );
  }

  const { error } = await supabase.rpc('report_confession', {
    p_confession: confessionId,
    p_reason: reason,
    p_details: cleaned || null,
    p_fp: getVisitorId(),
  });

  if (!error) return;

  const message = error.message.toLowerCase();
  if (message.includes('rate_limited')) {
    throw new AppError(
      'rate_limited',
      'You have sent several reports recently. Please wait an hour before reporting again.',
    );
  }
  if (message.includes('invalid_details')) {
    throw new AppError(
      'validation',
      `Notes can be up to ${REPORT_DETAILS_MAX} characters. Please shorten yours.`,
    );
  }
  if (message.includes('invalid_reason')) {
    throw new AppError('validation', 'Please choose a reason for your report.');
  }
  if (message.includes('invalid_visitor')) {
    throw new AppError(
      'validation',
      'We could not verify this browser. Try again in a normal window, or reload the page.',
    );
  }
  if (message.includes('not_found')) {
    throw new AppError('not_found', 'That confession is no longer available to report.');
  }
  throw new AppError('storage', 'We could not send your report. Please try again.');
}

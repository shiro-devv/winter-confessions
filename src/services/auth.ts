import type { AuthError } from '@supabase/supabase-js';
import { AppError } from '../db/errors';
import { supabase } from '../lib/supabase';
import {
  LIMITS,
  cleanText,
  normalizeEmail,
  normalizeUsername,
  validateEmail,
  validatePassword,
  validateUsername,
} from './validation';

/** A public account profile, mirrored from the `profiles` table. */
export interface Profile {
  id: string;
  username: string;
  displayName: string;
  bio: string;
}

const PROFILE_COLUMNS = 'id, username, display_name, bio';

interface ProfileRow {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
}

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio ?? '',
  };
}

/** Turns a Supabase auth error into a message we are happy to show. */
function authError(error: AuthError): AppError {
  const message = error.message.toLowerCase();

  if (
    error.status === 429 ||
    error.code === 'over_email_send_rate_limit' ||
    message.includes('rate limit')
  ) {
    return new AppError(
      'rate_limited',
      'Too many confirmation emails have been sent. Wait about an hour, then try again.',
    );
  }
  if (error.code === 'invalid_credentials') {
    return new AppError('unauthorized', 'That email and password do not match.');
  }
  if (error.code === 'email_not_confirmed') {
    return new AppError('unauthorized', 'Confirm your email first. Open the link we sent you, then log in.');
  }
  if (error.code === 'user_already_exists' || error.code === 'email_exists') {
    return new AppError('conflict', 'An account with that email already exists. Log in instead.');
  }
  if (error.code === 'weak_password') {
    return new AppError('validation', error.message);
  }
  if (error.code === 'signup_disabled') {
    return new AppError('forbidden', 'New accounts are turned off right now. Please try again later.');
  }
  if (message.includes('database error saving new user')) {
    return new AppError(
      'conflict',
      'We could not create that account. The username may have just been taken. Try a different one.',
    );
  }
  return new AppError('validation', error.message);
}

/** Loads the public profile that belongs to an auth user. */
export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new AppError('storage', 'We could not load your profile. Please refresh the page.');
  return data ? toProfile(data as ProfileRow) : null;
}

/** Finds the public profile for a username, or undefined when nobody owns it. */
export async function findUserByUsername(username: string): Promise<Profile | undefined> {
  const normalized = normalizeUsername(username);
  if (!normalized) return undefined;

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('username', normalized)
    .maybeSingle();

  if (error) throw new AppError('storage', 'We could not load that profile. Please try again.');
  return data ? toProfile(data as ProfileRow) : undefined;
}

interface SignUpInput {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

export interface SignUpResult {
  /** True when Supabase sent a confirmation email instead of signing the person in. */
  needsConfirmation: boolean;
  username: string;
}

export async function signUp({
  username,
  email,
  password,
  displayName,
}: SignUpInput): Promise<SignUpResult> {
  const usernameError = validateUsername(username);
  if (usernameError) throw new AppError('validation', usernameError);

  const emailError = validateEmail(email);
  if (emailError) throw new AppError('validation', emailError);

  const passwordError = validatePassword(password);
  if (passwordError) throw new AppError('validation', passwordError);

  const normalizedUsername = normalizeUsername(username);
  const normalizedEmail = normalizeEmail(email);
  const cleanDisplayName =
    cleanText(displayName ?? '').slice(0, LIMITS.displayNameMax) || normalizedUsername;

  // Give a helpful answer before creating the auth user. The unique index on
  // profiles.username is still the real guard against two tabs racing.
  const existing = await findUserByUsername(normalizedUsername);
  if (existing) {
    throw new AppError(
      'conflict',
      `@${normalizedUsername} is already taken. Try adding a number or a dot.`,
    );
  }

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: { username: normalizedUsername, display_name: cleanDisplayName },
      emailRedirectTo: `${window.location.origin}/auth?mode=login`,
    },
  });

  if (error) {
    if (error.message.includes('profiles_username_key') || error.code === '23505') {
      throw new AppError(
        'conflict',
        `@${normalizedUsername} was just taken. Try a different username.`,
      );
    }
    throw authError(error);
  }

  return { needsConfirmation: !data.session, username: normalizedUsername };
}

export async function logIn(email: string, password: string): Promise<Profile> {
  const emailError = validateEmail(email);
  if (emailError) throw new AppError('validation', emailError);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password,
  });

  if (error) throw authError(error);

  const profile = data.user ? await fetchProfile(data.user.id) : null;
  if (!profile) {
    throw new AppError(
      'not_found',
      'We could not find a profile for that account. Please contact support.',
    );
  }
  return profile;
}

export async function logOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new AppError('storage', 'We could not log you out. Please try again.');
}

export async function updateProfile(
  userId: string,
  patch: { displayName: string; bio: string },
): Promise<Profile> {
  const displayName = cleanText(patch.displayName).slice(0, LIMITS.displayNameMax);
  if (!displayName) {
    throw new AppError('validation', 'Display name cannot be empty. Add the name friends know you by.');
  }

  const bio = cleanText(patch.bio);
  if (bio.length > LIMITS.bioMax) {
    throw new AppError('validation', `Your bio can be up to ${LIMITS.bioMax} characters. Please shorten it.`);
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ display_name: displayName, bio })
    .eq('id', userId)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) throw new AppError('storage', 'We could not save your profile. Please try again.');
  return toProfile(data as ProfileRow);
}

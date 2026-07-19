import { z } from 'zod';

import { yearsBetween } from '@/lib/dates';

/**
 * Contrat du service d'authentification (E1-8, D2) : le compte est créé
 * EN FIN d'onboarding — jusque-là tout vit en local, au signup les données
 * sont rattachées (onboarding-store.attachToAccount). L'implémentation
 * Supabase Auth sera branchée quand le projet cloud existera (gate G5) ;
 * d'ici là, le mock ci-dessous porte le même contrat.
 */

export const MIN_ACCOUNT_AGE_YEARS = 16;

export type AuthProvider = 'email' | 'apple' | 'google';

export type AuthUser = {
  id: string;
  provider: AuthProvider;
  email?: string;
};

export type SignUpRefusal =
  | 'under_min_age' // D12 : re-vérifié à la création de compte
  | 'birth_date_required'
  | 'invalid_email'
  | 'weak_password'
  | 'email_already_used';

export type SignUpResult = { ok: true; user: AuthUser } | { ok: false; reason: SignUpRefusal };

export type SignUpParams = {
  email: string;
  password: string;
  /** Date de naissance ISO `YYYY-MM-DD` — contrôle 16+ (D12). */
  birthDate?: string;
  /** Date du jour ISO `YYYY-MM-DD` — jamais lue de l'horloge par le service. */
  today: string;
};

export type AuthService = {
  signUpWithEmail: (params: SignUpParams) => Promise<SignUpResult>;
  signInWithApple: () => Promise<AuthUser>;
  signInWithGoogle: () => Promise<AuthUser>;
  signOut: () => Promise<void>;
  currentUser: () => AuthUser | undefined;
};

const emailSchema = z.string().email();

const MIN_PASSWORD_LENGTH = 8;

/** Contrôle d'âge partagé (D12) — `false` si la date manque ou < 16 ans. */
export function isOldEnoughForAccount(birthDate: string | undefined, today: string): boolean {
  if (birthDate === undefined) {
    return false;
  }
  return yearsBetween(birthDate, today) >= MIN_ACCOUNT_AGE_YEARS;
}

/**
 * Implémentation factice en mémoire, même contrat que la future
 * implémentation Supabase (G5). Les connexions Apple/Google simulent un
 * succès immédiat — les vrais flux natifs arrivent avec le projet cloud.
 */
export function createMockAuthService(): AuthService {
  const usersByEmail = new Map<string, AuthUser>();
  let nextId = 1;
  let current: AuthUser | undefined;

  const makeUser = (provider: AuthProvider, email?: string): AuthUser => {
    const user: AuthUser = { id: `mock-user-${nextId}`, provider, email };
    nextId += 1;
    return user;
  };

  return {
    signUpWithEmail: (params) => {
      if (params.birthDate === undefined) {
        return Promise.resolve({ ok: false, reason: 'birth_date_required' });
      }
      if (!isOldEnoughForAccount(params.birthDate, params.today)) {
        return Promise.resolve({ ok: false, reason: 'under_min_age' });
      }
      const email = params.email.trim().toLowerCase();
      if (!emailSchema.safeParse(email).success) {
        return Promise.resolve({ ok: false, reason: 'invalid_email' });
      }
      if (params.password.length < MIN_PASSWORD_LENGTH) {
        return Promise.resolve({ ok: false, reason: 'weak_password' });
      }
      if (usersByEmail.has(email)) {
        return Promise.resolve({ ok: false, reason: 'email_already_used' });
      }
      const user = makeUser('email', email);
      usersByEmail.set(email, user);
      current = user;
      return Promise.resolve({ ok: true, user });
    },

    signInWithApple: () => {
      current = makeUser('apple');
      return Promise.resolve(current);
    },

    signInWithGoogle: () => {
      current = makeUser('google');
      return Promise.resolve(current);
    },

    signOut: () => {
      current = undefined;
      return Promise.resolve();
    },

    currentUser: () => current,
  };
}

/** Instance partagée par l'app — à remplacer par l'implémentation Supabase (G5). */
let sharedAuthService: AuthService | undefined;

export function getAuthService(): AuthService {
  sharedAuthService ??= createMockAuthService();
  return sharedAuthService;
}

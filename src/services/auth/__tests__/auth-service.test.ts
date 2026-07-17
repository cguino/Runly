import { createMockAuthService, isOldEnoughForAccount } from '../auth-service';

const TODAY = '2026-07-17';

describe('createMockAuthService — création de compte en fin d’onboarding (E1-8, D2)', () => {
  it('crée un compte email et le connecte', async () => {
    const service = createMockAuthService();
    const result = await service.signUpWithEmail({
      email: 'Marc@Exemple.fr',
      password: 'correct-horse',
      birthDate: '1990-04-12',
      today: TODAY,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('signup attendu');
    }
    expect(result.user.provider).toBe('email');
    expect(result.user.email).toBe('marc@exemple.fr');
    expect(service.currentUser()).toEqual(result.user);
  });

  it('re-vérifie l’âge minimum 16 ans à la création de compte (D12)', async () => {
    const service = createMockAuthService();
    const underage = await service.signUpWithEmail({
      email: 'jeune@exemple.fr',
      password: 'correct-horse',
      birthDate: '2012-01-01',
      today: TODAY,
    });
    expect(underage).toEqual({ ok: false, reason: 'under_min_age' });

    const missing = await service.signUpWithEmail({
      email: 'sans-date@exemple.fr',
      password: 'correct-horse',
      today: TODAY,
    });
    expect(missing).toEqual({ ok: false, reason: 'birth_date_required' });
    expect(service.currentUser()).toBeUndefined();
  });

  it('refuse e-mail invalide, mot de passe faible et e-mail déjà utilisé', async () => {
    const service = createMockAuthService();
    const base = { password: 'correct-horse', birthDate: '1990-04-12', today: TODAY };

    expect(await service.signUpWithEmail({ ...base, email: 'pas-un-email' })).toEqual({
      ok: false,
      reason: 'invalid_email',
    });
    expect(
      await service.signUpWithEmail({ ...base, email: 'marc@exemple.fr', password: 'court' }),
    ).toEqual({ ok: false, reason: 'weak_password' });

    await service.signUpWithEmail({ ...base, email: 'marc@exemple.fr' });
    expect(await service.signUpWithEmail({ ...base, email: 'MARC@exemple.fr' })).toEqual({
      ok: false,
      reason: 'email_already_used',
    });
  });

  it('connexions Apple et Google (mock) + déconnexion', async () => {
    const service = createMockAuthService();
    const apple = await service.signInWithApple();
    expect(apple.provider).toBe('apple');
    expect(service.currentUser()).toEqual(apple);

    const google = await service.signInWithGoogle();
    expect(google.provider).toBe('google');
    expect(google.id).not.toBe(apple.id);

    await service.signOut();
    expect(service.currentUser()).toBeUndefined();
  });
});

describe('isOldEnoughForAccount (D12)', () => {
  it('16 ans révolus le jour J', () => {
    expect(isOldEnoughForAccount('2010-07-17', TODAY)).toBe(true);
    expect(isOldEnoughForAccount('2010-07-18', TODAY)).toBe(false);
    expect(isOldEnoughForAccount(undefined, TODAY)).toBe(false);
  });
});

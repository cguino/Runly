import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';

import type { AuthUser, SignUpRefusal } from '@/services';
import { getAuthService, isOldEnoughForAccount } from '@/services';
import { Button, Card, colors, TextField, typography } from '@/ui';

import { useOnboardingStore } from './onboarding-store';
import { parseFrDate } from './parse';
import { StepScreen } from './StepScreen';

type AccountError = SignUpRefusal | 'provider_failed';

/**
 * OB5 — Création de compte en FIN d'onboarding (E1-8, D2) : jusqu'ici tout
 * vit en local ; au signup, `attachToAccount` rattache les données sans
 * perte (sync multi-device, D14). Étape non skippable — mais si
 * l'utilisateur ferme l'app, il reprend ici (currentStep). L'âge 16+ est
 * re-vérifié ici (D12), par le service d'auth.
 */
export function AccountStepScreen() {
  const { t } = useTranslation();
  const profileBirthDate = useOnboardingStore((state) => state.profile.birthDate);
  const attachToAccount = useOnboardingStore((state) => state.attachToAccount);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthDateRaw, setBirthDateRaw] = useState('');
  const [error, setError] = useState<AccountError | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const needsBirthDate = profileBirthDate === undefined;
  const today = () => new Date().toISOString().slice(0, 10);

  const resolveBirthDate = (): string | undefined =>
    profileBirthDate ?? parseFrDate(birthDateRaw);

  const onSignedUp = (user: AuthUser) => {
    attachToAccount(user.id);
    router.push('/onboarding/restitution');
  };

  const signUpWithEmail = async () => {
    setBusy(true);
    try {
      const result = await getAuthService().signUpWithEmail({
        email,
        password,
        birthDate: resolveBirthDate(),
        today: today(),
      });
      if (result.ok) {
        setError(undefined);
        onSignedUp(result.user);
      } else {
        setError(result.reason);
      }
    } finally {
      setBusy(false);
    }
  };

  const signUpWithProvider = async (provider: 'apple' | 'google') => {
    // D12 : même contrôle d'âge pour les connexions Apple/Google.
    const birthDate = resolveBirthDate();
    if (birthDate === undefined) {
      setError('birth_date_required');
      return;
    }
    if (!isOldEnoughForAccount(birthDate, today())) {
      setError('under_min_age');
      return;
    }
    setBusy(true);
    try {
      const service = getAuthService();
      const user =
        provider === 'apple' ? await service.signInWithApple() : await service.signInWithGoogle();
      setError(undefined);
      onSignedUp(user);
    } catch {
      setError('provider_failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <StepScreen title={t('onboarding.compte.title')} intro={t('onboarding.compte.body')}>
      <Card>
        <Text style={styles.caption}>{t('onboarding.compte.localNote')}</Text>
      </Card>

      <TextField
        value={email}
        onChangeText={setEmail}
        label={t('onboarding.compte.email')}
        placeholder={t('onboarding.compte.emailPlaceholder')}
        keyboardType="email-address"
      />
      <TextField
        value={password}
        onChangeText={setPassword}
        label={t('onboarding.compte.password')}
        placeholder={t('onboarding.compte.passwordHint')}
        secureTextEntry
      />
      {needsBirthDate ? (
        <>
          <TextField
            value={birthDateRaw}
            onChangeText={setBirthDateRaw}
            label={t('onboarding.compte.birthDate')}
            placeholder={t('onboarding.compte.birthDatePlaceholder')}
            keyboardType="numbers-and-punctuation"
          />
          <Text style={styles.caption}>{t('onboarding.compte.birthDateHint')}</Text>
        </>
      ) : null}

      {error !== undefined ? (
        <Text style={styles.warn}>{t(`onboarding.compte.errors.${error}`)}</Text>
      ) : null}

      <Button label={t('onboarding.compte.signUp')} onPress={signUpWithEmail} disabled={busy} />
      <Text style={styles.caption}>{t('onboarding.compte.orProviders')}</Text>
      <Button
        label={t('onboarding.compte.apple')}
        onPress={() => signUpWithProvider('apple')}
        variant="ghost"
        disabled={busy}
      />
      <Button
        label={t('onboarding.compte.google')}
        onPress={() => signUpWithProvider('google')}
        variant="ghost"
        disabled={busy}
      />
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  caption: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
    lineHeight: 17,
  },
  warn: {
    color: colors.warn,
    fontSize: typography.body.fontSize,
    lineHeight: 22,
  },
});

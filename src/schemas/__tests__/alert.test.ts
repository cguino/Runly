import { alertSchema } from '../alert';

describe('alertSchema (aligné sur la table `alerts`)', () => {
  const valid = {
    alertType: 'pic_charge',
    triggerContext: { acwr: 1.38, loadIncreasePct: 38 },
    proposedAction: { kind: 'substitution_seance', sessionRef: 'abc' },
    createdAt: '2026-07-16T18:00:00+02:00',
  };

  it('accepte une alerte pic complète, décision optionnelle', () => {
    const parsed = alertSchema.parse(valid);
    expect(parsed.alertType).toBe('pic_charge');
    expect(parsed.userDecision).toBeUndefined();
  });

  it('accepte une décision tracée avec son timestamp', () => {
    const parsed = alertSchema.parse({
      ...valid,
      userDecision: 'kept_plan',
      decidedAt: '2026-07-16T18:05:00+02:00',
    });
    expect(parsed.userDecision).toBe('kept_plan');
  });

  it('applique le défaut sur le contexte manquant', () => {
    const { triggerContext, ...rest } = valid;
    expect(alertSchema.parse(rest).triggerContext).toEqual({});
  });

  it('rejette un type ou une décision hors enum (contrainte SQL)', () => {
    expect(alertSchema.safeParse({ ...valid, alertType: 'blessure' }).success).toBe(false);
    expect(alertSchema.safeParse({ ...valid, userDecision: 'ignored' }).success).toBe(false);
    expect(
      alertSchema.safeParse({ ...valid, proposedAction: { kind: 'interdire' } }).success,
    ).toBe(false);
  });
});

import type { JournalEntry } from '@/features/journal';
import { useJournalStore } from '@/features/journal';
import { addDays } from '@/lib/dates';
import type { Goal } from '@/schemas';

import { useLoadStore } from '../../load/load-store';
import { useOnboardingStore } from '../../onboarding/onboarding-store';
import { selectActiveSessions, usePlanStore } from '../plan-store';

/**
 * Store du plan (E8) : orchestration — la logique métier (avertissements,
 * recalcul prévisionnel, semaine type) est testée dans `src/training-engine`.
 * Ici : branchement jauge, bascule plan ↔ semaine type sans perte de
 * données, déplacement/ajout. Temps injecté partout (déterminisme).
 */

const TODAY = '2026-07-16'; // jeudi — semaine du lundi 13/07
const GOAL: Goal = {
  raceDistance: '10k',
  raceDate: addDays(TODAY, 70),
  ambition: 'finir',
  status: 'active',
};

function entry(date: string, durationMin: number, rpe: number): JournalEntry {
  return {
    workout: { source: 'manuel', startedAt: `${date}T08:00:00+02:00`, durationS: durationMin * 60 },
    feedback: { rpe, pains: [], at: `${date}T09:00:00+02:00` },
  };
}

/** 8 semaines régulières : une séance par jour (durée × RPE paramétrables). */
function steadyEntries(durationMin: number, rpe: number): JournalEntry[] {
  const entries: JournalEntry[] = [];
  for (let i = 55; i >= 0; i -= 1) {
    entries.push(entry(addDays(TODAY, -i), durationMin, rpe));
  }
  return entries;
}

function resetStores(entries: JournalEntry[] = []) {
  useJournalStore.setState({ entries });
  useLoadStore.setState({
    current: undefined,
    forecast: undefined,
    plannedLoads: [],
    nextIntenseSessionRef: undefined,
    activeAlert: undefined,
    decidedAlerts: [],
    lastLoadAlertAt: undefined,
  });
  useOnboardingStore.getState().reset();
  useOnboardingStore.setState({
    context: { sessionsPerWeek: 3, preferredDays: [1, 3, 5], weeklyVolumeKm: 25 },
  });
  usePlanStore.getState().reset();
}

describe('usePlanStore — hydratation & jauge prévisionnelle', () => {
  it('reprend objectif + plan de l’onboarding, assigne des ids et alimente la jauge', () => {
    resetStores(steadyEntries(60, 5));
    const submitted = useOnboardingStore
      .getState()
      .submitGoal({ goal: GOAL, today: TODAY, vmaKmh: undefined });
    expect(submitted.status).toBe('plan');

    usePlanStore.getState().hydrateFromOnboarding(TODAY);
    const { goal, plan } = usePlanStore.getState();
    expect(goal?.raceDistance).toBe('10k');
    expect(plan).toBeDefined();
    const sessions = selectActiveSessions(usePlanStore.getState());
    expect(sessions.every((s) => typeof s.id === 'string')).toBe(true);
    // Les charges planifiées sont poussées vers la jauge (E7-3).
    expect(useLoadStore.getState().plannedLoads.length).toBeGreaterThan(0);
    expect(useLoadStore.getState().forecast).toBeDefined();
  });

  it('sans objectif → mode semaine type, pas de plan', () => {
    resetStores();
    usePlanStore.getState().hydrateFromOnboarding(TODAY);
    expect(usePlanStore.getState().plan).toBeUndefined();
    expect(selectActiveSessions(usePlanStore.getState())).toEqual([]);
  });
});

describe('usePlanStore — déplacer une séance (E8-3)', () => {
  function setupPlanMode() {
    resetStores(steadyEntries(60, 5));
    useOnboardingStore.getState().submitGoal({ goal: GOAL, today: TODAY, vmaKmh: undefined });
    usePlanStore.getState().hydrateFromOnboarding(TODAY);
  }

  it('previewMove : avertissement sur enchaînement déconseillé + impact jauge', () => {
    setupPlanMode();
    const sessions = selectActiveSessions(usePlanStore.getState());
    const quality = sessions.find(
      (s) => s.sessionType !== 'ef' && s.sessionType !== 'sortie_longue',
    );
    const longRun = sessions.find((s) => s.sessionType === 'sortie_longue');
    expect(quality).toBeDefined();
    expect(longRun).toBeDefined();
    // Déplacer la qualité la veille de la sortie longue → avertissement, jamais blocage.
    const preview = usePlanStore
      .getState()
      .previewMove(quality!.id!, addDays(longRun!.scheduledDate, -1), TODAY);
    expect(preview?.warnings).toContain('quality_before_long_run');
    expect(preview?.forecastBefore).toBeDefined();
    expect(preview?.forecastAfter).toBeDefined();
  });

  it('moveSession : la séance est déplacée (statut moved) et la jauge recalculée', () => {
    setupPlanMode();
    const before = useLoadStore.getState().plannedLoads;
    const upcoming = selectActiveSessions(usePlanStore.getState()).filter(
      (s) => s.scheduledDate > TODAY,
    );
    const target = upcoming[0]!;
    const newDate = addDays(TODAY, 30); // hors de l'horizon J+7
    usePlanStore.getState().moveSession(target.id!, newDate, TODAY);

    const moved = selectActiveSessions(usePlanStore.getState()).find((s) => s.id === target.id);
    expect(moved?.scheduledDate).toBe(newDate);
    expect(moved?.status).toBe('moved');
    const after = useLoadStore.getState().plannedLoads;
    expect(after).not.toEqual(before);
  });
});

describe('usePlanStore — séance spontanée (E8-4)', () => {
  it('dans la zone (ou en dessous) → l’app se tait', () => {
    resetStores(steadyEntries(60, 5));
    usePlanStore.getState().hydrateFromOnboarding(TODAY);
    const { lightening } = usePlanStore.getState().addSpontaneousSession({
      sessionType: 'ef',
      date: addDays(TODAY, 1),
      today: TODAY,
    });
    expect(lightening).toBe(false);
    expect(selectActiveSessions(usePlanStore.getState())).toHaveLength(1);
  });

  it('charge projetée en pic (sortie de zone) → suggestion d’allègement', () => {
    // Habitude très légère : une grosse séance ajoutée fait sortir la projection.
    resetStores(steadyEntries(15, 2));
    usePlanStore.getState().hydrateFromOnboarding(TODAY);
    const { lightening } = usePlanStore.getState().addSpontaneousSession({
      sessionType: 'seuil',
      date: addDays(TODAY, 1),
      today: TODAY,
    });
    expect(lightening).toBe(true);
  });
});

describe('usePlanStore — semaine type manuelle (E8-6)', () => {
  it('addTemplateEntry matérialise la semaine courante (jours restants uniquement)', () => {
    resetStores();
    usePlanStore.getState().hydrateFromOnboarding(TODAY);
    usePlanStore.getState().addTemplateEntry({ day: 5, sessionType: 'sortie_longue' }, TODAY); // samedi à venir
    usePlanStore.getState().addTemplateEntry({ day: 0, sessionType: 'ef' }, TODAY); // lundi passé
    const sessions = selectActiveSessions(usePlanStore.getState());
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.sessionType).toBe('sortie_longue');
    expect(sessions[0]?.scheduledDate).toBe('2026-07-18');
    expect(usePlanStore.getState().weekTemplate).toHaveLength(2);
  });

  it('removeTemplateEntry retire l’entrée et sa séance à venir', () => {
    resetStores();
    usePlanStore.getState().hydrateFromOnboarding(TODAY);
    usePlanStore.getState().addTemplateEntry({ day: 5, sessionType: 'sortie_longue' }, TODAY);
    const index = usePlanStore.getState().weekTemplate.findIndex((e) => e.day === 5);
    usePlanStore.getState().removeTemplateEntry(index, TODAY);
    expect(usePlanStore.getState().weekTemplate).toHaveLength(0);
    expect(selectActiveSessions(usePlanStore.getState())).toHaveLength(0);
  });

  it('ensureCurrentWeek ne matérialise jamais deux fois la même semaine', () => {
    resetStores();
    usePlanStore.getState().hydrateFromOnboarding(TODAY);
    usePlanStore.getState().addTemplateEntry({ day: 5, sessionType: 'ef' }, TODAY);
    usePlanStore.getState().ensureCurrentWeek(TODAY);
    usePlanStore.getState().ensureCurrentWeek(addDays(TODAY, 1));
    expect(selectActiveSessions(usePlanStore.getState())).toHaveLength(1);
  });
});

describe('usePlanStore — objectif dans l’onglet Plan (E8-7)', () => {
  it('bascule semaine type → plan généré → suppression : AUCUNE perte de données', () => {
    resetStores(steadyEntries(60, 5));
    usePlanStore.getState().hydrateFromOnboarding(TODAY);

    // 1. L'utilisateur compose sa semaine type.
    usePlanStore.getState().addTemplateEntry({ day: 5, sessionType: 'sortie_longue' }, TODAY);
    const template = usePlanStore.getState().weekTemplate;
    const manualBefore = usePlanStore.getState().manualSessions;
    const journalBefore = useJournalStore.getState().entries;
    expect(manualBefore).toHaveLength(1);

    // 2. Il crée un objectif → plan généré ; la semaine type survit.
    const created = usePlanStore.getState().createOrUpdateGoal({ goal: GOAL, today: TODAY });
    expect(created.status).toBe('plan');
    expect(usePlanStore.getState().plan).toBeDefined();
    expect(usePlanStore.getState().weekTemplate).toEqual(template);
    expect(usePlanStore.getState().manualSessions).toEqual(manualBefore);

    // 3. Il supprime l'objectif → plan archivé (jamais effacé), semaine type intacte.
    usePlanStore.getState().deleteGoal(TODAY);
    const state = usePlanStore.getState();
    expect(state.goal).toBeUndefined();
    expect(state.plan).toBeUndefined();
    expect(state.archivedPlans).toHaveLength(1);
    expect(state.archivedPlans[0]?.status).toBe('abandoned');
    expect(state.weekTemplate).toEqual(template);
    expect(state.manualSessions).toEqual(manualBefore);
    expect(useJournalStore.getState().entries).toEqual(journalBefore);
    // La jauge repasse sur les charges de la semaine type.
    expect(useLoadStore.getState().plannedLoads.map((l) => l.scheduledDate)).toEqual([
      '2026-07-18',
    ]);
  });

  it('modifier l’objectif remplace le plan et archive l’ancien (superseded)', () => {
    resetStores(steadyEntries(60, 5));
    usePlanStore.getState().hydrateFromOnboarding(TODAY);
    usePlanStore.getState().createOrUpdateGoal({ goal: GOAL, today: TODAY });
    const firstPlan = usePlanStore.getState().plan;

    const updated = usePlanStore.getState().createOrUpdateGoal({
      goal: { ...GOAL, raceDistance: 'semi', raceDate: addDays(TODAY, 100) },
      today: TODAY,
    });
    expect(updated.status).toBe('plan');
    expect(usePlanStore.getState().goal?.raceDistance).toBe('semi');
    expect(usePlanStore.getState().plan).not.toEqual(firstPlan);
    expect(usePlanStore.getState().archivedPlans.map((p) => p.status)).toEqual(['superseded']);
  });

  it('objectif irréaliste → rien ne change, alternatives proposées puis applicables', () => {
    resetStores(steadyEntries(60, 5));
    usePlanStore.getState().hydrateFromOnboarding(TODAY);
    const result = usePlanStore.getState().createOrUpdateGoal({
      goal: { ...GOAL, raceDistance: 'marathon', raceDate: addDays(TODAY, 21) },
      today: TODAY,
    });
    expect(result.status).toBe('unrealistic');
    expect(usePlanStore.getState().plan).toBeUndefined();
    expect(usePlanStore.getState().goal).toBeUndefined();

    if (result.status !== 'unrealistic') {
      throw new Error('résultat irréaliste attendu');
    }
    const later = result.alternatives.find((a) => a.type === 'later_date');
    expect(later).toBeDefined();
    const applied = usePlanStore.getState().applyGoalAlternative(later!, TODAY);
    expect(applied.status).toBe('plan');
    expect(usePlanStore.getState().goal).toBeDefined();
  });

  it('objectif invalide → invalid, sans effet de bord', () => {
    resetStores();
    usePlanStore.getState().hydrateFromOnboarding(TODAY);
    const result = usePlanStore
      .getState()
      .createOrUpdateGoal({ goal: { raceDistance: 'ultra' }, today: TODAY });
    expect(result.status).toBe('invalid');
    expect(usePlanStore.getState().goal).toBeUndefined();
  });
});

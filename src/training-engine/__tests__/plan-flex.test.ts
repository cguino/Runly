import type { PlannedSession, TrainingPlan } from '@/schemas';

import { personas } from '../__fixtures__/personas';
import { computeLoadState, forecastLoadState } from '../load';
import { generatePlan } from '../plan';
import {
  addSessionToPlan,
  buildWeekOverview,
  estimateBlocksDurationS,
  estimatePlannedSessionLoad,
  EXPECTED_SESSION_RPE,
  forecastForSessions,
  instantiateWeekTemplate,
  lighteningSuggested,
  movePlannedSession,
  moveSessionWarnings,
  sessionDisplayStatus,
  upcomingPlannedLoads,
  weekRealizedSummary,
} from '../plan-flex';
import { buildSession } from '../session-templates';

function session(
  scheduledDate: string,
  sessionType: PlannedSession['sessionType'],
  status: PlannedSession['status'] = 'planned',
): PlannedSession {
  return { scheduledDate, sessionType, blocks: [], status };
}

function marcPlan(): TrainingPlan {
  const result = generatePlan(personas['marc-semi-14sem-3j']!);
  if (result.outcome !== 'plan') {
    throw new Error('plan attendu');
  }
  return result.plan;
}

// ---------------------------------------------------------------------------
// moveSessionWarnings (E8-3) — avertir, jamais bloquer
// ---------------------------------------------------------------------------

describe('moveSessionWarnings (E8-3, spec §7.9)', () => {
  it('qualité déplacée à côté d’une autre qualité → quality_back_to_back (avant et après)', () => {
    const others = [session('2026-07-21', 'seuil')];
    expect(
      moveSessionWarnings({
        session: session('2026-07-24', 'vma_court'),
        newDate: '2026-07-22',
        otherSessions: others,
      }),
    ).toEqual(['quality_back_to_back']);
    expect(
      moveSessionWarnings({
        session: session('2026-07-24', 'vma_court'),
        newDate: '2026-07-20',
        otherSessions: others,
      }),
    ).toEqual(['quality_back_to_back']);
  });

  it('qualité déplacée la veille de la sortie longue → quality_before_long_run', () => {
    const others = [session('2026-07-26', 'sortie_longue')];
    expect(
      moveSessionWarnings({
        session: session('2026-07-21', 'tempo'),
        newDate: '2026-07-25',
        otherSessions: others,
      }),
    ).toEqual(['quality_before_long_run']);
  });

  it('sortie longue déplacée au lendemain d’une qualité → même enchaînement signalé', () => {
    const others = [session('2026-07-24', 'seuil')];
    expect(
      moveSessionWarnings({
        session: session('2026-07-26', 'sortie_longue'),
        newDate: '2026-07-25',
        otherSessions: others,
      }),
    ).toEqual(['quality_before_long_run']);
  });

  it('les deux enchaînements peuvent se cumuler', () => {
    const others = [session('2026-07-24', 'seuil'), session('2026-07-26', 'sortie_longue')];
    expect(
      moveSessionWarnings({
        session: session('2026-07-21', 'vma_court'),
        newDate: '2026-07-25',
        otherSessions: others,
      }),
    ).toEqual(['quality_back_to_back', 'quality_before_long_run']);
  });

  it('EF déplacée n’importe où → aucun avertissement', () => {
    const others = [session('2026-07-24', 'seuil'), session('2026-07-26', 'sortie_longue')];
    expect(
      moveSessionWarnings({
        session: session('2026-07-21', 'ef'),
        newDate: '2026-07-25',
        otherSessions: others,
      }),
    ).toEqual([]);
  });

  it('qualité déplacée sur un jour isolé → aucun avertissement', () => {
    const others = [session('2026-07-20', 'ef'), session('2026-07-26', 'sortie_longue')];
    expect(
      moveSessionWarnings({
        session: session('2026-07-21', 'seuil'),
        newDate: '2026-07-22',
        otherSessions: others,
      }),
    ).toEqual([]);
  });

  it('les séances annulées/manquées ne comptent pas dans les enchaînements', () => {
    const others = [
      session('2026-07-21', 'seuil', 'cancelled'),
      session('2026-07-23', 'tempo', 'missed'),
    ];
    expect(
      moveSessionWarnings({
        session: session('2026-07-25', 'vma_court'),
        newDate: '2026-07-22',
        otherSessions: others,
      }),
    ).toEqual([]);
  });

  it('la sortie longue n’est pas une qualité : SL + SL adjacentes → pas d’avertissement', () => {
    const others = [session('2026-07-25', 'sortie_longue')];
    expect(
      moveSessionWarnings({
        session: session('2026-07-21', 'sortie_longue'),
        newDate: '2026-07-26',
        otherSessions: others,
      }),
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// movePlannedSession / addSessionToPlan — immuabilité
// ---------------------------------------------------------------------------

describe('movePlannedSession', () => {
  it('déplace la séance (statut moved) sans muter le plan d’origine', () => {
    const plan = marcPlan();
    const before = JSON.stringify(plan);
    const updated = movePlannedSession(plan, { weekIndex: 0, sessionIndex: 0 }, '2026-07-22');
    expect(JSON.stringify(plan)).toBe(before);
    expect(updated).not.toBe(plan);
    const moved = updated.weeks[0]!.sessions[0]!;
    expect(moved.scheduledDate).toBe('2026-07-22');
    expect(moved.status).toBe('moved');
    // La séance reste dans sa semaine, rien n'est dupliqué ni perdu.
    expect(updated.weeks[0]!.sessions).toHaveLength(plan.weeks[0]!.sessions.length);
  });

  it('référence invalide ou date identique → plan inchangé', () => {
    const plan = marcPlan();
    expect(movePlannedSession(plan, { weekIndex: 99, sessionIndex: 0 }, '2026-07-22')).toBe(plan);
    const date = plan.weeks[0]!.sessions[0]!.scheduledDate;
    expect(movePlannedSession(plan, { weekIndex: 0, sessionIndex: 0 }, date)).toBe(plan);
  });
});

describe('addSessionToPlan (E8-4)', () => {
  it('rattache la séance à la semaine couvrant sa date, triée par date', () => {
    const plan = marcPlan();
    const added = session('2026-07-22', 'ef');
    const updated = addSessionToPlan(plan, added);
    const week = updated.weeks[0]!;
    expect(week.sessions).toHaveLength(plan.weeks[0]!.sessions.length + 1);
    const dates = week.sessions.map((s) => s.scheduledDate);
    expect([...dates].sort()).toEqual(dates);
    expect(plan.weeks[0]!.sessions).not.toContain(added);
  });

  it('date hors du plan → bornée à la dernière semaine', () => {
    const plan = marcPlan();
    const updated = addSessionToPlan(plan, session('2099-01-01', 'ef'));
    const last = updated.weeks[updated.weeks.length - 1]!;
    expect(last.sessions.some((s) => s.scheduledDate === '2099-01-01')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Charge estimée & recalcul prévisionnel (E8-3, E8-4)
// ---------------------------------------------------------------------------

describe('estimatePlannedSessionLoad', () => {
  it('EF 6 km ≈ durée estimée × RPE attendu 3', () => {
    const spec = buildSession({ type: 'ef', vmaKmh: 15, distanceKm: 6 });
    const durationMin = estimateBlocksDurationS(spec.blocks, 15) / 60;
    const load = estimatePlannedSessionLoad({ sessionType: 'ef', blocks: spec.blocks }, 15);
    expect(load).toBe(Math.round(3 * durationMin));
  });

  it('une qualité pèse plus lourd qu’une EF de durée comparable', () => {
    const ef = buildSession({ type: 'ef', vmaKmh: 15, distanceKm: 8 });
    const seuil = buildSession({ type: 'seuil', vmaKmh: 15 });
    const efLoad = estimatePlannedSessionLoad({ sessionType: 'ef', blocks: ef.blocks }, 15);
    const seuilLoad = estimatePlannedSessionLoad(
      { sessionType: 'seuil', blocks: seuil.blocks },
      15,
    );
    expect(seuilLoad).toBeGreaterThan(efLoad);
  });

  it('séance sans bloc (course libre) → durée par défaut 45 min', () => {
    expect(estimatePlannedSessionLoad({ sessionType: 'ef', blocks: [] })).toBe(
      EXPECTED_SESSION_RPE.ef * 45,
    );
  });

  it('estimateBlocksDurationS compte les répétitions et les récupérations', () => {
    const seuil = buildSession({ type: 'seuil', vmaKmh: 15 });
    // éch. 15 min + 2 × 10 min + 1 récup 2 min + RAC 10 min = 47 min.
    expect(estimateBlocksDurationS(seuil.blocks, 15)).toBe(47 * 60);
  });
});

describe('recalcul de l’ACWR prévisionnel après déplacement/ajout (E8-3)', () => {
  // Chronique stable : 100 UA/jour depuis 28 jours (19/06 → 16/07).
  const stableLoads = (() => {
    const result: { date: string; load: number }[] = [];
    for (let i = 0; i < 28; i += 1) {
      const day = 19 + i;
      const date =
        day <= 30
          ? `2026-06-${String(day).padStart(2, '0')}`
          : `2026-07-${String(day - 30).padStart(2, '0')}`;
      result.push({ date, load: 100 });
    }
    return result;
  })();
  const today = '2026-07-16';

  it('déplacer une séance hors de l’horizon J+7 fait baisser la projection', () => {
    const sessions = [session('2026-07-18', 'seuil'), session('2026-07-20', 'ef')];
    const before = forecastForSessions({ dailyLoads: stableLoads, today, sessions, vmaKmh: 15 });
    const movedOut = [session('2026-07-30', 'seuil', 'moved'), session('2026-07-20', 'ef')];
    const after = forecastForSessions({
      dailyLoads: stableLoads,
      today,
      sessions: movedOut,
      vmaKmh: 15,
    });
    expect(after.acuteLoad7d).toBeLessThan(before.acuteLoad7d);
  });

  it('déplacer une séance à l’intérieur de la fenêtre J+7 ne change pas la charge projetée totale', () => {
    const sessions = [session('2026-07-18', 'seuil'), session('2026-07-20', 'ef')];
    const before = forecastForSessions({ dailyLoads: stableLoads, today, sessions, vmaKmh: 15 });
    const movedInside = [session('2026-07-19', 'seuil', 'moved'), session('2026-07-20', 'ef')];
    const after = forecastForSessions({
      dailyLoads: stableLoads,
      today,
      sessions: movedInside,
      vmaKmh: 15,
    });
    expect(after.acuteLoad7d).toBe(before.acuteLoad7d);
    expect(after.acwr).toBe(before.acwr);
  });

  it('ajouter une séance spontanée augmente la projection', () => {
    const sessions = [session('2026-07-20', 'ef')];
    const before = forecastForSessions({ dailyLoads: stableLoads, today, sessions, vmaKmh: 15 });
    const withExtra = [...sessions, session('2026-07-21', 'seuil')];
    const after = forecastForSessions({
      dailyLoads: stableLoads,
      today,
      sessions: withExtra,
      vmaKmh: 15,
    });
    expect(after.acuteLoad7d).toBeGreaterThan(before.acuteLoad7d);
  });

  it('upcomingPlannedLoads ignore les séances passées, du jour et non actives', () => {
    const sessions = [
      session('2026-07-15', 'ef'),
      session(today, 'ef'),
      session('2026-07-18', 'seuil'),
      session('2026-07-19', 'ef', 'cancelled'),
      session('2026-07-20', 'ef', 'done'),
      session('2026-07-21', 'ef', 'moved'),
    ];
    const loads = upcomingPlannedLoads(sessions, today, 15);
    expect(loads.map((l) => l.scheduledDate)).toEqual(['2026-07-18', '2026-07-21']);
  });
});

describe('lighteningSuggested — l’app se tait dans la zone (spec §7.9)', () => {
  const today = '2026-07-16';
  const stable = Array.from({ length: 28 }, (_, i) => {
    const day = 19 + i;
    const date =
      day <= 30
        ? `2026-06-${String(day).padStart(2, '0')}`
        : `2026-07-${String(day - 30).padStart(2, '0')}`;
    return { date, load: 100 };
  });

  it('charge projetée en zone favorable → silence', () => {
    // Une semaine planifiée au niveau de l'habitude : la projection reste dans la zone.
    const projected = forecastLoadState({
      dailyLoads: stable,
      today,
      plannedSessions: Array.from({ length: 7 }, (_, i) => ({
        scheduledDate: `2026-07-${String(17 + i).padStart(2, '0')}`,
        estimatedLoad: 100,
      })),
    });
    expect(projected.status).toBe('favorable');
    expect(lighteningSuggested(projected)).toBe(false);
  });

  it('charge projetée en sous-charge → silence aussi (pas de culpabilisation)', () => {
    const projected = forecastLoadState({ dailyLoads: stable, today, plannedSessions: [] });
    expect(projected.status).toBe('sous_charge');
    expect(lighteningSuggested(projected)).toBe(false);
  });

  it('charge projetée en pic → suggestion d’allègement', () => {
    const projected = forecastLoadState({
      dailyLoads: stable,
      today,
      plannedSessions: [
        { scheduledDate: '2026-07-17', estimatedLoad: 400 },
        { scheduledDate: '2026-07-18', estimatedLoad: 400 },
        { scheduledDate: '2026-07-19', estimatedLoad: 400 },
      ],
    });
    expect(projected.status).toBe('pic');
    expect(lighteningSuggested(projected)).toBe(true);
  });

  it('la projection reste cohérente avec computeLoadState au même horizon', () => {
    const projected = forecastLoadState({ dailyLoads: stable, today, plannedSessions: [] });
    const manual = computeLoadState({
      dailyLoads: stable,
      today: '2026-07-23',
      historyStart: stable[0]!.date,
    });
    expect(projected.acwr).toBe(manual.acwr);
  });
});

// ---------------------------------------------------------------------------
// Vue semaine & statuts (E8-1)
// ---------------------------------------------------------------------------

describe('sessionDisplayStatus & buildWeekOverview (E8-1)', () => {
  const today = '2026-07-16'; // jeudi

  it('statuts : done → fait, missed/cancelled → manqué, planifiée passée → manqué, à venir → prévu', () => {
    expect(sessionDisplayStatus(session('2026-07-14', 'ef', 'done'), today)).toBe('fait');
    expect(sessionDisplayStatus(session('2026-07-14', 'ef', 'missed'), today)).toBe('manque');
    expect(sessionDisplayStatus(session('2026-07-14', 'ef'), today)).toBe('manque');
    expect(sessionDisplayStatus(session(today, 'ef'), today)).toBe('prevu');
    expect(sessionDisplayStatus(session('2026-07-18', 'ef', 'moved'), today)).toBe('prevu');
  });

  it('7 jours fixes lun→dim, jours de repos présents et vides', () => {
    const sessions = [
      session('2026-07-14', 'seuil', 'done'),
      session('2026-07-16', 'ef'),
      session('2026-07-19', 'sortie_longue'),
      session('2026-07-15', 'ef', 'cancelled'),
    ];
    const overview = buildWeekOverview(sessions, '2026-07-13', today);
    expect(overview).toHaveLength(7);
    expect(overview.map((d) => d.date)).toEqual([
      '2026-07-13',
      '2026-07-14',
      '2026-07-15',
      '2026-07-16',
      '2026-07-17',
      '2026-07-18',
      '2026-07-19',
    ]);
    expect(overview[0]!.sessions).toHaveLength(0); // repos affiché
    expect(overview[1]!.sessions[0]!.displayStatus).toBe('fait');
    expect(overview[2]!.sessions).toHaveLength(0); // annulée = non affichée
    expect(overview[3]!.sessions[0]!.displayStatus).toBe('prevu');
    expect(overview[6]!.sessions[0]!.session.sessionType).toBe('sortie_longue');
  });
});

// ---------------------------------------------------------------------------
// Semaine type manuelle (E8-6)
// ---------------------------------------------------------------------------

describe('instantiateWeekTemplate (E8-6)', () => {
  const template = [
    { day: 5, sessionType: 'sortie_longue' as const },
    { day: 1, sessionType: 'ef' as const },
    { day: 3, sessionType: 'seuil' as const },
  ];

  it('matérialise chaque entrée sur la semaine, triée par jour, structurée en blocs', () => {
    const sessions = instantiateWeekTemplate(template, '2026-07-13', { vmaKmh: 15 });
    expect(sessions.map((s) => s.scheduledDate)).toEqual([
      '2026-07-14',
      '2026-07-16',
      '2026-07-18',
    ]);
    expect(sessions.map((s) => s.sessionType)).toEqual(['ef', 'seuil', 'sortie_longue']);
    expect(sessions.every((s) => s.status === 'planned')).toBe(true);
    expect(sessions.every((s) => s.blocks.length > 0)).toBe(true);
  });

  it('fromDay : ne matérialise pas rétroactivement les jours déjà passés', () => {
    const sessions = instantiateWeekTemplate(template, '2026-07-13', { fromDay: 3 });
    expect(sessions.map((s) => s.sessionType)).toEqual(['seuil', 'sortie_longue']);
  });
});

// ---------------------------------------------------------------------------
// Résumé réalisé hebdo (E8-2)
// ---------------------------------------------------------------------------

describe('weekRealizedSummary (E8-2)', () => {
  it('agrège séances, charge et RPE moyen de la semaine civile', () => {
    const workouts = [
      { startedAt: '2026-07-13T08:00:00Z', load: 200, rpe: 4 },
      { startedAt: '2026-07-16T18:30:00Z', load: 350, rpe: 7 },
      { startedAt: '2026-07-19T09:00:00Z', load: 150 },
      { startedAt: '2026-07-20T09:00:00Z', load: 999, rpe: 9 }, // semaine suivante
    ];
    const summary = weekRealizedSummary(workouts, '2026-07-13');
    expect(summary.count).toBe(3);
    expect(summary.totalLoad).toBe(700);
    expect(summary.avgRpe).toBe(5.5);
  });

  it('semaine vide → 0 séance, RPE indéfini', () => {
    expect(weekRealizedSummary([], '2026-07-13')).toEqual({
      count: 0,
      totalLoad: 0,
      avgRpe: undefined,
    });
  });
});

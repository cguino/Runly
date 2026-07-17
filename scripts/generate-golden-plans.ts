/**
 * Génère les golden files du moteur de plan (vérification Lot 3) et leur
 * rendu markdown lisible pour la validation coach (G3, E3-4).
 *
 * Usage : `yarn golden:plans` — puis committer les fichiers modifiés.
 * ⚠️ Tout changement de golden file doit être justifié explicitement en
 * description de PR (règle §6.5 du plan d'implémentation).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { formatDecimal, formatPace } from '../src/i18n/format';
import { dayOfWeek } from '../src/lib/dates';
import type { BlockTarget, SessionBlock, SessionStep } from '../src/schemas';
import { personas } from '../src/training-engine/__fixtures__/personas';
import { generatePlan } from '../src/training-engine/plan';
import type { PlanGenerationResult } from '../src/training-engine/plan-types';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const goldenDir = join(root, 'src/training-engine/__tests__/__golden__');
const docsDir = join(root, 'docs/plans-personas');
mkdirSync(goldenDir, { recursive: true });
mkdirSync(docsDir, { recursive: true });

const DAYS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'] as const;
const PHASE_LABEL = {
  generale: 'générale',
  specifique: 'spécifique',
  affutage: 'affûtage',
} as const;

function targetLabel(target: BlockTarget): string {
  switch (target.type) {
    case 'pace':
      return `@ ${formatPace(target.maxSecondsPerKm)}–${formatPace(target.minSecondsPerKm)}`;
    case 'hrZone':
      return `@ zone ${target.zone}`;
    case 'rpe':
      return `@ RPE ${target.rpe}`;
    case 'none':
      return 'allure libre';
  }
}

function extentLabel(step: SessionStep): string {
  if (step.extent.type === 'distance') {
    const km = step.extent.meters / 1000;
    return km >= 1 ? `${formatDecimal(km, km % 1 === 0 ? 0 : 1)} km` : `${step.extent.meters} m`;
  }
  return `${Math.round(step.extent.seconds / 60)} min`;
}

function blockLabel(block: SessionBlock): string {
  if (block.kind === 'step') {
    return `${extentLabel(block)} ${targetLabel(block.target)}`;
  }
  const inner = block.blocks.map(blockLabel).join(' + ');
  const recovery = block.recovery ? ` · récup ${extentLabel(block.recovery)}` : '';
  return `${block.repetitions} × (${inner})${recovery}`;
}

function renderMarkdown(name: string, result: PlanGenerationResult): string {
  const input = personas[name]!;
  const lines: string[] = [];
  lines.push(`# Persona « ${name} »`);
  lines.push('');
  const goal = input.goal;
  const chrono =
    goal.ambition === 'chrono' && goal.targetTimeS !== undefined
      ? ` (${Math.floor(goal.targetTimeS / 3600)}h${String(Math.floor((goal.targetTimeS % 3600) / 60)).padStart(2, '0')})`
      : '';
  lines.push(
    `- **Objectif** : ${goal.raceDistance} le ${goal.raceDate}, ambition ${goal.ambition}${chrono}`,
  );
  lines.push(
    `- **Contexte** : ${input.context.sessionsPerWeek} séances/sem (${input.context.preferredDays.map((d) => DAYS[d]).join(', ')}), volume ${input.context.currentWeeklyVolumeKm ?? 'inconnu'} km/sem, antécédent < 12 mois : ${input.context.injuryWithin12Months ? 'oui' : 'non'}`,
  );
  lines.push(
    `- **VMA** : ${input.physio.vmaKmh !== undefined ? `${formatDecimal(input.physio.vmaKmh, 1)} km/h` : 'inconnue (cibles en zones FC / RPE)'}`,
  );
  lines.push('');

  if (result.outcome === 'refused') {
    lines.push(`**Résultat : génération refusée** (\`${result.reason}\`).`);
    lines.push('');
    return lines.join('\n');
  }
  if (result.outcome === 'unrealistic') {
    lines.push(`**Résultat : objectif jugé irréaliste** (\`${result.reasons.join('`, `')}\`).`);
    lines.push('');
    lines.push('Alternatives proposées :');
    for (const alt of result.alternatives) {
      if (alt.type === 'finish_ambition') {
        lines.push('- passer l’ambition à « finir »');
      } else if (alt.type === 'later_date') {
        lines.push(`- viser une date ultérieure (≥ ${alt.suggestedRaceDate})`);
      } else {
        lines.push(`- viser un autre objectif : ${alt.raceDistance}`);
      }
    }
    lines.push('');
    return lines.join('\n');
  }

  if (result.recommendations.length > 0) {
    lines.push(`Recommandations : \`${result.recommendations.join('`, `')}\``);
    lines.push('');
  }
  const { plan } = result;
  const phaseOf = (weekIndex: number) =>
    plan.phases.find(
      (p) => weekIndex >= p.startWeekIndex && weekIndex < p.startWeekIndex + p.weekCount,
    )?.type ?? 'generale';

  for (const week of plan.weeks) {
    const phase = PHASE_LABEL[phaseOf(week.weekIndex)];
    const recovery = week.isRecovery ? ' · **semaine allégée**' : '';
    lines.push(
      `## Semaine ${week.weekIndex + 1} — ${phase}${recovery} · ≈ ${formatDecimal(week.targetVolumeKm ?? 0, 1)} km`,
    );
    lines.push('');
    for (const session of week.sessions) {
      const day = DAYS[dayOfWeek(session.scheduledDate)];
      lines.push(
        `- **${day} ${session.scheduledDate}** · ${session.sessionType} : ${session.blocks.map(blockLabel).join(' + ')}`,
      );
    }
    lines.push('');
  }
  return lines.join('\n');
}

const golden: Record<string, PlanGenerationResult> = {};
for (const [name, input] of Object.entries(personas)) {
  const result = generatePlan(input);
  golden[name] = result;
  writeFileSync(join(docsDir, `${name}.md`), renderMarkdown(name, result));
  console.log(`${name}: ${result.outcome}`);
}
writeFileSync(join(goldenDir, 'plans.json'), `${JSON.stringify(golden, null, 2)}\n`);

writeFileSync(
  join(docsDir, 'README.md'),
  `# Plans par persona — support de validation coach (G3)

Rendus lisibles des sorties du moteur de plan (\`src/training-engine\`) sur
les 6 personas des golden files. Générés par \`yarn golden:plans\` — ne pas
éditer à la main. Tout changement de sortie du moteur (diff sur ces fichiers
ou sur \`__golden__/plans.json\`) doit être justifié explicitement en
description de PR (plan d'implémentation §6.5) et revalidé par le coach.
`,
);
console.log('Golden files et markdown régénérés.');

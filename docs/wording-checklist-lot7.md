# Checklist wording — Lot 7 (Charge & jauge ACWR)

> Revue systématique exigée par `note-reglementaire-dm.md` (garde-fou n°1)
> et par le plan d'implémentation (Lot 7, « revue wording : chaque message
> confronté au tableau proscrit/recommandé »). Chaque string ajoutée dans
> `src/i18n/fr.ts` (sections `load`, `gauge`, `rpe`) est listée ci-dessous.
>
> Rappels du filtre : jamais « blessure », « risque de blessure »,
> « prévention », pathologie nommée, alerte à finalité santé, ni prédiction
> (« tu vas te… »). Autorisé : charge, fatigue, récupération, « ta charge
> augmente vite, prudence », aide à la décision, tutoiement coach.

## Verdict global

✅ **Conforme.** Aucune occurrence de « blessure », « risque », « prévention »,
« santé », « danger », ni d'aucune pathologie dans les strings du lot.
Aucune prédiction : uniquement des constats de charge et des suggestions
d'entraînement, l'utilisateur décide toujours (« Garder mon plan »).

## Section `load` (alertes & Accueil)

| Clé | String | Filtre note réglementaire | Verdict |
|---|---|---|---|
| `load.title` | « Ta charge » | Vocabulaire recommandé (« charge ») | ✅ |
| `load.alerts.title.pic_charge` | « Ta charge augmente vite » | Colonne ✅ du tableau (« Ta charge augmente vite — conseil d'entraînement ») | ✅ |
| `load.alerts.title.sous_charge` | « Ton rythme se fait discret » | Constat d'entraînement, ton coach, aucune finalité santé | ✅ |
| `load.alerts.title.rpe_eleve` | « Deux séances corsées d'affilée » | Constat de ressenti, pas d'alerte santé | ✅ |
| `load.alerts.body.pic_charge` | « Charge en hausse de {{pct}} % vs ton habitude — prudence. Suggestion : remplace ta prochaine séance intense par une sortie plus légère. » | Calque des formulations validées (spec §6.3 « augmenté de 38 % vs ton habitude » ; brief : « charge en hausse de X % vs ton habitude », « prudence ») ; conseil d'entraînement 1 tap, pas « risque de blessure élevé » | ✅ |
| `load.alerts.body.sous_charge` | « Ta charge est en dessous de ton habitude depuis deux semaines. Une séance facile de plus par semaine, et tu retrouves ton rythme. » | Encouragement à la régularité (spec §7.6), valorise la régularité (spec §5), aucune menace | ✅ |
| `load.alerts.body.rpe_eleve` | « Tu as ressenti tes deux dernières séances à {{rpe}}/10 ou plus. Suggestion : allège ta prochaine séance pour bien assimiler. » | « Fatigue/récupération » côté recommandé ; suggestion, pas de « détecte le surmenage » | ✅ |
| `load.alerts.accept` | « Adapter ma semaine » | Action 1 tap (spec §7.6) | ✅ |
| `load.alerts.keep` | « Garder mon plan » | Option obligatoire — l'utilisateur décide toujours | ✅ |
| `load.rpePrompt` | « Note l'effort de ta dernière séance » | Neutre, entraînement | ✅ |
| `load.disclaimer` | « Aide à la décision d'entraînement — ne constitue pas un avis médical. » | Disclaimer charte §5, repris tel quel | ✅ |

## Section `gauge` (jauge + pédagogie)

| Clé | String | Filtre note réglementaire | Verdict |
|---|---|---|---|
| `gauge.empty` | « — » | Symbole (pas de valeur en calibration) | ✅ |
| `gauge.status.calibration` | « En calibration » | Valeur estimée marquée `warn` (charte §5) | ✅ |
| `gauge.status.sous_charge` | « Sous ta zone · tu peux en faire un peu plus » | Encouragement, pas de « sous-entraînement à risque » | ✅ |
| `gauge.status.favorable` | « Zone favorable · continue comme ça » | Formulation charte §4 reprise telle quelle | ✅ |
| `gauge.status.pic` | « Pic de charge · prudence » | « Pic de charge » = colonne ✅ du tableau ; pas de « risque de blessure élevé » | ✅ |
| `gauge.caption.calibration` | « Ta jauge apprend ton habitude d'entraînement : encore quelques semaines de données et elle t'accompagnera séance après séance. » | Pédagogie neutre | ✅ |
| `gauge.caption.sous_charge` | « Ta charge est en dessous de ton habitude des 4 dernières semaines. Une séance douce de plus suffit souvent à relancer la dynamique. » | Constat + conseil d'entraînement | ✅ |
| `gauge.caption.favorable` | « Ta charge est bien équilibrée par rapport à ton habitude des 4 dernières semaines. » | « équilibre charge / récupération » côté recommandé | ✅ |
| `gauge.caption.pic` | « Ta charge augmente vite par rapport à ton habitude — envisage une semaine plus légère. » | Calque de « Pic de charge : envisage une semaine plus légère » (colonne ✅) | ✅ |
| `gauge.forecast` | « ≈ {{value}} à J+7 si tu suis ta semaine » | Projection de charge planifiée, marquée « ≈ » (charte §5) — pas une prédiction sur la personne | ✅ |
| `gauge.howItWorks` | « Comment ça marche ? » | Neutre | ✅ |
| `gauge.a11y` | « Jauge de charge : {{status}} » | Neutre (accessibilité) | ✅ |
| `gauge.info.title` | « Comment ça marche ? » | Neutre | ✅ |
| `gauge.info.intro` | « Ta jauge compare ce que tu viens de faire à ce que ton corps a l'habitude de faire. Rien de magique : deux nombres et un ratio. » | Pédagogie, aucune revendication | ✅ |
| `gauge.info.acuteTitle` / `acuteBody` | « Ta charge récente » / « Chaque séance compte pour ton effort ressenti (RPE de 0 à 10) multiplié par sa durée en minutes. La jauge additionne tes 7 derniers jours : c'est ta charge récente. » | Description factuelle du sRPE | ✅ |
| `gauge.info.chronicTitle` / `chronicBody` | « Ton habitude » / « Sur tes 4 dernières semaines, la jauge calcule ta charge moyenne par semaine : c'est ton habitude, la base que ton corps connaît et sur laquelle tu progresses. » | Charge chronique valorisée (régularité, spec §5) — pas « protectrice contre les blessures » | ✅ |
| `gauge.info.ratioTitle` / `ratioBody` | « Le ratio » / « La jauge divise ta charge récente par ton habitude. Entre 0,8 et 1,3, tu es dans ta zone favorable […] une séance plus légère aide à garder l'équilibre entre charge et récupération. Dans tous les cas, c'est toi qui décides. » | « équilibre charge / récupération » (colonne ✅) ; posture « l'utilisateur décide » explicite ; aucune mention de risque/blessure | ✅ |

## Section `rpe` (saisie post-séance)

| Clé | String | Filtre note réglementaire | Verdict |
|---|---|---|---|
| `rpe.title` | « Ton ressenti » | Neutre | ✅ |
| `rpe.question` | « Comment était ta séance ? » | Ton coach | ✅ |
| `rpe.hint` | « 0 = repos total · 10 = effort maximal » | Échelle factuelle | ✅ |
| `rpe.save` | « Enregistrer » | Neutre | ✅ |
| `rpe.noWorkout` | « Aucune séance à noter pour l'instant. » | Neutre | ✅ |
| `rpe.anchors` (0–1 😌 « Très facile » · 2–3 🙂 « Facile » · 4–5 😊 « Modéré » · 6–7 😅 « Difficile » · 8–9 🥵 « Très difficile » · 10 🤯 « Maximal ») | Ancres G6 | Vocabulaire d'effort perçu (Foster), aucune connotation médicale | ✅ |

## Vérification négative (grep sur `src/i18n/fr.ts`, sections du lot)

Termes proscrits recherchés — **0 occurrence** : blessure, blesser, risque,
prévention, prévient, santé, danger, médical*, tendinopathie, périostite,
fracture, surentraînement, surmenage, « tu vas ».
(*« ne constitue pas un avis médical » est le disclaimer requis par la
charte §5 et les garde-fous CGU — usage négatif, pas une revendication.)

Le moteur (`src/training-engine/alerts.ts`) n'émet **aucun texte** : codes
typés + valeurs uniquement (`pic_charge`, `sous_charge`, `rpe_eleve`),
traduits exclusivement par l'UI via ces strings.

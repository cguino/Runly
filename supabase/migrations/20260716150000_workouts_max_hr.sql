-- Lot 1 (E2-2) : la FCmax « max observé dans l'historique » (spec §7.5)
-- exige la FC max PAR SÉANCE. C'est un agrégat de séance au même titre que
-- la FC moyenne — conforme à la minimisation (règle transverse n°7,
-- ADR-004) : toujours aucune série FC brute en base.
alter table public.workouts
  add column max_hr_bpm smallint check (max_hr_bpm between 30 and 250);

import { personas } from '../__fixtures__/personas';
import { generatePlan } from '../plan';
import golden from './__golden__/plans.json';

/**
 * Golden files du moteur de plan (vérification Lot 3, plan §6.5) :
 * TOUT changement de sortie du moteur fait échouer ce test. Pour mettre à
 * jour : `yarn golden:plans`, puis justifier explicitement le diff en
 * description de PR (les markdown de docs/plans-personas/ sont le support
 * de la validation coach G3).
 */
describe('golden files du moteur de plan (6 personas)', () => {
  it('couvre exactement les personas définis', () => {
    expect(Object.keys(golden).sort()).toEqual(Object.keys(personas).sort());
  });

  it.each(Object.keys(personas))('%s : sortie du moteur inchangée', (name) => {
    const result = generatePlan(personas[name]!);
    expect(result).toEqual(golden[name as keyof typeof golden]);
  });
});

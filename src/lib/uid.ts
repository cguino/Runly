/**
 * Identifiants UUID v4 (format RFC 4122) pour les entités créées côté
 * client (séances planifiées, objectifs…). Générateur non cryptographique :
 * suffisant pour des identifiants locaux, compatible avec les schémas zod
 * (`z.string().uuid()`).
 */
export function randomUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.trunc(Math.random() * 16);
    const value = char === 'x' ? random : (random % 4) + 8;
    return value.toString(16);
  });
}

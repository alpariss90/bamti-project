import type { StatutEnvoi } from '@/types/data';

// Libellé affiché pour l'état d'une vente ou d'un versement
export function libelleStatut(statut?: StatutEnvoi): string {
  if (statut === 'validee') return 'Validée';
  if (statut === 'envoyee') return 'Envoyée';
  if (statut === 'telephone') return 'Sur le téléphone';
  return '';
}

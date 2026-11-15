// Génère un uuid v4 (identifiant unique d'un client, d'une vente ou d'un paiement saisi sur le téléphone).
// crypto.randomUUID n'existe pas sur les anciens WebView Android : repli sur crypto.getRandomValues.
export function genererUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const octets = new Uint8Array(16);
  crypto.getRandomValues(octets);
  octets[6] = (octets[6] & 0x0f) | 0x40; // version 4
  octets[8] = (octets[8] & 0x3f) | 0x80; // variante RFC 4122
  const hex = Array.from(octets, (o) => o.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

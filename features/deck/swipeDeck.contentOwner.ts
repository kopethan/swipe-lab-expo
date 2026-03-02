import type { BackLayerPhase } from './deck.types';

export type SwipeDeckContentRole = 'top' | 'ghostPrev' | 'ghostNext' | 'back';

export type SwipeDeckContentOwnerEntry = {
  key: string;
  cardIndex: number;
  role: SwipeDeckContentRole;
  phase?: BackLayerPhase;
  active: boolean;
};

function rolePriority(entry: SwipeDeckContentOwnerEntry): number {
  if (entry.role === 'top') return 400;
  if (entry.role === 'ghostPrev') return 300;
  if (entry.role === 'ghostNext') return 200;
  if (entry.phase === 'stable') return 120;
  if (entry.phase === 'entering') return 110;
  return 100;
}

export function resolveSwipeDeckContentOwnerKeySet(entries: SwipeDeckContentOwnerEntry[]): Set<string> {
  const ownersByCard = new Map<number, SwipeDeckContentOwnerEntry>();

  for (const entry of entries) {
    if (!entry.active) continue;
    const current = ownersByCard.get(entry.cardIndex);
    if (!current || rolePriority(entry) > rolePriority(current)) {
      ownersByCard.set(entry.cardIndex, entry);
    }
  }

  const keys = new Set<string>();
  for (const owner of ownersByCard.values()) {
    keys.add(owner.key);
  }
  return keys;
}

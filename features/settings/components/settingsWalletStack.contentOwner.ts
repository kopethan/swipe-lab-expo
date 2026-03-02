export type SettingsWalletRenderRole = 'top' | 'stack' | 'incomingPrev';

export type SettingsWalletRenderItem = {
  key: string;
  idx: number;
  depth: number;
  role: SettingsWalletRenderRole;
};

function getShallowestStackItem(items: SettingsWalletRenderItem[]): SettingsWalletRenderItem | null {
  let winner: SettingsWalletRenderItem | null = null;
  for (const item of items) {
    if (item.role !== 'stack') continue;
    if (!winner || item.depth < winner.depth) {
      winner = item;
    }
  }
  return winner;
}

function getIncomingPrevItem(items: SettingsWalletRenderItem[]): SettingsWalletRenderItem | null {
  for (const item of items) {
    if (item.role === 'incomingPrev') return item;
  }
  return null;
}

function getTopItem(items: SettingsWalletRenderItem[]): SettingsWalletRenderItem | null {
  for (const item of items) {
    if (item.role === 'top') return item;
  }
  return null;
}

export function resolveSettingsWalletContentOwners(params: {
  items: SettingsWalletRenderItem[];
  backActive: boolean;
}): Map<number, SettingsWalletRenderItem> {
  const byIndex = new Map<number, SettingsWalletRenderItem[]>();
  for (const item of params.items) {
    const group = byIndex.get(item.idx);
    if (group) {
      group.push(item);
    } else {
      byIndex.set(item.idx, [item]);
    }
  }

  const owners = new Map<number, SettingsWalletRenderItem>();
  for (const [idx, group] of byIndex) {
    const top = getTopItem(group);
    if (top) {
      owners.set(idx, top);
      continue;
    }

    const incomingPrev = getIncomingPrevItem(group);
    const stack = getShallowestStackItem(group);

    if (!incomingPrev) {
      if (stack) owners.set(idx, stack);
      continue;
    }

    if (params.backActive || !stack) {
      owners.set(idx, incomingPrev);
      continue;
    }

    owners.set(idx, stack);
  }

  return owners;
}

export function resolveSettingsWalletContentOwnerKeySet(params: {
  items: SettingsWalletRenderItem[];
  backActive: boolean;
}): Set<string> {
  const owners = resolveSettingsWalletContentOwners(params);
  const keys = new Set<string>();
  for (const owner of owners.values()) {
    keys.add(owner.key);
  }
  return keys;
}

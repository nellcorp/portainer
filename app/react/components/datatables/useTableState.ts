import { useMemo } from 'react';
import { useStore } from 'zustand';

import { useSearchBarState } from './SearchBar';
import { BasicTableSettings, CreatePersistedStoreReturn } from './types';

export function useTableState<
  TSettings extends BasicTableSettings = BasicTableSettings
>(store: CreatePersistedStoreReturn<TSettings>, storageKey: string) {
  const settings = useStore(store);

  const [search, setSearch] = useSearchBarState(storageKey);

  return useMemo(
    () => ({ ...settings, setSearch, search }),
    [settings, search, setSearch]
  );
}

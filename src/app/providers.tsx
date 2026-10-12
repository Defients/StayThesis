import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Partner, PartnerId } from '@/domain/types';
import { PARTNERS } from '@/data/demo/partners';

interface AppContextValue {
  /** The simulated identity the user is currently acting as. */
  actingPartner: Partner;
  setActingPartner: (id: PartnerId) => void;
  /** Demo reset hook — a no-op until the store lands in the next slice. */
  resetDemo: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [partnerId, setPartnerId] = useState<PartnerId>('partner-a');

  const setActingPartner = useCallback((id: PartnerId) => setPartnerId(id), []);
  const resetDemo = useCallback(() => {
    // Intentionally a no-op: the demo store arrives in the next slice.
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      actingPartner: PARTNERS[partnerId],
      setActingPartner,
      resetDemo,
    }),
    [partnerId, setActingPartner, resetDemo],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';
import type { Partner, PartnerId } from '@/domain/types';
import { PARTNERS } from '@/data/demo/partners';
import { createInitialState, type DemoState } from './state';
import { reducer, type Action } from './reducer';

interface StoreContextValue {
  state: DemoState;
  dispatch: Dispatch<Action>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

function useStoreContext(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('Store hooks must be used inside <StoreProvider>');
  return ctx;
}

export function useStore(): DemoState {
  return useStoreContext().state;
}

export function useDispatch(): Dispatch<Action> {
  return useStoreContext().dispatch;
}

/** Convenience hook for the acting partner identity. */
export function useActingPartner(): {
  actingPartner: Partner;
  setActingPartner: (id: PartnerId) => void;
} {
  const { state, dispatch } = useStoreContext();
  return useMemo(
    () => ({
      actingPartner: PARTNERS[state.actingPartnerId],
      setActingPartner: (id: PartnerId) =>
        dispatch({ type: 'SET_ACTING_PARTNER', partnerId: id }),
    }),
    [state.actingPartnerId, dispatch],
  );
}

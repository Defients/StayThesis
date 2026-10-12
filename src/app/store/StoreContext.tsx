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
  workspace: WorkspaceControls;
}

export interface WorkspaceControls {
  mode: 'demo' | 'shared';
  status: 'synced' | 'saving' | 'refreshing' | 'error';
  message?: string;
  refresh?: () => void;
  retry?: () => void;
  signOut?: () => void;
}

const demoWorkspace: WorkspaceControls = { mode: 'demo', status: 'synced' };

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const value = useMemo(() => ({ state, dispatch, workspace: demoWorkspace }), [state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function ConnectedStoreProvider({ state, dispatch, workspace, children }:
  StoreContextValue & { children: ReactNode }) {
  return <StoreContext.Provider value={{ state, dispatch, workspace }}>{children}</StoreContext.Provider>;
}

export function useWorkspace(): WorkspaceControls {
  return useStoreContext().workspace;
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

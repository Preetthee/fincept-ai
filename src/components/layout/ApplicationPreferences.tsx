import { createContext, useContext, useState, type ReactNode } from 'react';
const Context = createContext<{
    hidden: boolean;
    toggle: () => void;
    periodLabel: string;
    setPeriodLabel: (label: string) => void;
} | null>(null);
export function ApplicationPreferences({ children }: {
    children: ReactNode;
}) { const [hidden, setHidden] = useState(() => { try {
    return localStorage.getItem('fincept.money.hidden') === 'true';
}
catch {
    return false;
} }); const [periodLabel, setPeriodLabel] = useState(''); return <Context.Provider value={{ hidden, toggle: () => setHidden(v => { try {
        localStorage.setItem('fincept.money.hidden', String(!v));
    }
    catch { /* nonessential preference */ } return !v; }), periodLabel, setPeriodLabel }}>{children}</Context.Provider>; }
export function usePreferences() { const value = useContext(Context); if (!value)
    throw new Error('ApplicationPreferences missing'); return value; }
export function formatMoney(value: number) { return '৳' + Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
export function Money({ value, signed = false }: {
    value: number;
    signed?: boolean;
}) { const { hidden } = usePreferences(); return <span className="money">{hidden ? <span aria-label="Amount hidden">••••</span> : `${value < 0 ? '−' : signed && value > 0 ? '+' : ''}${formatMoney(value)}`}</span>; }

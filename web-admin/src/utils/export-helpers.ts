
import { API_BASE } from "@/api";

export function monthBoundsFromISO(isoDate: string) {
    const d = new Date(isoDate);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const start = `${y}-${String(m).padStart(2, '0')}-01`;
    // last day
    const nextMonth = new Date(y, m, 0);
    const end = `${y}-${String(m).padStart(2, '0')}-${String(nextMonth.getDate()).padStart(2, '0')}`;
    return { from: start, to: end };
}

export function monthLabelFromISO(isoDate: string) {
    const d = new Date(isoDate);
    return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

export function weekRomanForDay(day: number) {
    if (day >= 1 && day < 8) return 'I';
    if (day >= 8 && day < 15) return 'II';
    if (day >= 15 && day < 22) return 'III';
    if (day >= 22 && day < 29) return 'IV';
    return 'V';
}

export async function fetchAllInRange({ from, to, marketId }: { from: string, to: string, marketId: number }) {
    // Use existing API or fetch manually
    const url = new URL(`${API_BASE}/reports/range`);
    url.searchParams.set('startDate', from);
    url.searchParams.set('endDate', to);
    if (marketId && marketId !== -1) {
        url.searchParams.set('marketId', String(marketId));
    }

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error("Failed to fetch range");
    const json = await res.json();
    return Array.isArray(json) ? json : (json.data || []);
}

export function exportPreview(data: any) {
    // This is a placeholder for the preview modal logic
    // In a real app we might open a new window or trigger a modal state
    console.log("Preview Data:", data);
    alert("Preview generated in console (Not fully implemented in restoration)");
}

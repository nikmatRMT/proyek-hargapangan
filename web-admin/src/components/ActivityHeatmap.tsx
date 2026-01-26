import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CalendarDay {
    date: string;
    count: number;
    status: 'input' | 'missed' | 'weekend';
}

interface Props {
    calendar: CalendarDay[];
}

const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export default function ActivityHeatmap({ calendar }: Props) {
    // Group by week (7 days per row, starting Monday)
    const weeks = useMemo(() => {
        if (!calendar.length) return [];

        // Sort ascending
        const sorted = [...calendar].sort((a, b) => a.date.localeCompare(b.date));

        const result: CalendarDay[][] = [];
        let currentWeek: CalendarDay[] = [];

        // Fill initial empty days to align to Monday
        const firstDate = new Date(sorted[0].date);
        const firstDayOfWeek = (firstDate.getDay() + 6) % 7; // Convert to Mon=0
        for (let i = 0; i < firstDayOfWeek; i++) {
            currentWeek.push({ date: '', count: 0, status: 'weekend' }); // placeholder
        }

        for (const day of sorted) {
            currentWeek.push(day);
            if (currentWeek.length === 7) {
                result.push(currentWeek);
                currentWeek = [];
            }
        }

        // Push remaining days
        if (currentWeek.length > 0) {
            result.push(currentWeek);
        }

        return result;
    }, [calendar]);

    const getColor = (day: CalendarDay) => {
        if (!day.date) return 'bg-transparent';
        if (day.status === 'weekend') return 'bg-gray-100 dark:bg-gray-800';
        if (day.status === 'missed') return 'bg-red-200 dark:bg-red-900';
        // Input - intensity based on count
        if (day.count >= 20) return 'bg-green-600';
        if (day.count >= 10) return 'bg-green-500';
        if (day.count >= 5) return 'bg-green-400';
        return 'bg-green-300';
    };

    const formatDateId = (dateStr: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
    };

    return (
        <Card className="shadow-sm">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <span className="w-1 h-5 bg-green-500 rounded-full block"></span>
                    Kalender Aktivitas
                </CardTitle>
                <CardDescription>Visualisasi input data harian</CardDescription>
            </CardHeader>
            <CardContent>
                {/* Legend */}
                <div className="flex items-center gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-green-500"></div>
                        <span className="text-gray-600">Input</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-red-200"></div>
                        <span className="text-gray-600">Tidak Input</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-200"></div>
                        <span className="text-gray-600">Weekend</span>
                    </div>
                </div>

                {/* Heatmap Grid */}
                <TooltipProvider delayDuration={100}>
                    <div className="overflow-x-auto pb-2">
                        <div className="flex gap-1" style={{ minWidth: 'max-content' }}>
                            {weeks.map((week, wIdx) => (
                                <div key={wIdx} className="flex flex-col gap-1">
                                    {week.map((day, dIdx) => (
                                        <Tooltip key={dIdx}>
                                            <TooltipTrigger asChild>
                                                <div
                                                    className={`w-4 h-4 rounded-sm cursor-default transition-transform hover:scale-110 ${getColor(day)}`}
                                                />
                                            </TooltipTrigger>
                                            {day.date && (
                                                <TooltipContent side="top" className="text-xs">
                                                    <p className="font-medium">{formatDateId(day.date)}</p>
                                                    <p className="text-gray-400">
                                                        {day.status === 'input' ? `${day.count} item` : day.status === 'missed' ? 'Tidak input' : 'Weekend'}
                                                    </p>
                                                </TooltipContent>
                                            )}
                                        </Tooltip>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </TooltipProvider>
            </CardContent>
        </Card>
    );
}

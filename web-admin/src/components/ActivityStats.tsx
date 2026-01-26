import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, TrendingUp, AlertTriangle, Flame } from 'lucide-react';

interface Props {
    summary: {
        totalDaysThisMonth: number;
        daysWithInput: number;
        missedDays: number;
        longestStreak: number;
        consistencyScore: number;
    };
}

export default function ActivityStats({ summary }: Props) {
    const stats = [
        {
            label: 'Input Bulan Ini',
            value: `${summary.daysWithInput}/${summary.totalDaysThisMonth}`,
            subtext: 'hari kerja',
            icon: Calendar,
            color: 'text-blue-600',
            bg: 'bg-blue-100',
        },
        {
            label: 'Hari Kosong',
            value: summary.missedDays,
            subtext: 'tidak input',
            icon: AlertTriangle,
            color: 'text-orange-600',
            bg: 'bg-orange-100',
        },
        {
            label: 'Streak Terpanjang',
            value: summary.longestStreak,
            subtext: 'hari berturut',
            icon: Flame,
            color: 'text-red-600',
            bg: 'bg-red-100',
        },
        {
            label: 'Skor Konsistensi',
            value: `${summary.consistencyScore}%`,
            subtext: 'kehadiran',
            icon: TrendingUp,
            color: summary.consistencyScore >= 80 ? 'text-green-600' : summary.consistencyScore >= 50 ? 'text-yellow-600' : 'text-red-600',
            bg: summary.consistencyScore >= 80 ? 'bg-green-100' : summary.consistencyScore >= 50 ? 'bg-yellow-100' : 'bg-red-100',
        },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, idx) => (
                <Card key={idx} className="shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-full ${stat.bg} grid place-items-center shrink-0`}>
                            <stat.icon className={`h-6 w-6 ${stat.color}`} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                            <p className="text-sm text-gray-500 truncate">{stat.label}</p>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

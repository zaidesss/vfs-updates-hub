import { Card, CardContent } from '@/components/ui/card';
import { FileWarning, Eye, CheckCircle, ArrowUpRight } from 'lucide-react';
import type { ReportSummary } from '@/lib/agentReportsApi';

interface ReportSummaryCardsProps {
  summary: ReportSummary | null;
  isLoading: boolean;
}

export function ReportSummaryCards({ summary, isLoading }: ReportSummaryCardsProps) {
  const cards = [
    {
      label: 'Total Reports',
      value: summary?.total || 0,
      icon: FileWarning,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      label: 'Open',
      value: summary?.open || 0,
      icon: Eye,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950',
    },
    {
      label: 'Escalated',
      value: summary?.reviewed || 0,
      icon: ArrowUpRight,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
    },
    {
      label: 'Validated',
      value: summary?.validated || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label} className={card.bgColor}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <card.icon className={`h-8 w-8 ${card.color}`} />
              <div>
                <p className="text-2xl font-bold">
                  {isLoading ? '-' : card.value}
                </p>
                <p className="text-sm text-muted-foreground">{card.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

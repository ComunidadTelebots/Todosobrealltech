import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

const StatCard = ({ 
  icon: Icon, 
  title, 
  value, 
  percentage, 
  trend = 'neutral', 
  description, 
  status = 'default', 
  onClick 
}) => {
  const statusColors = {
    default: 'text-muted-foreground bg-muted/10',
    success: 'text-green-600 bg-green-500/10',
    warning: 'text-yellow-600 bg-yellow-500/10',
    danger: 'text-destructive bg-destructive/10',
  };

  const trendConfig = {
    up: { icon: ArrowUpRight, color: 'text-green-600' },
    down: { icon: ArrowDownRight, color: 'text-destructive' },
    neutral: { icon: Minus, color: 'text-muted-foreground' }
  };

  const TrendIcon = trendConfig[trend].icon;

  return (
    <Card 
      onClick={onClick}
      className={cn(
        "relative overflow-hidden transition-all duration-300",
        onClick ? "cursor-pointer hover:-translate-y-1 hover:shadow-lg hover:border-primary/30 group" : ""
      )}
    >
      {onClick && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      )}
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", statusColors[status])}>
          <Icon className="w-4 h-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline space-x-3">
          <div className="text-3xl font-bold tracking-tight">{value}</div>
          {percentage && (
            <div className={cn("flex items-center text-sm font-medium", trendConfig[trend].color)}>
              <TrendIcon className="w-3 h-3 mr-0.5" />
              {percentage}
            </div>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-2">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
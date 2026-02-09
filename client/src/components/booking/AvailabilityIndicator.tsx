import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvailabilityIndicatorProps {
  available: number;
  capacity: number;
  serviceType: string;
  className?: string;
}

export function AvailabilityIndicator({ 
  available, 
  capacity, 
  serviceType,
  className 
}: AvailabilityIndicatorProps) {
  const percentageAvailable = (available / capacity) * 100;
  
  // Determine status based on percentage
  const status = 
    available === 0 ? 'full' :
    percentageAvailable <= 25 ? 'limited' :
    'available';

  const statusConfig = {
    available: {
      icon: CheckCircle,
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
      textColor: 'text-green-800 dark:text-green-200',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    limited: {
      icon: AlertTriangle,
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      borderColor: 'border-amber-200 dark:border-amber-800',
      textColor: 'text-amber-800 dark:text-amber-200',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    full: {
      icon: AlertCircle,
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      textColor: 'text-red-800 dark:text-red-200',
      iconColor: 'text-red-600 dark:text-red-400',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  const getMessage = () => {
    if (status === 'full') {
      return 'Fully booked - please select another date';
    }
    if (status === 'limited') {
      return `Limited availability: ${available} of ${capacity} spots remaining`;
    }
    return `${available} of ${capacity} spots available`;
  };

  return (
    <div 
      className={cn(
        "flex items-start gap-3 p-3 sm:p-4 rounded-lg border",
        config.bgColor,
        config.borderColor,
        className
      )}
      data-testid={`availability-indicator-${status}`}
    >
      <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", config.iconColor)} />
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium", config.textColor)}>
          {getMessage()}
        </p>
      </div>
    </div>
  );
}

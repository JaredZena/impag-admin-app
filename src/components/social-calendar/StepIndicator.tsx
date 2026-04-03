import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StepIndicatorProps {
  active: boolean;
  completed: boolean;
  label: string;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ active, completed, label }) => {
  return (
    <div className="flex items-center gap-3">
      <div className={cn(
        'w-7 h-7 rounded-full flex items-center justify-center border-2 flex-shrink-0 transition-all duration-200',
        completed && 'bg-green-50 border-green-500',
        active && !completed && 'bg-white border-blue-500 animate-pulse',
        !active && !completed && 'bg-gray-50 border-gray-200'
      )}>
        {completed
          ? <Check size={14} className="text-green-600" />
          : <div className={cn('w-2 h-2 rounded-full', active ? 'bg-blue-500' : 'bg-gray-300')} />
        }
      </div>
      <span className={cn(
        'text-sm transition-all duration-200',
        completed && 'text-green-600 font-medium',
        active && !completed && 'text-gray-900 font-medium',
        !active && !completed && 'text-gray-400'
      )}>
        {label}
      </span>
    </div>
  );
};

export default StepIndicator;

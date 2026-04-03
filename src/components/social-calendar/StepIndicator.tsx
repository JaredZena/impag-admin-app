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
        'w-8 h-8 rounded-full flex items-center justify-center border-2 flex-shrink-0 transition-all duration-300',
        completed && 'bg-green-100 border-green-400 text-green-600',
        active && !completed && 'bg-white border-green-500 animate-pulse shadow-sm',
        !active && !completed && 'bg-gray-50 border-gray-200'
      )}>
        {completed ? (
          <Check size={16} className="text-green-600" />
        ) : (
          <div className={cn(
            'w-2 h-2 rounded-full transition-all duration-300',
            active ? 'bg-green-500' : 'bg-gray-300'
          )} />
        )}
      </div>
      <span className={cn(
        'text-sm transition-all duration-300',
        completed && 'text-green-600 font-semibold',
        active && !completed && 'text-green-800 font-semibold',
        !active && !completed && 'text-gray-400 font-normal'
      )}>
        {label}
      </span>
    </div>
  );
};

export default StepIndicator;

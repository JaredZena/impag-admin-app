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
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center border-2 flex-shrink-0 transition-all duration-300',
          completed && 'bg-green-400/20 border-green-400 text-green-400',
          active && !completed && 'bg-violet-500/30 border-violet-400 animate-pulse',
          !active && !completed && 'bg-white/5 border-white/20 text-slate-500'
        )}
      >
        {completed ? (
          <Check size={16} className="text-green-400" />
        ) : (
          <div
            className={cn(
              'w-2 h-2 rounded-full transition-all duration-300',
              active ? 'bg-violet-300' : 'bg-slate-500'
            )}
          />
        )}
      </div>
      <span
        className={cn(
          'text-sm transition-all duration-300',
          completed && 'text-green-400 font-semibold',
          active && !completed && 'text-slate-100 font-semibold',
          !active && !completed && 'text-slate-500 font-normal'
        )}
      >
        {label}
      </span>
    </div>
  );
};

export default StepIndicator;

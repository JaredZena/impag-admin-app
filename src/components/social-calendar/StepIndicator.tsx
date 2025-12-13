import React from 'react';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  active: boolean;
  completed: boolean;
  label: string;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ active, completed, label }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '1rem'
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: completed 
          ? 'rgba(74, 222, 128, 0.2)' 
          : active 
            ? 'rgba(139, 92, 246, 0.3)' 
            : 'rgba(255, 255, 255, 0.1)',
        border: `2px solid ${completed 
          ? '#4ade80' 
          : active 
            ? '#8b5cf6' 
            : 'rgba(255, 255, 255, 0.2)'}`,
        color: completed 
          ? '#4ade80' 
          : active 
            ? '#c4b5fd' 
            : '#64748b',
        transition: 'all 0.3s',
        flexShrink: 0
      }} className={active && !completed ? 'step-active' : ''}>
        {completed ? (
          <Check size={18} />
        ) : (
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: active ? '#c4b5fd' : '#64748b'
          }} />
        )}
      </div>
      <span style={{
        fontSize: '0.9rem',
        color: completed 
          ? '#4ade80' 
          : active 
            ? '#e2e8f0' 
            : '#64748b',
        fontWeight: active || completed ? 600 : 400,
        transition: 'all 0.3s'
      }}>
        {label}
      </span>
    </div>
  );
};

export default StepIndicator;

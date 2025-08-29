import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'gray';
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  color = 'blue',
  text 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  const colorClasses = {
    blue: 'border-blue-600',
    green: 'border-green-600',
    gray: 'border-gray-600'
  };

  const textColorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    gray: 'text-gray-600'
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      <div 
        className={`animate-spin rounded-full border-b-2 ${sizeClasses[size]} ${colorClasses[color]}`}
      />
      {text && (
        <span className={`text-sm ${textColorClasses[color]} font-medium`}>
          {text}
        </span>
      )}
    </div>
  );
};

export default LoadingSpinner;


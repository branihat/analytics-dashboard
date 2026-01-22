import React from 'react';

const KPICard = ({ title, value, icon: Icon, color = 'blue', trend, subtitle }) => {
  const colorClasses = {
    blue: 'bg-blue-500 text-blue-100',
    red: 'bg-red-500 text-red-100',
    green: 'bg-green-500 text-green-100',
    yellow: 'bg-yellow-500 text-yellow-100',
    purple: 'bg-purple-500 text-purple-100',
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 truncate">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      
      {trend && (
        <div className="mt-4 flex items-center">
          <span className={`text-sm font-medium ${
            trend.type === 'increase' ? 'text-green-600' : 
            trend.type === 'decrease' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {trend.value}
          </span>
          <span className="text-sm text-gray-500 ml-2">{trend.label}</span>
        </div>
      )}
    </div>
  );
};

export default KPICard; 
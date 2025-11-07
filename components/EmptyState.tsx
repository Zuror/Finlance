
import React from 'react';

interface EmptyStateProps {
  illustration: React.ReactNode;
  title: string;
  message: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ illustration, title, message }) => {
  return (
    <div className="text-center py-12 px-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="mx-auto w-32 h-32 text-gray-400 dark:text-gray-500">
        {illustration}
      </div>
      <h3 className="mt-4 text-xl font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
};

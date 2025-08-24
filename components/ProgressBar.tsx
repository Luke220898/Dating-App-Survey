
import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ current, total }) => {
  const progress = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="w-full bg-lightgray rounded-full h-2.5">
      <div
        className="bg-success h-2.5 rounded-full"
        style={{ width: `${progress}%` }}
      ></div>
    </div>
  );
};

export default ProgressBar;
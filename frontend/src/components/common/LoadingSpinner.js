// d:\Coding\Mast Pharmacy\frontend\src\components\common\LoadingSpinner.js
import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 'medium', color = 'primary' }) => {
  let sizeClass = '';
  switch (size) {
    case 'small':
      sizeClass = 'spinner-circle-sm';
      break;
    case 'large':
      sizeClass = 'spinner-circle-lg';
      break;
    default:
      sizeClass = 'spinner-circle-md';
  }

  return (
    <div className={`spinner-circle-container ${color}`}>
      <div className={`spinner-circle ${sizeClass}`}></div>
    </div>
  );
};

export default LoadingSpinner;

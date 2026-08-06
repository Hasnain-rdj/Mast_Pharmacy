// d:\Coding\Mast Pharmacy\frontend\src\components\common\Tooltip.js
import React, { useState } from 'react';
import './Tooltip.css';

const Tooltip = ({ text, children, position = 'top', className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className={`tooltip-container ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onTouchStart={() => setIsVisible(!isVisible)}
    >
      {children}
      <div className={`tooltip-text ${position} ${isVisible ? 'visible' : ''}`}>
        {text}
      </div>
    </div>
  );
};

export default Tooltip;

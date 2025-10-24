import React from 'react';
// PERBAIKAN: Path impor diubah untuk menunjuk ke lokasi yang benar
import { useDarkMode } from './useDarkMode'; 

// Impor ikon
import iconDarkMode from '../assets/mode/DarkMode.png';
import iconLightMode from '../assets/mode/LightMode.png';

const DarkModeToggle = () => {
  const [theme, toggleTheme] = useDarkMode();

  const isDark = theme === 'dark';
  const icon = isDark ? iconLightMode : iconDarkMode;
  const label = isDark ? 'Lightmode' : 'Darkmode';

  return (
    <div className="sidebar-icon" onClick={toggleTheme} style={{ marginTop: 'auto', marginBottom: '20px' }}>
      <img src={icon} alt="Theme Toggle" />
      <span className="sidebar-label">{label}</span>
    </div>
  );
};

export default DarkModeToggle;


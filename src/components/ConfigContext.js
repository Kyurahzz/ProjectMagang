import React, { createContext, useState, useContext } from 'react';

// 1. Membuat context (saluran komunikasinya)
const ConfigContext = createContext();

// 2. Membuat "Hook" agar komponen lain bisa pakai context ini dengan mudah
export function useConfig() {
  return useContext(ConfigContext);
}

// 3. Membuat "Provider" yang akan membungkus aplikasi Anda
export function ConfigProvider({ children }) {
  // State untuk masing-masing popup, sekarang terpisah dan global
  const [isGpsConfigOpen, setIsGpsConfigOpen] = useState(false);
  const [isGyroConfigOpen, setIsGyroConfigOpen] = useState(false);

  // Nilai-nilai yang akan dibagikan ke seluruh aplikasi
  const value = {
    isGpsConfigOpen,
    openGpsConfig: () => setIsGpsConfigOpen(true),
    closeGpsConfig: () => setIsGpsConfigOpen(false),

    isGyroConfigOpen,
    openGyroConfig: () => setIsGyroConfigOpen(true),
    closeGyroConfig: () => setIsGyroConfigOpen(false),
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
}

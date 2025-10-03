import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import "./components/SimulatorFrom.css";
import ConfigPopup from './components/ConfigPopup';
import ConfirmationPopup from './components/ConfirmationPopUp';
import DarkModeToggle from './components/DarkModeToggle';
import GyroPage from './components/GyroPage';
import { ConfigProvider, useConfig } from './components/ConfigContext';

// --- 1. Asset Imports ---
// Ikon Sidebar
import iconDashboard from './assets/inactive/Property 1=Dashboard_icon-Default.png';
import iconGPSDefault from './assets/inactive/ButtonID=GPS_icon-Default.png';
import iconGPSActive from './assets/active/ButtonID=GPS_icon-Active.png';
import iconGyroDefault from './assets/inactive/ButtonID=Gyro_icon-Default.png';
import iconGyroActive from './assets/active/ButtonID=Gyro_icon-Active.png';
import iconThermal from './assets/inactive/ButtonID=Thermal_icon-Default.png';
import iconPlaceHolder2 from './assets/inactive/ButtonID=Placeholder2_icon-Default.png';
import iconPlaceHolder3 from './assets/inactive/ButtonID=Placeholder3_icon-Default.png';

// Gambar Status
import statusWaiting from './assets/status/Property 1=Waiting.png';
import statusActive from './assets/status/Property 1=Active.png';
import statusStopImg from './assets/status/Property 1=Stop.png';

// Ikon Tombol
import iconSend from './assets/icon/PropertySend.png';
import iconStop from './assets/icon/PropertyStop.png';
import iconDelete from './assets/icon/PropertyDelete.png';
import iconEditPanel from './assets/icon/PropertyEdit.png';
import iconDeletePanel from './assets/icon/PropertyDelete.png';


// --- 2. Komponen Inti Aplikasi ---
const AppContent = () => {
  // --- A. State Utama & Navigasi ---
  const [activeMenu, setActiveMenu] = useState('GPS');
  const { openGpsConfig, openGyroConfig, isGpsConfigOpen, closeGpsConfig } = useConfig();

  const pageTitles = {
    Dashboard: 'Dashboard',
    GPS: 'NDDU Simulator',
    Gyro: 'Gyroscope Simulator',
    Thermal: 'Thermal Simulator',
    Sensor: 'Sensor View',
    Chart: 'Chart View'
  };

  // --- B. State untuk Halaman GPS ---
  const defaultInput = { latitude: 58.430493, longitude: 15.732333, variation: 6.4, cog: 30.0, sog: 0.5 };
  const defaultConfig = { ip: '192.168.1.1', port: '1883', topic: ['gps/sim', 'device/data'], username: 'admin', password: 'admin', updateRate: '1000' };
  const emptyConfig = { ip: '', port: '', topic: [], username: '', password: '', updateRate: '' };

  // State Data & Input
  const [inputData, setInputData] = useState(defaultInput);
  const [editData, setEditData] = useState(defaultInput);
  const [animatedData, setAnimatedData] = useState(defaultInput);
  const [isEditingData, setIsEditingData] = useState(false);
  const [editWarning, setEditWarning] = useState('');
  
  // State Simulasi & Status
  const [isSimulationActive, setIsSimulationActive] = useState(false);
  const [status, setStatus] = useState('Stop');
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date().toISOString());
  const [dataSent, setDataSent] = useState(false);
  const [isRecordCreated, setIsRecordCreated] = useState(false);

  // State Konfigurasi & Popup
  const [config, setConfig] = useState(defaultConfig);
  const [configSaved, setConfigSaved] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);
  const [confirmPopup, setConfirmPopup] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  
  const wsClient = useRef(null);
  const animationFrameId = useRef(null);
  const animationData = useRef({
    start: defaultInput,
    target: defaultInput,
    startTime: 0,
  });

  // --- C. Fungsi Helper & Formatter ---
  const formatDateTime = (isoString) => { if (!isoString) return "N/A"; try { const date = new Date(isoString); const day = String(date.getDate()).padStart(2, '0'); const month = date.toLocaleString('en-GB', { month: 'short' }); const year = date.getFullYear(); const hours = String(date.getHours()).padStart(2, '0'); const minutes = String(date.getMinutes()).padStart(2, '0'); const seconds = String(date.getSeconds()).padStart(2, '0'); return `${day} ${month} ${year}, ${hours}:${minutes}:${seconds}`; } catch (error) { console.error("Invalid date format:", isoString); return isoString; } };
  const calcMagneticVariation = (lat, lon) => { if (lat === '' || lon === '' || isNaN(lat) || isNaN(lon)) return ''; return parseFloat((2.5 * Math.sin((lat / 90) * Math.PI) + 1.2 * Math.cos((lon / 180) * Math.PI)).toFixed(2)); };
  const toDMS = (coord, isLatitude) => { if (coord === null || coord === undefined || isNaN(coord)) return "--° --' --\" --"; const absolute = Math.abs(coord); const degrees = Math.floor(absolute); const minutesNotTruncated = (absolute - degrees) * 60; const minutes = Math.floor(minutesNotTruncated); const seconds = Math.floor((minutesNotTruncated - minutes) * 60); const direction = isLatitude ? (coord >= 0 ? 'N' : 'S') : (coord >= 0 ? 'E' : 'W'); return `${Math.abs(degrees)}° ${minutes}' ${seconds}" ${direction}`; };
  const renderStatusImage = () => { switch (status) { case 'Running': return <img src={statusActive} alt="Active" className="status-image" />; case 'Stop': return <img src={statusStopImg} alt="Stop" className="status-image" />; case 'API Error': return <img src={statusStopImg} alt="Error" className="status-image" />; default: return <img src={statusWaiting} alt="Waiting" className="status-image" />; } };
  const formatNumber = (value, decimals = 1) => (value === null || value === undefined || isNaN(value)) ? '--' : parseFloat(value).toFixed(decimals);

  const animate = useCallback(() => {
    const now = Date.now();
    const { start, target, startTime } = animationData.current;
    const duration = parseInt(config.updateRate, 10) || 1000;
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const lerp = (start, end, amt) => (1 - amt) * start + amt * end;
    const currentData = {
      latitude: lerp(Number(start.latitude) || 0, Number(target.latitude) || 0, progress),
      longitude: lerp(Number(start.longitude) || 0, Number(target.longitude) || 0, progress),
      sog: lerp(Number(start.sog) || 0, Number(target.sog) || 0, progress),
      cog: lerp(Number(start.cog) || 0, Number(target.cog) || 0, progress),
      variation: lerp(Number(start.variation) || 0, Number(target.variation) || 0, progress),
    };
    setAnimatedData(currentData);
    if (progress < 1) {
      animationFrameId.current = requestAnimationFrame(animate);
    }
  }, [config.updateRate]);

  // --- D. Event Handlers ---
  const handleHeaderConfigClick = () => {
    if (activeMenu === 'GPS') { openGpsConfig(); } 
    else if (activeMenu === 'Gyro') { openGyroConfig(); }
  };

  const handleInputChange = (e) => { 
    const { name, value } = e.target; 
    const showWarning = (message) => { setEditWarning(message); setTimeout(() => setEditWarning(''), 3000); }; 
    if (value === '') { setEditData(prev => ({ ...prev, [name]: '' })); return; } 
    let newValue = parseFloat(value); 
    if (isNaN(newValue)) { setEditData(prev => ({ ...prev, [name]: value })); return; } 
    if (name === 'latitude') { if (newValue > 90 || newValue < -90) showWarning('Latitude must be between -90 and 90.'); newValue = Math.max(-90, Math.min(90, newValue)); } 
    if (name === 'longitude') { if (newValue > 180 || newValue < -180) showWarning('Longitude will be wrapped between -180 and 180.'); while (newValue > 180) newValue -= 360; while (newValue < -180) newValue += 360; } 
    if (name === 'cog') { if (newValue > 360 || newValue < 0) showWarning('Course must be between 0 and 360.'); newValue = (newValue % 360 + 360) % 360; } 
    if (name === 'sog') { if (newValue < 0) showWarning('Speed cannot be negative.'); newValue = Math.max(0, newValue); } 
    setEditData(prev => ({ ...prev, [name]: newValue })); 
  };

  const handleStartSimulation = async () => { 
    setIsSimulationActive(true); setStatus('Running'); setIsEditingData(false); 
    const dataToStart = { ...inputData };
    setAnimatedData(dataToStart);
    animationData.current = { start: dataToStart, target: dataToStart, startTime: Date.now() };

    const payload = { latitude: parseFloat(dataToStart.latitude) || 0, longitude: parseFloat(dataToStart.longitude) || 0, sog: parseFloat(dataToStart.sog) || 0, cog: parseFloat(dataToStart.cog) || 0, update_rate: parseInt(config.updateRate, 10) || 1000, is_running: true }; 
    try { 
      const method = isRecordCreated ? 'patch' : 'post'; 
      const response = await axios[method]('http://localhost:8080/api/gps', payload); 
      const dataFromServer = response.data.data; 
      const newData = { latitude: dataFromServer.latitude, longitude: dataFromServer.longitude, sog: dataFromServer.sog, cog: dataFromServer.cog, variation: dataFromServer.variation }; 
      setInputData(newData); setIsRecordCreated(true); 
    } catch (error) { console.error("Axios Error:", error.response || error); setStatus('API Error'); setIsSimulationActive(false); } 
  };

  const handleStopSimulation = async () => { 
    if (animationFrameId.current) { cancelAnimationFrame(animationFrameId.current); }
    setStatus('Waiting...'); 
    try { 
      await axios.patch('http://localhost:8080/api/gps', { is_running: false }); 
      setIsSimulationActive(false); setStatus('Stop'); setIsEditingData(false); 
    } catch (error) { console.error("Axios Error:", error.response || error); setStatus('API Error'); } 
  };

  const handleSendData = async () => { 
    const payload = { latitude: parseFloat(editData.latitude) || 0, longitude: parseFloat(editData.longitude) || 0, sog: parseFloat(editData.sog) || 0, cog: parseFloat(editData.cog) || 0, is_running: false }; 
    try { 
      const method = isRecordCreated ? 'patch' : 'post'; 
      const response = await axios[method]('http://localhost:8080/api/gps', payload); 
      if (method === 'post') { await axios.patch('http://localhost:8080/api/gps', { is_running: false }); } 
      const dataFromServer = response.data.data; 
      const newData = { latitude: dataFromServer.latitude, longitude: dataFromServer.longitude, sog: dataFromServer.sog, cog: dataFromServer.cog, variation: dataFromServer.variation }; 
      setInputData(newData); setAnimatedData(newData); setStatus('Stop'); setIsSimulationActive(false); 
      if (!isRecordCreated) { setIsRecordCreated(true); } 
      setDataSent(true); setTimeout(() => setDataSent(false), 2000); 
    } catch (error) { console.error("Axios Error:", error.response || error); setStatus('API Error'); } 
  };
  
  const executeClearForm = async () => { 
    try { 
      await axios.delete('http://localhost:8080/api/gps'); 
      const emptyData = { latitude: '', longitude: '', variation: '', cog: '', sog: '' }; 
      setEditData(emptyData); setInputData(emptyData); setAnimatedData(emptyData);
      if (isSimulationActive) { await handleStopSimulation(); } 
      setIsRecordCreated(false); 
    } catch (error) { console.error("Axios Error:", error.response || error); setStatus('API Error'); } 
    closeConfirmPopup(); 
  };
  
  const executeClearEditForm = () => { 
    const emptyData = { latitude: '', longitude: '', variation: '', cog: '', sog: '' }; 
    setEditData(emptyData); 
    closeConfirmPopup(); 
  }
  
  const openConfirmPopup = (type) => { 
    if (type === 'clearData') { setConfirmPopup({ isOpen: true, title: 'Hapus Data Simulasi', message: 'Apakah Anda yakin ingin menghapus semua data simulasi?', onConfirm: () => executeClearForm() }); } 
    else if (type === 'clearInput') { setConfirmPopup({ isOpen: true, title: 'Hapus Input', message: 'Apakah Anda yakin ingin mengosongkan semua input di panel Edit Data?', onConfirm: () => executeClearEditForm() }); } 
  };
  
  const closeConfirmPopup = () => { setConfirmPopup({ isOpen: false, title: '', message: '', onConfirm: () => {} }); };

  const handleToggleAndApplyEdit = () => {
    if (isEditingData) {
      const newVariation = calcMagneticVariation(Number(editData.latitude), Number(editData.longitude));
      const dataToApply = { ...editData, variation: newVariation, };
      setInputData(dataToApply);
      setAnimatedData(dataToApply);
      setEditData(dataToApply);
      setIsEditingData(false);
    } else {
      setIsEditingData(true);
    }
  };

  const handleDefaultConfig = () => setConfig(defaultConfig);
  const handleClearConfig = () => { setConfig(emptyConfig); setIsConfigured(false); localStorage.removeItem('gpsConfig'); };
  const handleApplyConfig = (appliedConfig) => setConfig(appliedConfig);
  const handleConfigSave = (newConfig) => { const isNewConfigValid = Object.entries(newConfig).every(([key, value]) => { if (key === 'topic') return Array.isArray(value) && value.length > 0; return String(value).trim() !== ''; }); if (isNewConfigValid) { setConfig(newConfig); localStorage.setItem('gpsConfig', JSON.stringify(newConfig)); setConfigSaved(true); setTimeout(() => setConfigSaved(false), 2000); setIsConfigured(true); closeGpsConfig(); } else { setIsConfigured(false); console.error("Attempted to save an invalid configuration."); } };
  const handleResetForm = () => { setEditData(defaultInput); };

  // --- E. Side Effects (useEffect) ---
  const simulationStatusRef = useRef(isSimulationActive);
  useEffect(() => { 
    simulationStatusRef.current = isSimulationActive; 
  }, [isSimulationActive]);

  useEffect(() => { 
    const fetchInitialData = async () => { 
      try { 
        const response = await axios.get('http://localhost:8080/api/gps'); 
        const data = response.data.data; 
        const initialData = { latitude: data.latitude, longitude: data.longitude, sog: data.sog, cog: data.cog, variation: data.variation }; 
        setInputData(initialData); setEditData(initialData); setAnimatedData(initialData);
        setIsSimulationActive(data.is_running); setStatus(data.is_running ? 'Running' : 'Stop'); 
        setIsConfigured(true); setIsRecordCreated(true); 
        if(data.is_running) { setIsEditingData(false); }
      } catch (error) { 
        if (error.response && error.response.status === 404) { console.log("No initial GPS data found on server."); setIsConfigured(true); setIsRecordCreated(false); } 
        else { console.error("Axios Error:", error.response || error); setStatus('API Error'); } 
      } 
    }; 
    fetchInitialData(); 
    
    wsClient.current = new WebSocket('ws://localhost:8081'); 
    wsClient.current.onopen = () => { if (!simulationStatusRef.current) { setStatus('Stop'); } }; 
    wsClient.current.onmessage = (event) => { 
      try { 
        const messageData = JSON.parse(event.data); 
        if (messageData.type === 'gps_update' && messageData.data) { 
          const { latitude, longitude, sog, cog, variation, last_update, is_running } = messageData.data; 
          const newData = { latitude, longitude, sog, cog, variation }; 
          setLastUpdateTime(last_update || new Date().toISOString()); 

          if (simulationStatusRef.current) {
            animationData.current.start = animationData.current.target;
            animationData.current.target = newData;
            animationData.current.startTime = Date.now();
            if (animationFrameId.current) { cancelAnimationFrame(animationFrameId.current); }
            animationFrameId.current = requestAnimationFrame(animate);
          } else {
            setInputData(newData); setAnimatedData(newData); setEditData(newData);
          }
          
          if (simulationStatusRef.current && !is_running) { 
            setIsSimulationActive(false); 
            setStatus('Stop'); 
            setIsEditingData(false); 
          } 
        } 
      } catch (error) { console.error('Error parsing WebSocket message:', error); } 
    }; 
    
    wsClient.current.onclose = () => { setStatus('Disconnected'); setIsSimulationActive(false); }; 
    wsClient.current.onerror = () => setStatus('Error'); 
    
    return () => {
      if (animationFrameId.current) { cancelAnimationFrame(animationFrameId.current); }
      wsClient.current.close();
    }; 
  }, [animate]);

  // --- F. Render Logic ---
  const displayData = isSimulationActive ? animatedData : inputData;
  const isDisabled = !isConfigured;

  // Komponen Halaman Placeholder
  const Dashboard = () => <div style={{width: '100%', padding: '20px'}}>Dashboard Page Content</div>;
  const Thermal = () => <div style={{width: '100%', padding: '20px'}}>Thermal Page Content</div>;
  const Sensor = () => <div style={{width: '100%', padding: '20px'}}>Sensor Page Content</div>;
  const Chart = () => <div style={{width: '100%', padding: '20px'}}>Chart Page Content</div>;
  const GpsPage = ({ children }) => <>{children}</>;

  // --- G. Tampilan / JSX ---
  return (
    <div className="simulator-container">
      <div className="sidebar">
        <div className={`sidebar-icon${activeMenu === 'Dashboard' ? ' active' : ''}`} onClick={() => setActiveMenu('Dashboard')}><img src={iconDashboard} alt="Dashboard" /><span className="sidebar-label">Dashboard</span></div>
        <div className={`sidebar-icon${activeMenu === 'GPS' ? ' active' : ''}`} onClick={() => setActiveMenu('GPS')}><img src={isSimulationActive ? iconGPSActive : iconGPSDefault} alt="GPS" /><span className="sidebar-label">GPS</span></div>
        <div className={`sidebar-icon${activeMenu === 'Gyro' ? ' active' : ''}`} onClick={() => setActiveMenu('Gyro')}><img src={iconGyroDefault} alt="Gyro" /><span className="sidebar-label">Gyroscope</span></div>
        <div className={`sidebar-icon${activeMenu === 'Thermal' ? ' active' : ''}`} onClick={() => setActiveMenu('Thermal')}><img src={iconThermal} alt="Thermal" /><span className="sidebar-label">Thermal</span></div>
        <div className={`sidebar-icon${activeMenu === 'Sensor' ? ' active' : ''}`} onClick={() => setActiveMenu('Sensor')}><img src={iconPlaceHolder2} alt="Sensor" /><span className="sidebar-label">Sensor</span></div>
        <div className={`sidebar-icon${activeMenu === 'Chart' ? ' active' : ''}`} onClick={() => setActiveMenu('Chart')}><img src={iconPlaceHolder3} alt="Chart" /><span className="sidebar-label">Chart</span></div>
        <DarkModeToggle />
      </div>
      <div className="main-content-wrapper">
        <ConfirmationPopup 
          isOpen={confirmPopup.isOpen} 
          onClose={closeConfirmPopup} 
          onConfirm={confirmPopup.onConfirm} 
          title={confirmPopup.title} 
          message={confirmPopup.message} 
        />
        <header className="simulator-header">
          <h1>{pageTitles[activeMenu] || 'Simulator'}</h1>
          <button className="config-button" onClick={handleHeaderConfigClick}>Config</button>
        </header>

        {activeMenu === 'GPS' && (
          <GpsPage>
            {configSaved && <div className="global-config-saved-notif">Config saved!</div>}
            {dataSent && <div className="global-config-saved-notif">Data sent!</div>}
            
            <ConfigPopup
              isOpen={isGpsConfigOpen}
              onClose={closeGpsConfig}
              config={config}
              onApply={handleApplyConfig}
              onSave={handleConfigSave}
              onDefault={handleDefaultConfig}
              onClear={handleClearConfig}
            />

            <div className={`main-content`}>
              <div className={`data-display-panel ${isDisabled ? 'disabled' : ''}`}>
                <div className="panel-header"><h2>Simulasi Data</h2></div>
                <div className="info-group-panel">
                  <div className="last-update-box"><span className="last-update-value">Last update time: {formatDateTime(lastUpdateTime)}</span></div>
                  <div className="status-section">
                    <div className="status-container">
                      <div className="status-item"><span className="status-label">STATUS</span><div className="status-value-container">{renderStatusImage()}</div></div>
                      <div className="status-item"><span className="status-label">UPDATE RATE</span><div className="update-rate-value">{config.updateRate} ms</div></div>
                    </div>
                  </div>
                </div>
                <div className="position-section">
                  <h3>Position</h3>
                  <div className="coordinate-group">
                    <div className="coordinate-box"><div className="coordinate-value">{toDMS(displayData.latitude, true)}</div><span className="coordinate-label">LATITUDE</span></div>
                    <div className="coordinate-box"><div className="coordinate-value">{toDMS(displayData.longitude, false)}</div><span className="coordinate-label">LONGITUDE</span></div>
                  </div>
                </div>
                <div className="other-data-section">
                  <div className="data-box"><div className="data-value">{formatNumber(displayData.sog, 1)} <span className="unit">knot</span></div><span className="data-label">SPEED OVER GROUND</span></div>
                  <div className="data-box"><div className="data-value">{formatNumber(displayData.cog, 1)} <span className="unit">deg</span></div><span className="data-label">COURSE OVER GROUND</span></div>
                  <div className="data-box"><div className="data-value">{formatNumber(displayData.variation, 3)} <span className="unit">deg</span></div><span className="data-label">MAGNETIC VARIATION</span></div>
                </div>
                <div className="action-buttons-container">
                  <div className="action-buttons-group">
                    <button className="action-icon-btn" onClick={handleStartSimulation} disabled={isDisabled || isSimulationActive}><img src={iconSend} alt="Start" /></button>
                    <button className="action-icon-btn" onClick={handleStopSimulation} disabled={isDisabled || !isSimulationActive}><img src={iconStop} alt="Stop" /></button>
                  </div>
                  <div className="action-divider"></div>
                  <button className="action-delete-btn" onClick={() => openConfirmPopup('clearData')} disabled={isDisabled || isSimulationActive}><img src={iconDelete} alt="Delete" /><span>Delete</span></button>
                </div>
              </div>

              <div className={`edit-data-panel ${isDisabled ? 'disabled' : ''}`}>
                <div className="panel-header">
                  <h2>Edit Data</h2>
                  <div className="panel-header-actions">
                    <button className="panel-icon-btn btn-edit-icon" onClick={handleToggleAndApplyEdit} disabled={isDisabled || isSimulationActive}><img src={iconEditPanel} alt="Edit" /></button>
                    <button className="panel-icon-btn btn-delete-icon" onClick={() => openConfirmPopup('clearInput')} disabled={isDisabled || isSimulationActive}><img src={iconDeletePanel} alt="Delete" /></button>
                  </div>
                </div>
                {editWarning && <div className="edit-panel-warning">{editWarning}</div>}
                <div className="input-group"><label>Latitude</label><input type="number" name="latitude" value={editData.latitude} onChange={handleInputChange} step="0.000001" disabled={isDisabled || !isEditingData || isSimulationActive}/></div>
          _DEPRECATED_       <div className="input-group"><label>Longitude</label><input type="number" name="longitude" value={editData.longitude} onChange={handleInputChange} step="0.000001" disabled={isDisabled || !isEditingData || isSimulationActive}/></div>
                <div className="input-group"><label>Speed Over Ground</label><input type="number" name="sog" value={editData.sog} onChange={handleInputChange} step="0.1" disabled={isDisabled || !isEditingData || isSimulationActive} /></div>
                <div className="input-group"><label>Course Over Ground</label><input type="number" name="cog" value={editData.cog} onChange={handleInputChange} step="0.1" disabled={isDisabled || !isEditingData || isSimulationActive} /></div>
                <div className="input-group"><label>Magnetic Variation</label><input type="number" name="variation" value={editData.variation} onChange={handleInputChange} step="0.001" disabled={isDisabled || !isEditingData || isSimulationActive}/></div>
                <div className="edit-panel-actions">
                  <button className="btn-default" onClick={handleResetForm} disabled={isDisabled || isSimulationActive}>Default</button>
                  <button className="btn-save" onClick={handleSendData} disabled={isDisabled || isSimulationActive}>Save</button>
                </div>
              </div>
            </div>
          </GpsPage>
        )}
        
        {activeMenu === 'Dashboard' && <Dashboard />}
        {activeMenu === 'Thermal' && <Thermal />}
        {activeMenu === 'Gyro' && <GyroPage />}
        {activeMenu === 'Sensor' && <Sensor />}
        {activeMenu === 'Chart' && <Chart />}
      </div>
    </div>
  );
}

// --- 3. Komponen App Pembungkus ---
function App() {
  return (
    <ConfigProvider>
      <AppContent />
    </ConfigProvider>
  );
}

export default App;
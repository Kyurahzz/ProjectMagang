import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import "./components/SimulatorFrom.css"; // Pastikan path ini benar
import ConfigPopup from './components/ConfigPopup'; // Pastikan path ini benar
import ConfirmationPopup from './components/ConfirmationPopUp'; // Pastikan path ini benar
import DarkModeToggle from './components/DarkModeToggle'; // Pastikan path ini benar
import GyroPage from './components/GyroPage'; // Pastikan path ini benar

// Impor ikon sidebar (sesuaikan path jika perlu)
import iconDashboard from './assets/inactive/Property 1=Dashboard_icon-Default.png';
import iconGPSDefault from './assets/inactive/ButtonID=GPS_icon-Default.png';
import iconGPSActive from './assets/active/ButtonID=GPS_icon-Active.png';
import iconGyroDefault from './assets/inactive/ButtonID=Gyro_icon-Default.png';
import iconGyroActive from './assets/active/ButtonID=Gyro_icon-Active.png';
import iconThermal from './assets/inactive/ButtonID=Thermal_icon-Default.png';
import iconPlaceHolder2 from './assets/inactive/ButtonID=Placeholder2_icon-Default.png';
import iconPlaceHolder3 from './assets/inactive/ButtonID=Placeholder3_icon-Default.png';

// Impor gambar status (sesuaikan path jika perlu)
import statusWaiting from './assets/status/Property 1=Waiting.png';
import statusActive from './assets/status/Property 1=Active.png';
import statusStopImg from './assets/status/Property 1=Stop.png';

// Impor ikon tombol (sesuaikan path jika perlu)
import iconSend from './assets/icon/PropertySend.png';
import iconStop from './assets/icon/PropertyStop.png';
import iconDelete from './assets/icon/PropertyDelete.png';
import iconEditPanel from './assets/icon/PropertyEdit.png';
import iconDeletePanel from './assets/icon/PropertyDelete.png';

// Komponen Halaman Placeholder
const Dashboard = () => <div style={{width: '100%', padding: '20px'}}>Dashboard Page Content</div>;
const Thermal = () => <div style={{width: '100%', padding: '20px'}}>Thermal Page Content</div>;
const Sensor = () => <div style={{width: '100%', padding: '20px'}}>Sensor Page Content</div>;
const Chart = () => <div style={{width: '100%', padding: '20px'}}>Chart Page Content</div>;

// Komponen Pembungkus untuk GPS
const GpsPage = ({ children }) => {
  return <>{children}</>;
};

// Pengaturan Endpoint
const API_URL = 'http://localhost:8080/api/gps/r6'; // URL untuk HTTP requests
const WS_URL = 'ws://localhost:8081'; // URL untuk WebSocket

function App() {
  const [activeMenu, setActiveMenu] = useState('GPS');
  
  // Objek untuk judul halaman dinamis
  const pageTitles = {
    Dashboard: 'Dashboard',
    GPS: 'NDDU Simulator',
    Gyro: 'Gyroscope Simulator',
    Thermal: 'Thermal Simulator',
    Sensor: 'Sensor View',
    Chart: 'Chart View'
  };

  const defaultInput = { latitude: 58.430493, longitude: 15.732333, magneticVariation: 6.4, course: 30.0, speed: 0.5 };
 
  const [inputData, setInputData] = useState(defaultInput);
  const [editData, setEditData] = useState(defaultInput);
  const [isEditingData, setIsEditingData] = useState(false);
  const [editWarning, setEditWarning] = useState('');

  const [isSimulationActive, setIsSimulationActive] = useState(false);
  const [simData, setSimData] = useState(defaultInput);
  const [status, setStatus] = useState('Stop');
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date().toISOString());
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const [dataSent, setDataSent] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true); // Diasumsikan terkonfigurasi
 
  const [isRecordCreated, setIsRecordCreated] = useState(false);

  const [confirmPopup, setConfirmPopup] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const defaultConfig = { ip: '192.168.1.1', port: '1883', topic: ['gps/sim', 'device/data'], username: 'admin', password: 'admin', updateRate: '1000' };
  const emptyConfig = { ip: '', port: '', topic: [], username: '', password: '', updateRate: '' };

  const [config, setConfig] = useState(defaultConfig);
  const wsClient = useRef(null);

  function calcMagneticVariation(lat, lon) {
    if (lat === '' || lon === '' || isNaN(lat) || isNaN(lon)) return '';
    return (2.5 * Math.sin((lat / 90) * Math.PI) + 1.2 * Math.cos((lon / 180) * Math.PI)).toFixed(2);
  }

  const toDMS = (coord, isLatitude) => {
    if (coord === null || coord === undefined || isNaN(coord)) return "--° --' --\" --";
    const absolute = Math.abs(coord);
    const degrees = Math.floor(absolute);
    const minutesNotTruncated = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesNotTruncated);
    const seconds = Math.floor((minutesNotTruncated - minutes) * 60);
    const direction = isLatitude ? (coord >= 0 ? 'N' : 'S') : (coord >= 0 ? 'E' : 'W');
    return `${Math.abs(degrees)}° ${minutes}' ${seconds}" ${direction}`;
  };

  const renderStatusImage = () => {
    switch (status) {
      case 'Running': return <img src={statusActive} alt="Active" className="status-image" />;
      case 'Stop': return <img src={statusStopImg} alt="Stop" className="status-image" />;
      case 'API Error': return <img src={statusStopImg} alt="Error" className="status-image" />;
      default: return <img src={statusWaiting} alt="Waiting" className="status-image" />;
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const showWarning = (message) => {
      setEditWarning(message);
      setTimeout(() => setEditWarning(''), 3000);
    };
    if (value === '') {
      setEditData(prev => ({ ...prev, [name]: '' }));
      return;
    }
    let newValue = parseFloat(value);
    if (isNaN(newValue)) {
      setEditData(prev => ({ ...prev, [name]: value }));
      return;
    }
    if (name === 'latitude') {
      if (newValue > 90 || newValue < -90) showWarning('Latitude must be between -90 and 90.');
      newValue = Math.max(-90, Math.min(90, newValue));
    }
    if (name === 'longitude') {
      if (newValue > 180 || newValue < -180) showWarning('Longitude will be wrapped between -180 and 180.');
      while (newValue > 180) newValue -= 360;
      while (newValue < -180) newValue += 360;
    }
    if (name === 'course') {
      if (newValue > 360 || newValue < 0) showWarning('Course must be between 0 and 360.');
      newValue = (newValue % 360 + 360) % 360;
    }
    if (name === 'speed') {
      if (newValue < 0) showWarning('Speed cannot be negative.');
      newValue = Math.max(0, newValue);
    }
    setEditData(prev => ({ ...prev, [name]: newValue }));
  };

  const handleStartSimulation = async () => {
    setStatus('Waiting...');
    const payload = {
      latitude: parseFloat(editData.latitude) || 0,
      longitude: parseFloat(editData.longitude) || 0,
      speed_over_ground: parseFloat(editData.speed) || 0,
      course_over_ground: parseFloat(editData.course) || 0,
      update_rate: parseInt(config.updateRate, 10) || 1000,
      is_running: true
    };
    try {
      const method = isRecordCreated ? 'patch' : 'post';
      const response = await axios[method](API_URL, payload);
      const dataFromServer = response.data.data;
      const newData = {
          latitude: dataFromServer.latitude,
          longitude: dataFromServer.longitude,
          speed: dataFromServer.speed_over_ground,
          course: dataFromServer.course_over_ground,
          magneticVariation: dataFromServer.magnetic_variation
      };
      setInputData(newData);
      setSimData(newData);
      setIsSimulationActive(true);
      setStatus('Running');
      setIsEditingData(false);
      setIsRecordCreated(true);
    } catch (error) {
      console.error("Axios Error:", error.response || error);
      setStatus('API Error');
    }
  };

  const handleStopSimulation = async () => {
    setStatus('Waiting...');
    try {
      await axios.patch(API_URL, { is_running: false });
      setIsSimulationActive(false);
      setStatus('Stop');
      setIsEditingData(false);
    } catch (error) {
      console.error("Axios Error:", error.response || error);
      setStatus('API Error');
    }
  };
 
  const handleSendData = async () => {
    const payload = {
      latitude: parseFloat(editData.latitude) || 0,
      longitude: parseFloat(editData.longitude) || 0,
      speed_over_ground: parseFloat(editData.speed) || 0,
      course_over_ground: parseFloat(editData.course) || 0,
      is_running: false
    };
    try {
      const method = isRecordCreated ? 'patch' : 'post';
      const response = await axios[method](API_URL, payload);
      if (method === 'post') {
        await axios.patch(API_URL, { is_running: false });
      }
      const dataFromServer = response.data.data;
      const newData = {
          latitude: dataFromServer.latitude,
          longitude: dataFromServer.longitude,
          speed: dataFromServer.speed_over_ground,
          course: dataFromServer.course_over_ground,
          magneticVariation: dataFromServer.magnetic_variation
      };
      setInputData(newData);
      setSimData(newData);
      setStatus('Stop');
      setIsSimulationActive(false);
      if (!isRecordCreated) {
        setIsRecordCreated(true);
      }
      setDataSent(true);
      setTimeout(() => setDataSent(false), 2000);
    } catch (error) {
      console.error("Axios Error:", error.response || error);
      setStatus('API Error');
    }
  };

  const executeClearForm = async () => {
    try {
      await axios.delete(API_URL);
      const emptyData = { latitude: '', longitude: '', magneticVariation: '', course: '', speed: '' };
      setEditData(emptyData);
      setInputData(emptyData);
      if (isSimulationActive) {
        await handleStopSimulation();
      }
      setIsRecordCreated(false);
    } catch (error) {
      console.error("Axios Error:", error.response || error);
      setStatus('API Error');
    }
    closeConfirmPopup();
  };

  const executeClearEditForm = () => {
      const emptyData = { latitude: '', longitude: '', magneticVariation: '', course: '', speed: '' };
      setEditData(emptyData);
      closeConfirmPopup();
  }
 
  const openConfirmPopup = (type) => {
    if (type === 'clearData') {
      setConfirmPopup({
        isOpen: true,
        title: 'Hapus Data Simulasi',
        message: 'Apakah Anda yakin ingin menghapus semua data simulasi?',
        onConfirm: () => executeClearForm()
      });
    } else if (type === 'clearInput') {
      setConfirmPopup({
        isOpen: true,
        title: 'Hapus Input',
        message: 'Apakah Anda yakin ingin mengosongkan semua input di panel Edit Data?',
        onConfirm: () => executeClearEditForm()
      });
    }
  };

  const closeConfirmPopup = () => {
    setConfirmPopup({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  };
  
  const handleToggleAndApplyEdit = () => {
    if (isEditingData) setInputData(editData);
    setIsEditingData(prevState => !prevState);
  };
  
  const handleDefaultConfig = () => setConfig(defaultConfig);
  
  const handleClearConfig = () => {
    setConfig(emptyConfig);
    setIsConfigured(false);
    localStorage.removeItem('gpsConfig');
  };
  
  const handleApplyConfig = (appliedConfig) => setConfig(appliedConfig);
  
  const handleConfigSave = (newConfig) => {
    const isNewConfigValid = Object.entries(newConfig).every(([key, value]) => {
      if (key === 'topic') return Array.isArray(value) && value.length > 0;
      return String(value).trim() !== '';
    });
    if (isNewConfigValid) {
        setConfig(newConfig);
        localStorage.setItem('gpsConfig', JSON.stringify(newConfig));
        setConfigSaved(true);
        setTimeout(() => setConfigSaved(false), 2000);
        setIsConfigured(true);
        setIsConfigOpen(false);
    } else {
        setIsConfigured(false);
        console.error("Attempted to save an invalid configuration.");
    }
  };
  
  const handleResetForm = () => { 
    setEditData(defaultInput);
  };

  const simulationStatusRef = useRef(isSimulationActive);
  useEffect(() => {
    simulationStatusRef.current = isSimulationActive;
  }, [isSimulationActive]);

  useEffect(() => {
    if (!isSimulationActive) {
      const mv = calcMagneticVariation(Number(editData.latitude), Number(editData.longitude));
      setEditData(prev => ({ ...prev, magneticVariation: mv }));
    }
  }, [editData.latitude, editData.longitude, isSimulationActive]);
 
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const response = await axios.get(API_URL);
        const data = response.data.data;
        const initialData = {
          latitude: data.latitude,
          longitude: data.longitude,
          speed: data.speed_over_ground,
          course: data.course_over_ground,
          magneticVariation: data.magnetic_variation
        };
        setInputData(initialData);
        setEditData(initialData);
        setIsSimulationActive(data.is_running);
        setStatus(data.is_running ? 'Running' : 'Stop');
        setIsConfigured(true);
        setIsRecordCreated(true);
      } catch (error) {
        if (error.response && error.response.status === 404) {
          console.log("No initial GPS data found on server.");
          setIsConfigured(true);
          setIsRecordCreated(false);
        } else {
          console.error("Axios Error:", error.response || error);
          setStatus('API Error');
        }
      }
    };
    fetchInitialData();

    wsClient.current = new WebSocket(WS_URL);
    wsClient.current.onopen = () => {
      if (!simulationStatusRef.current) {
        setStatus('Stop');
      }
    }
    
    wsClient.current.onmessage = (event) => {
      try {
        const messageData = JSON.parse(event.data);
        if (messageData.type === 'gps_update' && messageData.data) {
          const { latitude, longitude, speed_over_ground, course_over_ground, magnetic_variation, last_update, is_running } = messageData.data;
          const newData = { latitude, longitude, speed: speed_over_ground, course: course_over_ground, magneticVariation: magnetic_variation };
          setInputData(newData);
          setSimData(newData);
          setLastUpdateTime(last_update || new Date().toISOString());
          if (!simulationStatusRef.current) {
            setEditData(newData);
          }
          if (simulationStatusRef.current && !is_running) {
              setIsSimulationActive(false);
              setStatus('Stop');
              setIsEditingData(true);
          }
        }
      } catch (error) { console.error('Error parsing WebSocket message:', error); }
    };

    wsClient.current.onclose = () => { setStatus('Disconnected'); setIsSimulationActive(false); };
    wsClient.current.onerror = () => setStatus('Error');
    return () => wsClient.current.close();
  }, []);

  const displayData = isSimulationActive ? simData : inputData;
  const formatNumber = (value, decimals = 1) => (value === null || value === undefined || isNaN(value)) ? '--' : parseFloat(value).toFixed(decimals);
  const isDisabled = !isConfigured;

  return (
    <div className="simulator-container">
      <div className="sidebar">
        <div className={`sidebar-icon${activeMenu === 'Dashboard' ? ' active' : ''}`} onClick={() => setActiveMenu('Dashboard')}><img src={iconDashboard} alt="Dashboard" /><span className="sidebar-label">Dashboard</span></div>
        <div className={`sidebar-icon${activeMenu === 'GPS' ? ' active' : ''}`} onClick={() => setActiveMenu('GPS')}><img src={isSimulationActive ? iconGPSActive : iconGPSDefault} alt="GPS" /><span className="sidebar-label">GPS</span></div>
        <div className={`sidebar-icon${activeMenu === 'Gyro' ? ' active' : ''}`} onClick={() => setActiveMenu('Gyro')}><img src={isSimulationActive ? iconGyroActive : iconGyroDefault} alt="Gyro" /><span className="sidebar-label">Gyroscope</span></div>
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
          <button className="config-button" onClick={() => setIsConfigOpen(true)}>Config</button>
        </header>

        {activeMenu === 'GPS' && (
          <GpsPage>
            {configSaved && <div className="global-config-saved-notif">Config saved!</div>}
            {dataSent && <div className="global-config-saved-notif">Data sent!</div>}
            <ConfigPopup
              isOpen={isConfigOpen}
              onClose={() => setIsConfigOpen(false)}
              config={config}
              onApply={handleApplyConfig}
              onSave={handleConfigSave}
              onDefault={handleDefaultConfig}
              onClear={handleClearConfig}
            />

            <div className={`main-content`}>
                <div className={`data-display-panel ${isDisabled ? 'disabled' : ''}`}>
                    <div className="panel-header"><h2>Simulasi Data</h2></div>
                    
                    {/* === [MULAI PERUBAHAN] === */}
                    {/* Bungkus dua elemen di bawah ini dengan div baru */}
                    <div className="info-group-panel">
                      <div className="last-update-box">
                        <span className="last-update-value">Last update time: {lastUpdateTime}</span>
                      </div>
                      <div className="status-section">
                          <div className="status-container">
                              <div className="status-item">
                                  <span className="status-label">STATUS</span>
                                  <div className="status-value-container">{renderStatusImage()}</div>
                              </div>
                              <div className="status-item">
                                  <span className="status-label">UPDATE RATE</span>
                                  <div className="update-rate-value">{config.updateRate} ms</div>
                              </div>
                          </div>
                      </div>
                    </div>
                    {/* === [AKHIR PERUBAHAN] === */}

                    <div className="position-section">
                        <h3>Position</h3>
                        <div className="coordinate-group">
                            <div className="coordinate-box"><div className="coordinate-value">{toDMS(displayData.latitude, true)}</div><span className="coordinate-label">LATITUDE</span></div>
                            <div className="coordinate-box"><div className="coordinate-value">{toDMS(displayData.longitude, false)}</div><span className="coordinate-label">LONGITUDE</span></div>
                        </div>
                    </div>
                    <div className="other-data-section">
                        <div className="data-box"><div className="data-value">{formatNumber(displayData.speed, 1)} <span className="unit">knot</span></div><span className="data-label">SPEED OVER GROUND</span></div>
                        <div className="data-box"><div className="data-value">{formatNumber(displayData.course, 1)} <span className="unit">deg</span></div><span className="data-label">COURSE OVER GROUND</span></div>
                        <div className="data-box"><div className="data-value">{formatNumber(displayData.magneticVariation, 3)} <span className="unit">deg</span></div><span className="data-label">MAGNETIC VARIATION</span></div>
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
                            <button className="panel-icon-btn btn-edit-icon" onClick={handleToggleAndApplyEdit} disabled={isDisabled || isSimulationActive}>
                                <img src={iconEditPanel} alt="Edit" />
                            </button>
                            <button className="panel-icon-btn btn-delete-icon" onClick={() => openConfirmPopup('clearInput')} disabled={isDisabled || isSimulationActive}>
                                <img src={iconDeletePanel} alt="Delete" />
                            </button>
                        </div>
                    </div>
                    {editWarning && <div className="edit-panel-warning">{editWarning}</div>}
                    <div className="input-group"><label>Latitude</label><input type="number" name="latitude" value={editData.latitude} onChange={handleInputChange} step="0.000001" disabled={isDisabled || !isEditingData || isSimulationActive}/></div>
                    <div className="input-group"><label>Longitude</label><input type="number" name="longitude" value={editData.longitude} onChange={handleInputChange} step="0.000001" disabled={isDisabled || !isEditingData || isSimulationActive}/></div>
                    <div className="input-group"><label>Speed Over Ground</label><input type="number" name="speed" value={editData.speed} onChange={handleInputChange} step="0.1" disabled={isDisabled || !isEditingData || isSimulationActive} /></div>
                    <div className="input-group"><label>Course Over Ground</label><input type="number" name="course" value={editData.course} onChange={handleInputChange} step="0.1" disabled={isDisabled || !isEditingData || isSimulationActive} /></div>
                    <div className="input-group"><label>Magnetic Variation</label><input type="number" name="magneticVariation" value={editData.magneticVariation} onChange={handleInputChange} step="0.001" disabled={isDisabled || !isEditingData || isSimulationActive}/></div>
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

export default App;

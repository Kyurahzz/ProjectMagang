import React, { useState } from 'react';
import './GyroPage.css';
import ConfigPopup from './ConfigPopup';
import { useConfig } from './ConfigContext';

// --- 1. Asset Imports ---
import iconPlay from '../assets/icon/PropertySend.png';
import iconStop from '../assets/icon/PropertyStop.png';
import iconDelete from '../assets/icon/PropertyDelete.png';
import iconEdit from '../assets/icon/PropertyEdit.png';

import Frame1 from '../assets/gyro/Frame.png';
import Frame2 from '../assets/gyro/Frame1.png';
import Frame3 from '../assets/gyro/Frame2.png';

import shipFrontView from '../assets/gyro/ShipFront.png';
import shipTopView from '../assets/gyro/ShipTop.png';
import shipSideView from '../assets/gyro/ShipSide.png';
import Waiting from '../assets/status/Property 1=Waiting.png';
import Active from '../assets/status/Property 1=Active.png';
import Stop from '../assets/status/Property 1=Stop.png';

import GyroActive from '../assets/status/ButtonID=Gyro_icon-Active.png';

// --- 2. Komponen Gauge ---
const HeadingGauge = ({ heading }) => {
  const size = 240;
  const center = size / 2;
  const radius = center - 15;
  const ticks = [];
  const labels = ['N', 'E', 'S', 'W'];

  for (let i = 0; i < 360; i += 10) {
    const isMajorTick = i % 30 === 0;
    const angleRad = (i - 90) * (Math.PI / 180);
    const x1 = center + radius * Math.cos(angleRad);
    const y1 = center + radius * Math.sin(angleRad);
    const x2 = center + (radius - (isMajorTick ? 10 : 5)) * Math.cos(angleRad);
    const y2 = center + (radius - (isMajorTick ? 10 : 5)) * Math.sin(angleRad);
    ticks.push(<line key={`tick-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} className="gauge-tick" />);

    if (i % 90 === 0) {
      const labelAngleRad = (i - 90) * (Math.PI / 180);
      const labelX = center + (radius - 30) * Math.cos(labelAngleRad);
      const labelY = center + (radius - 30) * Math.sin(labelAngleRad);
      ticks.push(<text key={`label-${i}`} x={labelX} y={labelY} className="gauge-label-cardinal">{labels[i / 90]}</text>);
    }
  }

  return (
    <div className="gauge-container">
      <svg viewBox={`0 0 ${size} ${size}`} className="gauge-svg">
        <circle cx={center} cy={center} r={radius} fill="#06A3DD" stroke="#e0e0e0" strokeWidth="2" />
        <g>{ticks}</g>
      </svg>
      <img src={shipTopView} alt="Ship Top View" className="ship-indicator stationary-ship" style={{ transform: `translate(-50%, -50%) rotate(${heading - 90}deg)` }} />
    </div>
  );
};

const PitchGauge = ({ pitch }) => {
  const size = 240;
  const center = size / 2;
  const radius = center - 15;
  const ticks = [];

  for (let i = 0; i < 360; i += 5) {
    const isMajorTick = i % 15 === 0;
    const angleRad = i * (Math.PI / 180);
    if (i <= 90 || i >= 270) {
      const x1 = center + radius * Math.cos(angleRad);
      const y1 = center + radius * Math.sin(angleRad);
      const x2 = center + (radius - (isMajorTick ? 10 : 5)) * Math.cos(angleRad);
      const y2 = center + (radius - (isMajorTick ? 10 : 5)) * Math.sin(angleRad);
      ticks.push(<line key={`tick-pitch-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} className="gauge-tick" />);
    }
  }

  return (
    <div className="gauge-container">
      <svg viewBox={`0 0 ${size} ${size}`} className="gauge-svg">
        <defs>
          <clipPath id="pitch-clip-half">
            <rect x="0" y={center} width={size} height={center} />
          </clipPath>
        </defs>
        <circle cx={center} cy={center} r={radius} className="gauge-dial-sky" />
        <circle cx={center} cy={center} r={radius} className="gauge-dial-sea" clipPath="url(#pitch-clip-half)" />
        {ticks}
      </svg>
      <img src={shipSideView} alt="Ship Side View" className="ship-indicator" style={{ transform: `rotate(${-pitch}deg)` }} />
    </div>
  );
};

const RollGauge = ({ roll }) => {
  const size = 240;
  const center = size / 2;
  const radius = center - 10;
  const ticks = [];

  for (let angle = -90; angle <= 90; angle += 10) {
    if (angle === 0) continue;
    const isMajorTick = angle % 30 === 0;
    const angleRad = (angle - 90) * (Math.PI / 180);
    const x1 = center + radius * Math.cos(angleRad);
    const y1 = center + radius * Math.sin(angleRad);
    const x2 = center + (radius - (isMajorTick ? 10 : 5)) * Math.cos(angleRad);
    const y2 = center + (radius - (isMajorTick ? 10 : 5)) * Math.sin(angleRad);
    ticks.push(<line key={`roll-tick-${angle}`} x1={x1} y1={y1} x2={x2} y2={y2} className="gauge-tick" />);
  }
  const shipSize = size * 0.6;

  return (
    <div className="gauge-container">
      <svg viewBox={`0 0 ${size} ${size}`} className="gauge-svg">
        <path d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`} className="roll-arc" />
        <rect x={center - radius} y={center - 18} width={radius * 2} height={36} className="roll-sea"/>
        <g transform={`rotate(${roll}, ${center}, ${center})`}>
          <image href={shipFrontView} x={center - shipSize / 2} y={center - shipSize / 2} height={shipSize} width={shipSize} className="ship-indicator-svg" />
        </g>
        {ticks}
        <path d={`M ${center - 8} ${center - radius} L ${center} ${center - radius + 12} L ${center + 8} ${center - radius} Z`} className="roll-pointer" />
        <text x={center - radius + 25} y={center + 5} className="roll-labels-svg">PORT</text>
        <text x={center + radius - 25} y={center + 5} className="roll-labels-svg" textAnchor="end">STBD</text>
      </svg>
    </div>
  );
};


// --- 3. Komponen Utama Halaman Gyro ---
function GyroPage() {
  // --- A. State & Context ---
  const { isGyroConfigOpen, closeGyroConfig } = useConfig();

  const [simData, setSimData] = useState({ pitch: 0, heading: 0, roll: 0, headingRate: 15, lastUpdateTime: '03 Oktober 2025, 09:52:00', status: 'Active' });
  const [editData, setEditData] = useState({ heading: '0', pitch: '0', roll: '0' });
  const [isEditing, setIsEditing] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [gyroConfig, setGyroConfig] = useState({ ip: '192.168.1.10', port: '1884', topic: ['gyro/sim', 'device/attitude'], username: 'user_gyro', password: 'password123', updateRate: '500' });

  // --- B. Handlers ---
  const handleGyroConfigSave = (newConfig) => {
    console.log("Saving Gyro Config:", newConfig);
    setGyroConfig(newConfig);
    closeGyroConfig();
  };
  
  const handleGyroConfigDefault = () => {
    setGyroConfig({ ip: '192.168.1.10', port: '1884', topic: ['gyro/sim', 'device/attitude'], username: 'user_gyro', password: 'password123', updateRate: '500' });
  };
  
  const handleGyroConfigClear = () => {
    setGyroConfig({ ip: '', port: '', topic: [], username: '', password: '', updateRate: '' });
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSave = () => {
    console.log("SAVE TO BACKEND triggered. Data to send:", simData);
  };
  
  const handleDefault = () => {
    setSimData(prev => ({ ...prev, heading: 0, pitch: 0, roll: 0 }));
  };
  
  const handleEditToggle = () => {
    if (isSimulating) {
      console.log("Tidak bisa mengedit saat simulasi berjalan.");
      return;
    }
    
    if (isEditing) {
      setSimData(prev => ({ ...prev, heading: parseFloat(editData.heading) || 0, pitch: parseFloat(editData.pitch) || 0, roll: parseFloat(editData.roll) || 0 }));
      setIsEditing(false);
    } else {
      setEditData({ heading: String(simData.heading), pitch: String(simData.pitch), roll: String(simData.roll) });
      setIsEditing(true);
    }
  };
  
  const handlePlay = () => {
    console.log("Start Simulation");
    setIsSimulating(true);
    setIsEditing(false); 
  };

  const handleStop = () => {
    console.log("Stop Simulation");
    setIsSimulating(false);
  };

  const handleDelete = () => {
    console.log("Menghapus semua data simulasi.");
    setSimData({
      pitch: 0,
      heading: 0,
      roll: 0,
      headingRate: 0,
      lastUpdateTime: 'N/A',
      status: 'Waiting'
    });
  };

  const handleClearEditData = () => {
    console.log("Menghapus input di panel Edit Data.");
    setEditData({ heading: '0', pitch: '0', roll: '0' });
  };

  const handleDecreaseHeadingRate = () => {
    setSimData(prev => ({
      ...prev,
      headingRate: Math.max(0, prev.headingRate - 1) 
    }));
  };

  const handleIncreaseHeadingRate = () => {
    setSimData(prev => ({
      ...prev,
      headingRate: prev.headingRate + 1 
    }));
  };

  // --- C. Fungsi Helper & Formatter ---
  const renderGyroStatusImage = () => {
    switch (simData.status) {
      case 'Active': return <img src={Active} alt="Active" className="status-image" />;
      case 'Stop': return <img src={Stop} alt="Stop" className="status-image" />;
      default: return <img src={Waiting} alt="Waiting" className="status-image" />;
    }
  };

  const formatHeading = (deg) => {
    const d = Math.round(deg);
    let dir = 'N';
    if (d >= 337.5 || d < 22.5) dir = 'N';
    else if (d >= 22.5 && d < 67.5) dir = 'NE';
    else if (d >= 67.5 && d < 112.5) dir = 'E';
    else if (d >= 112.5 && d < 157.5) dir = 'SE';
    else if (d >= 157.5 && d < 202.5) dir = 'S';
    else if (d >= 202.5 && d < 247.5) dir = 'SW';
    else if (d >= 247.5 && d < 292.5) dir = 'W';
    else if (d >= 292.5 && d < 337.5) dir = 'NW';
    return `${dir}${String(d).padStart(3, '0')}°`;
  };
  
  const formatWithSign = (num, dec = 1) => num >= 0 ? `+${num.toFixed(dec)}` : num.toFixed(dec);
 
  // --- D. Tampilan / JSX ---
  return (
    <div className="gyro-page-scope">
      <ConfigPopup
        isOpen={isGyroConfigOpen}
        onClose={closeGyroConfig}
        config={gyroConfig}
        onSave={handleGyroConfigSave}
        onDefault={handleGyroConfigDefault}
        onClear={handleGyroConfigClear}
        onApply={(appliedConfig) => setGyroConfig(appliedConfig)}
      />

      <div className="main-content">
        <div className="data-display-panel">
          <div className="panel-header">
            <h2>Simulasi Data</h2>
          </div>
          <div className="top-info-container">
            <div className="info-column-left">
              <div className="last-update-box">
                <span>Last update time: {simData.lastUpdateTime}</span>
              </div>
              <div className="status-container">
                <div className="status-item">
                  <span className="status-label">STATUS</span>
                  <div className="status-value-container">{renderGyroStatusImage()}</div>
                </div>
                <div className="status-item">
                  <span className="status-label">UPDATE RATE</span>
                  <div className="update-rate-value">{gyroConfig.updateRate} ms</div>
                </div>
              </div>
            </div>
          </div>
          <div className="gyro-visuals-container">
            <div className="gyro-card">
              <div className="card-header">
                <div className="card-title"><img src={Frame2} alt="Pitch Icon" /><span>Pitch</span></div>
                <h3>{formatWithSign(simData.pitch)}°</h3>
              </div>
              <PitchGauge pitch={simData.pitch} />
            </div>
            <div className="gyro-card">
              <div className="card-header">
                <div className="card-title"><img src={Frame1} alt="Heading Icon" /><span>Heading</span></div>
                <h3>{formatHeading(simData.heading)}</h3>
              </div>
              <HeadingGauge heading={simData.heading} />
              <div className="card-footer heading-rate-control">
                <span>Heading Rate</span>
                <div className="rate-control-group">
                    <button className="rate-btn btn-decrease" onClick={handleDecreaseHeadingRate}>◀</button>
                    <span className="rate-value">{simData.headingRate}°/min</span>
                    <button className="rate-btn btn-increase" onClick={handleIncreaseHeadingRate}>▶</button>
                </div>
              </div>
            </div>
            <div className="gyro-card">
              <div className="card-header">
                <div className="card-title"><img src={Frame3} alt="Roll Icon" /><span>Roll</span></div>
                <h3>{simData.roll.toFixed(1)}°</h3>
              </div>
              <RollGauge roll={simData.roll} />
            </div>
          </div>
          <div className="action-buttons-container">
            <button className="action-btn" onClick={handlePlay} disabled={isSimulating}><img src={iconPlay} alt="Play" /></button>
            <button className="action-btn stop-btn" onClick={handleStop} disabled={!isSimulating}><img src={iconStop} alt="Stop" /></button>
            <div className="separator"></div>
            <button className="action-btn delete-btn" onClick={handleDelete}><img src={iconDelete} alt="Delete" />Delete</button>
          </div>
        </div>

        <div className="edit-data-panel">
          <div className="panel-header">
            <h2>Edit Data</h2>
            <div className="header-actions">
              <button className="header-action-btn edit-btn" onClick={handleEditToggle} disabled={isSimulating}>
                <img src={iconEdit} alt="Edit" />
              </button>
              <button className="header-action-btn delete-btn" onClick={handleClearEditData}>
                <img src={iconDelete} alt="Delete" />
              </button>
            </div>
          </div>
          <div className="form-container">
            <div className="input-group">
              <label>Set Heading</label>
              <input type="number" name="heading" value={editData.heading} onChange={handleInputChange} disabled={!isEditing} />
            </div>
            <div className="input-group">
              <label>Set Pitch</label>
              <input type="number" name="pitch" value={editData.pitch} onChange={handleInputChange} disabled={!isEditing} />
            </div>
            <div className="input-group">
              <label>Set Roll</label>
              <input type="number" name="roll" value={editData.roll} onChange={handleInputChange} disabled={!isEditing} />
            </div>
          </div>
          <div className="edit-panel-actions">
            <button className="btn-default" onClick={handleDefault}>Default</button>
            <button className="btn-save" onClick={handleSave}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GyroPage;
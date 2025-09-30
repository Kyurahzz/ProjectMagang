import React, { useState } from 'react';
import './GyroPage.css';

// Impor ikon
import iconPlay from '../assets/icon/PropertySend.png';
import iconStop from '../assets/icon/PropertyStop.png';
import iconDelete from '../assets/icon/PropertyDelete.png';
import iconEdit from '../assets/icon/PropertyEdit.png';

// Impor gambar kapal
import shipFrontView from '../assets/gyro/ShipFront.png';
import shipTopView from '../assets/gyro/ShipTop.png';
import shipSideView from '../assets/gyro/ShipSide.png';

// Impor status
import Waiting from '../assets/status/Property 1=Waiting.png';
import Active from '../assets/status/Property 1=Active.png';
import Stop from '../assets/status/Property 1=Stop.png';

// --- KOMPONEN GAUGE DENGAN SVG ---

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
      ticks.push(<text key={`label-${i}`} x={labelX} y={labelY} className="gauge-label-cardinal">{labels[i/90]}</text>);
    }
  }

  return (
    <div className="gauge-container">
      <svg viewBox={`0 0 ${size} ${size}`} className="gauge-svg">
        {/* DIUBAH: Warna latar diubah sesuai permintaan */}
        <circle cx={center} cy={center} r={radius} fill="#06A3DD" stroke="#e0e0e0" strokeWidth="2" />
        <g transform={`rotate(${-heading}, ${center}, ${center})`}>
          {ticks}
        </g>
      </svg>
      <img src={shipTopView} alt="Ship Top View" className="ship-indicator stationary-ship" />
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
            <img src={shipSideView} alt="Ship Side View" className="ship-indicator" style={{ transform: `translateY(${pitch * -2}px)` }} />
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
                    <image 
                        href={shipFrontView} 
                        x={center - shipSize / 2} 
                        y={center - shipSize / 2}
                        height={shipSize} 
                        width={shipSize}
                        className="ship-indicator-svg"
                    />
                </g>

                {ticks}
                <path d={`M ${center - 8} ${center - radius} L ${center} ${center - radius + 12} L ${center + 8} ${center - radius} Z`} className="roll-pointer" />
                
                <text x={center - radius + 25} y={center + 5} className="roll-labels-svg">PORT</text>
                <text x={center + radius - 25} y={center + 5} className="roll-labels-svg" textAnchor="end">STBD</text>
            </svg>
        </div>
    );
};


function GyroPage() {
  const [simData, setSimData] = useState({
    pitch: 0,
    heading: 0,
    roll: 0,
    headingRate: 15,
    lastUpdateTime: '06 Feb 2025, 12:34:56',
    status: 'Active',
    updateRate: 1000,
    rawAngularVelocity: {
      x: 0.05,
      y: 0.05,
      z: 0.05,
    },
  });

  const [editData, setEditData] = useState({
    heading: '0',
    pitch: '0',
    roll: '0',
  });
  
  const renderGyroStatusImage = () => {
    switch (simData.status) {
      case 'Active': return <img src={Active} alt="Active" className="status-image" />;
      case 'Stop': return <img src={Stop} alt="Stop" className="status-image" />;
      default: return <img src={Waiting} alt="Waiting" className="status-image" />;
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };
  const handleSave = () => { console.log("Saving data:", editData); };
  const handleDefault = () => { console.log("Setting to default"); };
  const handlePlay = () => console.log("Start Simulation");
  const handleStop = () => console.log("Stop Simulation");
  const handleDelete = () => console.log("Delete Simulation Data");

  const formatHeading = (deg) => {
    const degree = Math.round(deg);
    let direction = 'N';
     if (degree >= 337.5 || degree < 22.5) direction = 'N';
    else if (degree >= 22.5 && degree < 67.5) direction = 'NE';
    else if (degree >= 67.5 && degree < 112.5) direction = 'E';
    else if (degree >= 112.5 && degree < 157.5) direction = 'SE';
    else if (degree >= 157.5 && degree < 202.5) direction = 'S';
    else if (degree >= 202.5 && degree < 247.5) direction = 'SW';
    else if (degree >= 247.5 && degree < 292.5) direction = 'W';
    else if (degree >= 292.5 && degree < 337.5) direction = 'NW';
    const paddedDegree = String(degree).padStart(3, '0');
    return `${direction}${paddedDegree}°`;
  };
  const formatWithSign = (num, decimals = 1) => num >= 0 ? `+${num.toFixed(decimals)}` : num.toFixed(decimals);
  
  return (
    <div className="gyro-page-scope">
      <div className="main-content">
        <div className="data-display-panel">
          <div className="panel-header"><h2>Simulasi Data</h2></div>
          <div className="top-info-container">
            <div className="info-column-left">
              <div className="last-update-box"><span>Last update time: {simData.lastUpdateTime}</span></div>
              <div className="status-container">
                  <div className="status-item">
                      <span className="status-label">STATUS</span>
                      <div className="status-value-container">{renderGyroStatusImage()}</div>
                  </div>
                  <div className="status-item">
                      <span className="status-label">UPDATE RATE</span>
                      <div className="update-rate-value">{simData.updateRate} ms</div>
                  </div>
              </div>
            </div>
            <div className="info-column-right">
              <div className="velocity-box">
                  <span className="status-label">Raw Angular Velocity</span>
                  <div className="velocity-values">
                      <span>X : {formatWithSign(simData.rawAngularVelocity.x, 2)} °/s</span>
                      <span>Y : {formatWithSign(simData.rawAngularVelocity.y, 2)} °/s</span>
                      <span>Z : {formatWithSign(simData.rawAngularVelocity.z, 2)} °/s</span>
                  </div>
              </div>
            </div>
          </div>
          
          <div className="gyro-visuals-container">
            <div className="gyro-card">
              <div className="card-header">
                <span>Pitch</span>
                <h3>{formatWithSign(simData.pitch)}°</h3> 
              </div>
              <PitchGauge pitch={simData.pitch} />
            </div>
            <div className="gyro-card">
              <div className="card-header">
                <span>Heading</span>
                <h3>{formatHeading(simData.heading)}</h3>
              </div>
              <HeadingGauge heading={simData.heading} />
              <div className="card-footer">
                  <span>Heading Rate</span>
                  <span>{simData.headingRate}°/min ➤</span>
              </div>
            </div>
            <div className="gyro-card">
              <div className="card-header">
                <span>Roll</span>
                <h3>{simData.roll.toFixed(1)}°</h3>
              </div>
              <RollGauge roll={simData.roll} />
            </div>
          </div>
          <div className="action-buttons-container">
            <button className="action-btn" onClick={handlePlay}><img src={iconPlay} alt="Play" /></button>
            <button className="action-btn" onClick={handleStop}><img src={iconStop} alt="Stop" /></button>
            <button className="action-btn delete-btn" onClick={handleDelete}><img src={iconDelete} alt="Delete" /></button>
          </div>
        </div>
        <div className="edit-data-panel">
          <div className="panel-header"><h2>Edit Data</h2></div>
          <div className="form-container">
              <div className="input-group">
                  <label>Set Heading</label>
                  <input type="number" name="heading" value={editData.heading} onChange={handleInputChange} />
              </div>
              <div className="input-group">
                  <label>Set Pitch</label>
                  <input type="number" name="pitch" value={editData.pitch} onChange={handleInputChange} />
              </div>
              <div className="input-group">
                  <label>Set Roll</label>
                  <input type="number" name="roll" value={editData.roll} onChange={handleInputChange} />
              </div>
          </div>
          <div className="edit-panel-actions">
            <button className="btn-save" onClick={handleSave}>Save</button>
            <button className="btn-default" onClick={handleDefault}>Default</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GyroPage;
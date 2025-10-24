import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./GyroPage.css";
import ConfigPopup from "./ConfigPopup";
import ConfirmationPopup from "./ConfirmationPopUp";
import { useConfig } from "./ConfigContext";
import { useSensorConfig } from "../hooks/useSensorConfig";

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


// --- 2. Komponen Gauge ---

const HeadingGauge = ({ heading }) => {
  const [visualHeading, setVisualHeading] = useState(heading);
  const prevHeadingRef = useRef(heading);

  useEffect(() => {
    const prevHeading = prevHeadingRef.current;
    let diff = heading - prevHeading;

    if (diff > 180) {
      diff -= 360;
    } else if (diff < -180) {
      diff += 360;
    }

    setVisualHeading(currentVisualHeading => currentVisualHeading + diff);
    prevHeadingRef.current = heading;
  }, [heading]);

  const size = 240;
  const center = size / 2;
  const radius = center - 15;
  const ticks = [];
  const labels = ["N", "E", "S", "W"];

  for (let i = 0; i < 360; i += 10) {
    const isMajorTick = i % 30 === 0;
    const angleRad = (i - 90) * (Math.PI / 180);
    const x1 = center + radius * Math.cos(angleRad);
    const y1 = center + radius * Math.sin(angleRad);
    const x2 = center + (radius - (isMajorTick ? 10 : 5)) * Math.cos(angleRad);
    const y2 = center + (radius - (isMajorTick ? 10 : 5)) * Math.sin(angleRad);
    ticks.push(
      <line
        key={`tick-${i}`}
        x1={x1} y1={y1} x2={x2} y2={y2}
        className="gauge-tick"
      />
    );

    if (i % 90 === 0) {
      const labelAngleRad = (i - 90) * (Math.PI / 180);
      const labelX = center + (radius - 30) * Math.cos(labelAngleRad);
      const labelY = center + (radius - 30) * Math.sin(labelAngleRad);
      ticks.push(
        <text
          key={`label-${i}`}
          x={labelX} y={labelY}
          className="gauge-label-cardinal"
        >
          {labels[i / 90]}
        </text>
      );
    }
  }

  return (
    <div className="gauge-container">
      <svg viewBox={`0 0 ${size} ${size}`} className="gauge-svg">
        <circle
          cx={center} cy={center} r={radius}
          fill="#06A3DD" stroke="#e0e0e0" strokeWidth="2"
        />
        <g>{ticks}</g>
      </svg>
    _ <img
        src={shipTopView}
        alt="Ship Top View"
        className="ship-indicator stationary-ship"
        style={{
          transform: `translate(-50%, -50%) rotate(${visualHeading - 90}deg)`,
        }}
      />
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
      const x2 =
        center + (radius - (isMajorTick ? 10 : 5)) * Math.cos(angleRad);
      const y2 =
        center + (radius - (isMajorTick ? 10 : 5)) * Math.sin(angleRad);
      ticks.push(
        <line
          key={`tick-pitch-${i}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          className="gauge-tick"
        />
      );
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
        <circle
          cx={center}
          cy={center}
          r={radius}
          className="gauge-dial-sea"
          clipPath="url(#pitch-clip-half)"
        />
        {ticks}
      </svg>
      <img
        src={shipSideView}
        alt="Ship Side View"
        className="ship-indicator"
        style={{ transform: `rotate(${-pitch}deg)` }}
      />
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
    ticks.push(
      <line
        key={`roll-tick-${angle}`}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        className="gauge-tick"
      />
    );
  }
  const shipSize = size * 0.6;

  return (
    <div className="gauge-container">
      <svg viewBox={`0 0 ${size} ${size}`} className="gauge-svg">
        <path
          d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${
            center + radius
          } ${center}`}
          className="roll-arc"
        />
        <rect
          x={center - radius}
          y={center - 18}
          width={radius * 2}
          height={36}
          className="roll-sea"
        />
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
        <path
          d={`M ${center - 8} ${center - radius} L ${center} ${
            center - radius + 12
          } L ${center + 8} ${center - radius} Z`}
          className="roll-pointer"
        />
        <text
          x={center - radius + 25}
          y={center + 5}
          className="roll-labels-svg"
        >
          PORT
        </text>
        <text
          x={center + radius - 25}
          y={center + 5}
          className="roll-labels-svg"
          textAnchor="end"
        >
          STBD
        </text>
      </svg>
    </div>
  );
};


// --- 3. Komponen Utama Halaman Gyro ---
function GyroPage({ onStatusChange }) {
  const wsClient = useRef(null);
  const API_URL = "http://localhost:8080/api/gyro"; 

  const { isGyroConfigOpen, closeGyroConfig } = useConfig();
  
  const defaultGyroConfig = {
    ip: "192.168.1.10",
    port: "1884",
    topic: ["gyro/sim", "device/attitude"],
    username: "user_gyro",
    password: "password123",
    updateRate: "1000",
  };

  const {
    config: gyroConfig,
    saveConfig: handleGyroConfigSave,
    resetToDefault: handleGyroConfigDefault,
    clearConfig: handleGyroConfigClear,
    configSaved: gyroConfigSaved,
  } = useSensorConfig("gyro", defaultGyroConfig);

  const [simData, setSimData] = useState({
    yaw: 0.0, // <-- DIGANTI
    pitch: 0.0,
    roll: 0.0,
    yaw_rate: 2.5, // <-- DIGANTI
    last_update: "N/A",
    is_running: false,
  });

  const [editData, setEditData] = useState({
    yaw: "0", // <-- DIGANTI
    pitch: "0",
    roll: "0",
  });

  // State baru untuk menyimpan data original saat mode edit
  const [originalEditData, setOriginalEditData] = useState(null);

  const [isGyroRecordCreated, setIsGyroRecordCreated] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmPopup, setConfirmPopup] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(simData.is_running);
    }
  }, [simData.is_running, onStatusChange]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const response = await axios.get(API_URL);
        if (response.data && response.data.data) {
          setSimData(response.data.data);
          setEditData({
            yaw: String(response.data.data.yaw), // <-- DIGANTI
            pitch: String(response.data.data.pitch),
            roll: String(response.data.data.roll),
          });
          setIsGyroRecordCreated(true);
        }
      } catch (error) {
        if (error.response && error.response.status === 404) {
          console.log("No initial Gyro data found.");
          setIsGyroRecordCreated(false);
        } else {
          console.error("Failed to fetch initial gyro data:", error);
        }
      }
    };

    const connectWebSocket = () => {
      wsClient.current = new WebSocket("ws://localhost:8081");

      wsClient.current.onopen = () => {
        console.log("Gyro WebSocket Connected");
      };

      wsClient.current.onmessage = (event) => {
          try {
          const messageData = JSON.parse(event.data);
          if (messageData.type === "gyro_update" && messageData.data) {
            setSimData(messageData.data);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      wsClient.current.onclose = () => {
        console.log("Gyro WebSocket Disconnected");
      };

      wsClient.current.onerror = (error) => {
        console.error("Gyro WebSocket Error:", error);
      };
    };

    fetchInitialData();
    connectWebSocket();

    return () => {
      if (wsClient.current) {
        wsClient.current.close();
      }
    };
  }, []);

  
  const handleGyroSaveAndCloseControl = (newConfig, shouldClose) => {
    handleGyroConfigSave(newConfig); 
    if (shouldClose) {
      closeGyroConfig(); 
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleSuccessfulUpdate = (data) => {
    setSimData(data);
    if (!isGyroRecordCreated) {
      setIsGyroRecordCreated(true);
    }
  };

  const handleSave = async () => {
    const payload = {
      yaw: parseFloat(editData.yaw) || 0, // <-- DIGANTI
      pitch: parseFloat(editData.pitch) || 0,
      roll: parseFloat(editData.roll) || 0,
    };
  
    try {
      const method = isGyroRecordCreated ? "patch" : "post";
      if (method === 'post') {
        payload.yaw_rate = simData.yaw_rate; // <-- DIGANTI
        payload.is_running = simData.is_running;
      }
      const response = await axios[method](API_URL, payload);
      handleSuccessfulUpdate(response.data.data);
    } catch (error) {
      console.error("Error saving data:", error.response || error);
    }
  };

  const handleDefault = async () => {
    if (!isGyroRecordCreated) {
      const defaultValues = { yaw: 0, pitch: 0, roll: 0 }; // <-- DIGANTI
      setSimData(prev => ({ ...prev, ...defaultValues }));
      setEditData({ yaw: "0", pitch: "0", roll: "0" }); // <-- DIGANTI
      return;
    }

    try {
      const response = await axios.patch(API_URL, { yaw: 0, pitch: 0, roll: 0 }); // <-- DIGANTI
      handleSuccessfulUpdate(response.data.data);
      setEditData({ yaw: "0", pitch: "0", roll: "0" }); // <-- DIGANTI
    } catch (error) {
      console.error("Error setting data to default:", error.response || error);
    }
  };

  // FUNGSI HANDLE EDIT TOGGLE YANG SUDAH DIPERBAIKI TOTAL
  const handleEditToggle = async () => {
    if (simData.is_running) {
      return;
    }

    // LOGIKA SAAT KELUAR DARI MODE EDIT (KLIK KEDUA)
    if (isEditing) {
      // Cek apakah ada perubahan antara data di form dengan data original
      const hasChanged =
        originalEditData.yaw !== editData.yaw || // <-- DIGANTI
        originalEditData.pitch !== editData.pitch ||
        originalEditData.roll !== editData.roll;

      // Jika ada perubahan, baru jalankan proses simpan
      if (hasChanged) {
        console.log("Data changed, saving...");
        const payload = {
          yaw: parseFloat(editData.yaw) || 0, // <-- DIGANTI
          pitch: parseFloat(editData.pitch) || 0,
          roll: parseFloat(editData.roll) || 0,
        };

        try {
          const method = isGyroRecordCreated ? 'patch' : 'post';
          if (method === 'post') {
            payload.yaw_rate = simData.yaw_rate; // <-- DIGANTI
            payload.is_running = false;
          }
          const response = await axios[method](API_URL, payload);
          handleSuccessfulUpdate(response.data.data);
        } catch (error) {
          console.error("Error updating data on edit toggle:", error.response || error);
        }
      } else {
        console.log("No changes detected, exiting edit mode.");
      }
      
      // Keluar dari mode edit, baik ada perubahan maupun tidak
      setIsEditing(false);
      setOriginalEditData(null); // Bersihkan data original

    // LOGIKA SAAT MASUK MODE EDIT (KLIK PERTAMA)
    } else {
      const currentData = {
        yaw: String(Math.round(simData.yaw)), // <-- DIGANTI
        pitch: String(Math.round(simData.pitch)),
        roll: String(Math.round(simData.roll)),
      };

      // Set nilai untuk ditampilkan di form input
      setEditData(currentData);
      // Simpan nilai ini sebagai "original" untuk perbandingan nanti
      setOriginalEditData(currentData);
      
      setIsEditing(true);
    }
  };

  const handlePlay = async () => {
    const payload = { ...simData, is_running: true, update_rate: parseInt(gyroConfig.updateRate, 10) };
    try {
        const method = isGyroRecordCreated ? "patch" : "post";
        const response = await axios[method](API_URL, payload);
        handleSuccessfulUpdate(response.data.data);
        setIsEditing(false);
    } catch (error) {
        console.error("Error starting simulation:", error.response || error);
    }
  };

  const handleStop = async () => {
    if (!isGyroRecordCreated) return;
    try {
        const response = await axios.patch(API_URL, { is_running: false });
        handleSuccessfulUpdate(response.data.data);
    } catch (error) {
        console.error("Error stopping simulation:", error.response || error);
    }
  };

  const executeDelete = async () => {
    try {
        await axios.delete(API_URL);
        setSimData({
            yaw: 0.0, pitch: 0.0, roll: 0.0, yaw_rate: 2.5, // <-- DIGANTI
            last_update: "N/A", is_running: false,
        });
        setEditData({ yaw: "0", pitch: "0", roll: "0" }); // <-- DIGANTI
        setIsGyroRecordCreated(false);
        closeConfirmPopup();
    } catch (error) {
        console.error("Error deleting data:", error.response || error);
        closeConfirmPopup();
    }
  };

  const handleDelete = () => {
    showConfirmation({
        title: "Delete Gyro Data",
        message: "Are you sure you want to delete all simulation data? This action cannot be undone.",
        onConfirm: executeDelete,
    });
  };

  const handleClearEditData = () => {
    setEditData({ yaw: "0", pitch: "0", roll: "0" }); // <-- DIGANTI
};

  const updateYawRate = async (newRate) => { // <-- DIGANTI (Nama Fungsi)
    if (!isGyroRecordCreated) {
        setSimData(prev => ({...prev, yaw_rate: newRate})); // <-- DIGANTI
        return;
    }
    try {
        const response = await axios.patch(API_URL, { yaw_rate: newRate }); // <-- DIGANTI
        handleSuccessfulUpdate(response.data.data);
    } catch (error) {
        console.error("Error updating yaw rate:", error.response || error); // <-- DIGANTI
    }
  };

  const handleDecreaseYawRate = () => { // <-- DIGANTI (Nama Fungsi)
    const newRate = Math.max(0, simData.yaw_rate - 0.5); // <-- DIGANTI
    updateYawRate(newRate); // <-- DIGANTI
  };

  const handleIncreaseYawRate = () => { // <-- DIGANTI (Nama Fungsi)
    const newRate = simData.yaw_rate + 0.5; // <-- DIGANTI
    updateYawRate(newRate); // <-- DIGANTI
  };

  const showConfirmation = (config) => {
    setConfirmPopup({
      isOpen: true,
      ...config
    });
  };

  const closeConfirmPopup = () => {
    setConfirmPopup({
      isOpen: false,
      title: "",
      message: "",
      onConfirm: () => {},
    });
  };

  const handleConfirm = () => {
    confirmPopup.onConfirm();
    closeConfirmPopup();
  };


  const renderGyroStatusImage = () => {
    if (!isGyroRecordCreated) {
        return <img src={Waiting} alt="Waiting" className="status-image" />;
    }
    return simData.is_running 
        ? <img src={Active} alt="Active" className="status-image" />
        : <img src={Stop} alt="Stop" className="status-image" />;
  };

  const formatDateTime = (isoString) => {
    if (!isoString || isoString === "N/A") return "N/A";
    try {
      const date = new Date(isoString);
      const day = String(date.getDate()).padStart(2, "0");
      const month = date.toLocaleString("en-GB", { month: "short" });
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      return `${day} ${month} ${year}, ${hours}:${minutes}:${seconds}`;
    } catch (error) {
      console.error("Invalid date format:", isoString);
      return isoString;
m   }
  };

  const formatHeading = (deg) => {
    const d = Math.round(deg);
    let dir = "N";
    if (d >= 337.5 || d < 22.5) dir = "N";
    else if (d >= 22.5 && d < 67.5) dir = "NE";
    else if (d >= 67.5 && d < 112.5) dir = "E";
    else if (d >= 112.5 && d < 157.5) dir = "SE";
    else if (d >= 157.5 && d < 202.5) dir = "S";
    else if (d >= 202.5 && d < 247.5) dir = "SW";
    else if (d >= 247.5 && d < 292.5) dir = "W";
    else if (d >= 292.5 && d < 337.5) dir = "NW";
    return `${dir}${String(d % 360).padStart(3, "0")}°`;
  };

  const formatWithSign = (num, dec = 1) =>
    num >= 0 ? `+${num.toFixed(dec)}` : num.toFixed(dec);


  return (
    <div className="gyro-page-scope">
      {gyroConfigSaved && (
        <div className="global-config-saved-notif">Config saved!</div>
      )}

      <ConfirmationPopup
        isOpen={confirmPopup.isOpen}
        onClose={closeConfirmPopup}
        onConfirm={handleConfirm}
        title={confirmPopup.title}
        message={confirmPopup.message}
      />

      <ConfigPopup
        isOpen={isGyroConfigOpen}
        onClose={closeGyroConfig}
        config={gyroConfig}
        onSave={handleGyroSaveAndCloseControl}
        onDefault={handleGyroConfigDefault}
        onClear={handleGyroConfigClear}
      />

      <div className="main-content">
        <div className="data-display-panel">
          <div className="panel-header">
            <h2>Simulasi Data</h2>
          </div>
          <div className="top-info-container">
            <div className="info-column-left">
              <div className="last-update-box">
                <span>Last update time: {formatDateTime(simData.last_update)}</span>
              </div>
              <div className="status-container">
                <div className="status-item">
                  <span className="status-label">STATUS</span>
                  <div className="status-value-container">
                    {renderGyroStatusImage()}
                  </div>
                </div>
                <div className="status-item">
                  <span className="status-label">UPDATE RATE</span>
                  <div className="update-rate-value">
                    {gyroConfig.updateRate}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="gyro-visuals-container">
           <div className="gyro-card">
              <div className="card-header">
                <div className="card-title">
                  <img src={Frame2} alt="Pitch Icon" />
                  <span>Pitch</span>
                </div>
                <h3>{formatWithSign(simData.pitch)}°</h3>
              </div>
              <PitchGauge pitch={simData.pitch} />
            </div>
            <div className="gyro-card">
              <div className="card-header">
                <div className="card-title">
                  <img src={Frame1} alt="Yaw Icon" /> {/* <-- DIGANTI */}
                  <span>Yaw</span> {/* <-- DIGANTI */}
                </div>
                <h3>{formatHeading(simData.yaw)}</h3> {/* <-- DIGANTI */}
              </div>
              <HeadingGauge heading={simData.yaw} /> {/* <-- DIGANTI */}
              <div className="card-footer heading-rate-control">
                <span>Yaw Rate</span> {/* <-- DIGANTI */}
                <div className="rate-control-group">
                  <button
                    className="rate-btn btn-decrease"
                    onClick={handleDecreaseYawRate} // <-- DIGANTI
                  >
                    ◀
                  </button>
                  <span className="rate-value">{simData.yaw_rate.toFixed(1)}°/s</span> {/* <-- DIGANTI */}
                  <button
                    className="rate-btn btn-increase"
                    onClick={handleIncreaseYawRate} // <-- DIGANTI
                  >
                    ▶
                  </button>
              _ </div>
              </div>
            </div>
            <div className="gyro-card">
              <div className="card-header">
                <div className="card-title">
                  <img src={Frame3} alt="Roll Icon" />
                <span>Roll</span>
                </div>
                <h3>{simData.roll.toFixed(1)}°</h3>
              </div>
              <RollGauge roll={simData.roll} />
            </div>
          </div>
          <div className="action-buttons-container">
            <button
              className="action-btn"
              onClick={handlePlay}
              disabled={simData.is_running}
            >
              <img src={iconPlay} alt="Play" />
            </button>
            <button
              className="action-btn stop-btn"
              onClick={handleStop}
              disabled={!simData.is_running}
            >
              <img src={iconStop} alt="Stop" />
            </button>
            <div className="separator"></div>
            <button className="action-btn delete-btn" onClick={handleDelete}>
               <img src={iconDelete} alt="Delete" />
              Delete
            </button>
          </div>
        </div>

        <div className="edit-data-panel">
          <div className="panel-header">
            <h2>Edit Data</h2>
            <div className="header-actions">
             <button
                className="header-action-btn edit-btn"
                onClick={handleEditToggle}
                disabled={simData.is_running}
              >
                <img src={iconEdit} alt="Edit" />
              </button>
              <button
                className="header-action-btn delete-btn"
                onClick={handleClearEditData}
          _   >
                <img src={iconDelete} alt="Delete" />
              </button>
            </div>
          </div>
          <div className="form-container">
            <div className="input-group">
              <label>Set Yaw</label> {/* <-- DIGANTI */}
              <input
                type="number"
                name="yaw" // <-- DIGANTI
                value={editData.yaw} // <-- DIGANTI
                onChange={handleInputChange}
                disabled={!isEditing}
              />
            </div>
           <div className="input-group">
              <label>Set Pitch</label>
              <input
                type="number"
                name="pitch"
                value={editData.pitch}
                onChange={handleInputChange}
                disabled={!isEditing}
              />
            </div>
            <div className="input-group">
             <label>Set Roll</label>
              <input
                type="number"
                name="roll"
            _   value={editData.roll}
                onChange={handleInputChange}
  s             disabled={!isEditing}
              />
            </div>
          </div>
          <div className="edit-panel-actions">
            <button className="btn-default" onClick={handleDefault}>
              Default
            </button>
            <button className="btn-save" onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GyroPage;
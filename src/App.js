import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import "./components/SimulatorFrom.css";
import ConfigPopup from "./components/ConfigPopup";
import ConfirmationPopup from "./components/ConfirmationPopUp";
import DarkModeToggle from "./components/DarkModeToggle";
import GyroPage from "./components/GyroPage";
import { ConfigProvider, useConfig } from "./components/ConfigContext";

// --- Asset Imports ---
import iconDashboard from "./assets/inactive/Property 1=Dashboard_icon-Default.png";
import iconGPSDefault from "./assets/inactive/ButtonID=GPS_icon-Default.png";
import iconGPSActive from "./assets/active/ButtonID=GPS_icon-Active.png";
import iconGyroDefault from "./assets/inactive/ButtonID=Gyro_icon-Default.png";
import iconGyroActive from "./assets/active/ButtonID=Gyro_icon-Active.png";
import iconThermal from "./assets/inactive/ButtonID=Thermal_icon-Default.png";
import iconPlaceHolder2 from "./assets/inactive/ButtonID=Placeholder2_icon-Default.png";
import iconPlaceHolder3 from "./assets/inactive/ButtonID=Placeholder3_icon-Default.png";
import statusWaiting from "./assets/status/Property 1=Waiting.png";
import statusActive from "./assets/status/Property 1=Active.png";
import statusStopImg from "./assets/status/Property 1=Stop.png";
import iconSend from "./assets/icon/PropertySend.png";
import iconStop from "./assets/icon/PropertyStop.png";
import iconDelete from "./assets/icon/PropertyDelete.png";
import iconEditPanel from "./assets/icon/PropertyEdit.png";
import iconDeletePanel from "./assets/icon/PropertyDelete.png";

// --- Komponen Inti Aplikasi ---
const AppContent = () => {
  // --- State Utama ---
  const [activeMenu, setActiveMenu] = useState("GPS");
  const { openGpsConfig, openGyroConfig, isGpsConfigOpen, closeGpsConfig } =
    useConfig();

  const pageTitles = {
    Dashboard: "Dashboard",
    GPS: "NDDU Simulator",
    Gyro: "Gyroscope Simulator",
    Thermal: "Thermal Simulator",
    Sensor: "Sensor View",
    Chart: "Chart View",
  };

  // --- State untuk Halaman GPS ---
  const defaultInput = {
    latitude: 58.430493,
    longitude: 15.732333,
    variation: 6.4,
    cog: 30.0,
    sog: 0.5,
  };
  const defaultConfig = {
    ip: "192.168.1.1",
    port: "1883",
    topic: ["gps/sim", "device/data"],
    username: "admin",
    password: "admin",
    updateRate: "1000",
  };
  const emptyConfig = {
    ip: "",
    port: "",
    topic: [],
    username: "",
    password: "",
    updateRate: "",
  };

  // State Data & Input
  const [inputData, setInputData] = useState(defaultInput);
  const [editData, setEditData] = useState(defaultInput);
  const [displayData, setDisplayData] = useState(defaultInput);
  const [isEditingData, setIsEditingData] = useState(false);
  const [editWarning, setEditWarning] = useState("");

  // State Simulasi & Status
  const [isSimulationActive, setIsSimulationActive] = useState(false);
  const [status, setStatus] = useState("Stop");
  const [lastUpdateTime, setLastUpdateTime] = useState(
    new Date().toISOString()
  );
  const [dataSent, setDataSent] = useState(false);
  const [isRecordCreated, setIsRecordCreated] = useState(false);

  // State Konfigurasi & Popup
  const [config, setConfig] = useState(defaultConfig);
  const [configSaved, setConfigSaved] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);
  const [confirmPopup, setConfirmPopup] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const wsClient = useRef(null);

  // Client Control REF
  const clientControlRef = useRef({
    isClientControlled: true,
    clientSimulationState: false,
    lastClientAction: null,
    ignoreWebSocketState: false,
  });

  // Input REFs untuk uncontrolled components
  const inputRefs = useRef({
    latitude: null,
    longitude: null,
    sog: null,
    cog: null,
    variation: null,
  });

  // --- Fungsi Helper & Formatter ---
  const formatDateTime = (isoString) => {
    if (!isoString) return "N/A";
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
    }
  };

  const calcMagneticVariation = (lat, lon) => {
    if (lat === "" || lon === "" || isNaN(lat) || isNaN(lon)) return "";
    return parseFloat(
      (
        2.5 * Math.sin((lat / 90) * Math.PI) +
        1.2 * Math.cos((lon / 180) * Math.PI)
      ).toFixed(2)
    );
  };

  const toDMS = (coord, isLatitude) => {
    if (coord === null || coord === undefined || isNaN(coord))
      return "--° --' --\" --";
    const absolute = Math.abs(coord);
    const degrees = Math.floor(absolute);
    const minutesNotTruncated = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesNotTruncated);
    const seconds = Math.floor((minutesNotTruncated - minutes) * 60);
    const direction = isLatitude
      ? coord >= 0
        ? "N"
        : "S"
      : coord >= 0
      ? "E"
      : "W";
    return `${Math.abs(degrees)}° ${minutes}' ${seconds}" ${direction}`;
  };

  const renderStatusImage = () => {
    switch (status) {
      case "Running":
        return <img src={statusActive} alt="Active" className="status-image" />;
      case "Stop":
        return <img src={statusStopImg} alt="Stop" className="status-image" />;
      case "API Error":
        return <img src={statusStopImg} alt="Error" className="status-image" />;
      default:
        return (
          <img src={statusWaiting} alt="Waiting" className="status-image" />
        );
    }
  };

  const formatNumber = (value, decimals = 1) =>
    value === null || value === undefined || isNaN(value)
      ? "--"
      : parseFloat(value).toFixed(decimals);

  // --- Input Handlers (OPTIMIZED) ---
  const handleInputBlur = (fieldName) => (e) => {
    const value = e.target.value;

    if (value === "" || value === "-") {
      setEditData((prev) => ({ ...prev, [fieldName]: value }));
      return;
    }

    const numValue = parseFloat(value);

    if (isNaN(numValue)) {
      // Reset ke nilai sebelumnya jika invalid
      e.target.value = editData[fieldName];
      return;
    }

    let validatedValue = numValue;
    let warningMessage = "";

    switch (fieldName) {
      case "latitude":
        if (numValue > 90 || numValue < -90) {
          warningMessage = "Latitude must be between -90 and 90.";
          validatedValue = Math.max(-90, Math.min(90, numValue));
          e.target.value = validatedValue;
        }
        break;
      case "longitude":
        if (numValue > 180 || numValue < -180) {
          warningMessage = "Longitude wrapped between -180 and 180.";
          let wrappedValue = numValue;
          while (wrappedValue > 180) wrappedValue -= 360;
          while (wrappedValue < -180) wrappedValue += 360;
          validatedValue = wrappedValue;
          e.target.value = validatedValue;
        }
        break;
      case "cog":
        if (numValue > 360 || numValue < 0) {
          warningMessage = "Course must be between 0 and 360.";
          validatedValue = ((numValue % 360) + 360) % 360;
          e.target.value = validatedValue;
        }
        break;
      case "sog":
        if (numValue < 0) {
          warningMessage = "Speed cannot be negative.";
          validatedValue = Math.max(0, numValue);
          e.target.value = validatedValue;
        }
        break;
      default:
        validatedValue = numValue;
    }

    if (warningMessage) {
      setEditWarning(warningMessage);
      setTimeout(() => setEditWarning(""), 3000);
    }

    setEditData((prev) => ({ ...prev, [fieldName]: validatedValue }));
  };

  // --- Event Handlers ---
  const handleHeaderConfigClick = () => {
    if (activeMenu === "GPS") {
      openGpsConfig();
    } else if (activeMenu === "Gyro") {
      openGyroConfig();
    }
  };

  const handleStartSimulation = async () => {
    console.log("🎮 CLIENT: Starting simulation");

    clientControlRef.current = {
      isClientControlled: true,
      clientSimulationState: true,
      lastClientAction: "start",
      ignoreWebSocketState: true,
    };

    setIsSimulationActive(true);
    setStatus("Running");
    setIsEditingData(false);

    const payload = {
      latitude: parseFloat(inputData.latitude) || 0,
      longitude: parseFloat(inputData.longitude) || 0,
      sog: parseFloat(inputData.sog) || 0,
      cog: parseFloat(inputData.cog) || 0,
      update_rate: parseInt(config.updateRate, 10) || 1000,
      is_running: true,
    };

    try {
      const method = isRecordCreated ? "patch" : "post";
      const response = await axios[method](
        "http://localhost:8080/api/gps",
        payload
      );
      const dataFromServer = response.data.data;
      const newData = {
        latitude: dataFromServer.latitude,
        longitude: dataFromServer.longitude,
        sog: dataFromServer.sog,
        cog: dataFromServer.cog,
        variation: dataFromServer.variation,
      };
      setInputData(newData);
      setDisplayData(newData);
      setIsRecordCreated(true);

      setTimeout(() => {
        clientControlRef.current.ignoreWebSocketState = false;
      }, 3000);
    } catch (error) {
      console.error("Start simulation error:", error.response || error);
      clientControlRef.current.clientSimulationState = false;
      setIsSimulationActive(false);
      setStatus("API Error");
    }
  };

  const handleStopSimulation = async () => {
    console.log("🎮 CLIENT: Stopping simulation");

    clientControlRef.current = {
      isClientControlled: true,
      clientSimulationState: false,
      lastClientAction: "stop",
      ignoreWebSocketState: true,
    };

    setIsSimulationActive(false);
    setStatus("Stop");
    setIsEditingData(false);

    try {
      const response = await axios.patch("http://localhost:8080/api/gps", {
        is_running: false,
      });

      if (response.data && response.data.data) {
        const serverData = response.data.data;
        const newData = {
          latitude: serverData.latitude,
          longitude: serverData.longitude,
          sog: serverData.sog,
          cog: serverData.cog,
          variation: serverData.variation,
        };
        setInputData(newData);
        setDisplayData(newData);
        setEditData(newData);

        // Update input values
        Object.keys(inputRefs.current).forEach((key) => {
          if (inputRefs.current[key]) {
            inputRefs.current[key].value = newData[key];
          }
        });
      }
    } catch (error) {
      console.error("Stop command failed:", error.response || error);
    }

    setTimeout(() => {
      clientControlRef.current.ignoreWebSocketState = false;
    }, 5000);
  };

  const handleSendData = async () => {
    // Get current values from refs
    const currentValues = {
      latitude: inputRefs.current.latitude?.value || editData.latitude,
      longitude: inputRefs.current.longitude?.value || editData.longitude,
      sog: inputRefs.current.sog?.value || editData.sog,
      cog: inputRefs.current.cog?.value || editData.cog,
      variation: inputRefs.current.variation?.value || editData.variation,
    };

    const payload = {
      latitude: parseFloat(currentValues.latitude) || 0,
      longitude: parseFloat(currentValues.longitude) || 0,
      sog: parseFloat(currentValues.sog) || 0,
      cog: parseFloat(currentValues.cog) || 0,
      is_running: false,
    };

    try {
      const method = isRecordCreated ? "patch" : "post";
      const response = await axios[method](
        "http://localhost:8080/api/gps",
        payload
      );
      const dataFromServer = response.data.data;
      const newData = {
        latitude: dataFromServer.latitude,
        longitude: dataFromServer.longitude,
        sog: dataFromServer.sog,
        cog: dataFromServer.cog,
        variation: dataFromServer.variation,
      };

      clientControlRef.current.clientSimulationState = false;
      setIsSimulationActive(false);
      setStatus("Stop");

      setInputData(newData);
      setDisplayData(newData);
      setEditData(newData);

      if (!isRecordCreated) {
        setIsRecordCreated(true);
      }
      setDataSent(true);
      setTimeout(() => setDataSent(false), 2000);
    } catch (error) {
      console.error("Axios Error:", error.response || error);
      setStatus("API Error");
    }
  };

  const executeClearForm = async () => {
    try {
      await axios.delete("http://localhost:8080/api/gps");
      const emptyData = {
        latitude: "",
        longitude: "",
        variation: "",
        cog: "",
        sog: "",
      };
      setEditData(emptyData);
      setInputData(emptyData);
      setDisplayData(emptyData);

      // Clear input values
      Object.keys(inputRefs.current).forEach((key) => {
        if (inputRefs.current[key]) {
          inputRefs.current[key].value = "";
        }
      });

      if (isSimulationActive) {
        await handleStopSimulation();
      }
      setIsRecordCreated(false);
    } catch (error) {
      console.error("Axios Error:", error.response || error);
      setStatus("API Error");
    }
    closeConfirmPopup();
  };

  const executeClearEditForm = () => {
    const emptyData = {
      latitude: "",
      longitude: "",
      variation: "",
      cog: "",
      sog: "",
    };
    setEditData(emptyData);

    // Clear input values
    Object.keys(inputRefs.current).forEach((key) => {
      if (inputRefs.current[key]) {
        inputRefs.current[key].value = "";
      }
    });

    closeConfirmPopup();
  };

  const openConfirmPopup = (type) => {
    if (type === "clearData") {
      setConfirmPopup({
        isOpen: true,
        title: "Hapus Data Simulasi",
        message: "Apakah Anda yakin ingin menghapus semua data simulasi?",
        onConfirm: () => executeClearForm(),
      });
    } else if (type === "clearInput") {
      setConfirmPopup({
        isOpen: true,
        title: "Hapus Input",
        message:
          "Apakah Anda yakin ingin mengosongkan semua input di panel Edit Data?",
        onConfirm: () => executeClearEditForm(),
      });
    }
  };

  const closeConfirmPopup = () => {
    setConfirmPopup({
      isOpen: false,
      title: "",
      message: "",
      onConfirm: () => {},
    });
  };

  const handleToggleAndApplyEdit = () => {
    if (isEditingData) {
      // Get current values from refs for calculation
      const currentValues = {
        latitude: inputRefs.current.latitude?.value || editData.latitude,
        longitude: inputRefs.current.longitude?.value || editData.longitude,
        sog: inputRefs.current.sog?.value || editData.sog,
        cog: inputRefs.current.cog?.value || editData.cog,
        variation: inputRefs.current.variation?.value || editData.variation,
      };

      const newVariation = calcMagneticVariation(
        Number(currentValues.latitude),
        Number(currentValues.longitude)
      );
      const dataToApply = { ...currentValues, variation: newVariation };

      setInputData(dataToApply);
      setDisplayData(dataToApply);
      setEditData(dataToApply);
      setIsEditingData(false);
    } else {
      setIsEditingData(true);
    }
  };

  // Handler untuk reset form ke nilai default
  const handleResetForm = () => {
    setEditData(defaultInput);
    setInputData(defaultInput);
    setDisplayData(defaultInput);

    // Update input values dengan nilai default
    Object.keys(inputRefs.current).forEach((key) => {
      if (inputRefs.current[key]) {
        inputRefs.current[key].value = defaultInput[key];
      }
    });

    setEditWarning("");
  };

  // Tambahkan state untuk tracking config dari server
  const [serverConfig, setServerConfig] = useState(null);

  // Fungsi untuk fetch config dari API
  const fetchGpsConfig = async () => {
    try {
      const response = await axios.get("http://localhost:8080/api/gps/config");
      if (response.data && response.data.data) {
        const configFromServer = {
          ip: response.data.data.ip,
          port: String(response.data.data.port),
          topic: response.data.data.topics || [],
          username: response.data.data.username,
          password: response.data.data.password,
          updateRate: String(response.data.data.update_rate),
        };
        setConfig(configFromServer);
        setServerConfig(configFromServer);
        localStorage.setItem("gpsConfig", JSON.stringify(configFromServer));
        console.log("✅ Config loaded from server");
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log("⚠️ No GPS config found on server, using default config.");
        const savedConfig = localStorage.getItem("gpsConfig");
        if (savedConfig) {
          setConfig(JSON.parse(savedConfig));
        } else {
          setConfig(defaultConfig);
          localStorage.setItem("gpsConfig", JSON.stringify(defaultConfig));
        }
      } else {
        console.error("Failed to fetch GPS config:", error.message);
      }
    }
  };

  // Handler untuk save config yang terintegrasi dengan API
  const handleConfigSave = async (newConfig) => {
    const isNewConfigValid = Object.entries(newConfig).every(([key, value]) => {
      if (key === "topic") return Array.isArray(value) && value.length > 0;
      return String(value).trim() !== "";
    });

    if (isNewConfigValid) {
      try {
        const payload = {
          ip: newConfig.ip,
          port: parseInt(newConfig.port, 10),
          username: newConfig.username,
          password: newConfig.password,
          update_rate: parseInt(newConfig.updateRate, 10),
          topics: newConfig.topic,
        };

        // PATCH akan create atau update config
        const response = await axios.patch(
          "http://localhost:8080/api/gps/config",
          payload
        );

        if (response.data && response.data.data) {
          const updatedConfig = {
            ip: response.data.data.ip,
            port: String(response.data.data.port),
            topic: response.data.data.topics || [],
            username: response.data.data.username,
            password: response.data.data.password,
            updateRate: String(response.data.data.update_rate),
          };

          setConfig(updatedConfig);
          localStorage.setItem("gpsConfig", JSON.stringify(updatedConfig));
          setConfigSaved(true);
          setTimeout(() => setConfigSaved(false), 2000);
          setIsConfigured(true);
          closeGpsConfig();

          console.log("✅ Config saved successfully");
        }
      } catch (error) {
        console.error(
          "❌ Failed to save config to server:",
          error.response?.data || error.message
        );

        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to save configuration. Please check your input and try again.";
        alert(errorMessage);
      }
    } else {
      setIsConfigured(false);
      console.error("❌ Invalid configuration - some fields are empty");
      alert(
        "All configuration fields must be filled, including at least one topic."
      );
    }
  };

  // Handler untuk default config
  const handleDefaultConfig = async () => {
    try {
      await axios.delete("http://localhost:8080/api/gps/config");
      console.log("✅ Config deleted");

      // Setelah delete, gunakan default config lokal
      setConfig(defaultConfig);
      localStorage.setItem("gpsConfig", JSON.stringify(defaultConfig));
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 2000);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log("⚠️ No config to delete, using default config");
        setConfig(defaultConfig);
        localStorage.setItem("gpsConfig", JSON.stringify(defaultConfig));
        setConfigSaved(true);
        setTimeout(() => setConfigSaved(false), 2000);
      } else {
        console.error("❌ Failed to reset config:", error.message);
        setConfig(defaultConfig);
        localStorage.setItem("gpsConfig", JSON.stringify(defaultConfig));
      }
    }
  };

  // Update handleClearConfig
  const handleClearConfig = () => {
    setConfig(emptyConfig);
    setIsConfigured(false);
    localStorage.removeItem("gpsConfig");
  };

  // --- Side Effects ---
  useEffect(() => {
    let isMounted = true;

    const connectWebSocket = () => {
      try {
        wsClient.current = new WebSocket("ws://localhost:8081");

        wsClient.current.onopen = () => {
          console.log("🔗 WebSocket Connected");
        };

        wsClient.current.onmessage = (event) => {
          if (!isMounted) return;

          try {
            const messageData = JSON.parse(event.data);
            if (messageData.type === "gps_update" && messageData.data) {
              const {
                latitude,
                longitude,
                sog,
                cog,
                variation,
                last_update,
                is_running,
              } = messageData.data;
              const newData = { latitude, longitude, sog, cog, variation };

              setLastUpdateTime(last_update || new Date().toISOString());

              if (clientControlRef.current.ignoreWebSocketState) {
                if (isSimulationActive) {
                  setDisplayData(newData);
                }
                return;
              }

              if (isSimulationActive) {
                setDisplayData(newData);
              } else {
                setInputData(newData);
                setDisplayData(newData);
                setEditData(newData);
              }

              if (!clientControlRef.current.isClientControlled) {
                if (is_running !== isSimulationActive) {
                  setIsSimulationActive(is_running);
                  setStatus(is_running ? "Running" : "Stop");

                  if (!is_running) {
                    setIsEditingData(false);
                  }
                }
              }
            }
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        wsClient.current.onclose = () => {
          console.log("🔌 WebSocket Disconnected");
          if (isMounted) {
            setStatus("Disconnected");
          }
        };

        wsClient.current.onerror = (error) => {
          console.error("WebSocket Error:", error);
        };
      } catch (error) {
        console.error("WebSocket connection failed:", error);
      }
    };

    const fetchInitialData = async () => {
      try {
        const response = await axios.get("http://localhost:8080/api/gps");
        const data = response.data.data;
        const initialData = {
          latitude: data.latitude,
          longitude: data.longitude,
          sog: data.sog,
          cog: data.cog,
          variation: data.variation,
        };

        if (isMounted) {
          setInputData(initialData);
          setEditData(initialData);
          setDisplayData(initialData);

          setIsSimulationActive(data.is_running);
          setStatus(data.is_running ? "Running" : "Stop");
          setIsConfigured(true);
          setIsRecordCreated(true);

          if (data.is_running) {
            setIsEditingData(false);
          }

          setTimeout(() => {
            clientControlRef.current.isClientControlled = true;
          }, 1000);
        }
      } catch (error) {
        if (error.response && error.response.status === 404) {
          console.log("No initial GPS data found on server.");
          if (isMounted) {
            setIsConfigured(true);
            setIsRecordCreated(false);
          }
        } else {
          console.error("Axios Error:", error.response || error);
          if (isMounted) {
            setStatus("API Error");
          }
        }
      }
    };

    fetchInitialData();
    connectWebSocket();

    return () => {
      isMounted = false;
      if (wsClient.current) {
        wsClient.current.close();
      }
    };
  }, [isSimulationActive]);

  // Tambahkan useEffect untuk fetch config saat pertama kali load
  useEffect(() => {
    // Fetch config dari server saat aplikasi pertama kali dibuka
    if (activeMenu === "GPS") {
      fetchGpsConfig();
    }
  }, []); // Run once on mount

  // --- Render Logic ---
  const isDisabled = !isConfigured;

  // Komponen Halaman Placeholder
  const Dashboard = () => (
    <div style={{ width: "100%", padding: "20px" }}>Dashboard Page Content</div>
  );
  const Thermal = () => (
    <div style={{ width: "100%", padding: "20px" }}>Thermal Page Content</div>
  );
  const Sensor = () => (
    <div style={{ width: "100%", padding: "20px" }}>Sensor Page Content</div>
  );
  const Chart = () => (
    <div style={{ width: "100%", padding: "20px" }}>Chart Page Content</div>
  );
  const GpsPage = ({ children }) => <>{children}</>;

  // --- JSX ---
  return (
    <div className="simulator-container">
      <div className="sidebar">
        <div
          className={`sidebar-icon${
            activeMenu === "Dashboard" ? " active" : ""
          }`}
          onClick={() => setActiveMenu("Dashboard")}
        >
          <img src={iconDashboard} alt="Dashboard" />
          <span className="sidebar-label">Dashboard</span>
        </div>
        <div
          className={`sidebar-icon${activeMenu === "GPS" ? " active" : ""}`}
          onClick={() => setActiveMenu("GPS")}
        >
          <img
            src={isSimulationActive ? iconGPSActive : iconGPSDefault}
            alt="GPS"
          />
          <span className="sidebar-label">GPS</span>
        </div>
        <div
          className={`sidebar-icon${activeMenu === "Gyro" ? " active" : ""}`}
          onClick={() => setActiveMenu("Gyro")}
        >
          <img src={iconGyroDefault} alt="Gyro" />
          <span className="sidebar-label">Gyroscope</span>
        </div>
        <div
          className={`sidebar-icon${activeMenu === "Thermal" ? " active" : ""}`}
          onClick={() => setActiveMenu("Thermal")}
        >
          <img src={iconThermal} alt="Thermal" />
          <span className="sidebar-label">Thermal</span>
        </div>
        <div
          className={`sidebar-icon${activeMenu === "Sensor" ? " active" : ""}`}
          onClick={() => setActiveMenu("Sensor")}
        >
          <img src={iconPlaceHolder2} alt="Sensor" />
          <span className="sidebar-label">Sensor</span>
        </div>
        <div
          className={`sidebar-icon${activeMenu === "Chart" ? " active" : ""}`}
          onClick={() => setActiveMenu("Chart")}
        >
          <img src={iconPlaceHolder3} alt="Chart" />
          <span className="sidebar-label">Chart</span>
        </div>
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
          <h1>{pageTitles[activeMenu] || "Simulator"}</h1>
          <button className="config-button" onClick={handleHeaderConfigClick}>
            Config
          </button>
        </header>

        {activeMenu === "GPS" && (
          <GpsPage>
            {configSaved && (
              <div className="global-config-saved-notif">Config saved!</div>
            )}
            {dataSent && (
              <div className="global-config-saved-notif">Data sent!</div>
            )}

            <ConfigPopup
              isOpen={isGpsConfigOpen}
              onClose={closeGpsConfig}
              config={config}
              onSave={handleConfigSave}
              onDefault={handleDefaultConfig}
              onClear={handleClearConfig}
            />

            <div className={`main-content`}>
              <div
                className={`data-display-panel ${isDisabled ? "disabled" : ""}`}
              >
                <div className="panel-header">
                  <h2>Simulasi Data</h2>
                </div>
                <div className="info-group-panel">
                  <div className="last-update-box">
                    <span className="last-update-value">
                      Last update time: {formatDateTime(lastUpdateTime)}
                    </span>
                  </div>
                  <div className="status-section">
                    <div className="status-container">
                      <div className="status-item">
                        <span className="status-label">STATUS</span>
                        <div className="status-value-container">
                          {renderStatusImage()}
                        </div>
                      </div>
                      <div className="status-item">
                        <span className="status-label">UPDATE RATE</span>
                        <div className="update-rate-value">
                          {config.updateRate} ms
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="position-section">
                  <h3>Position</h3>
                  <div className="coordinate-group">
                    <div className="coordinate-box">
                      <div className="coordinate-value">
                        {toDMS(displayData.latitude, true)}
                      </div>
                      <span className="coordinate-label">LATITUDE</span>
                    </div>
                    <div className="coordinate-box">
                      <div className="coordinate-value">
                        {toDMS(displayData.longitude, false)}
                      </div>
                      <span className="coordinate-label">LONGITUDE</span>
                    </div>
                  </div>
                </div>
                <div className="other-data-section">
                  <div className="data-box">
                    <div className="data-value">
                      {formatNumber(displayData.sog, 1)}{" "}
                      <span className="unit">knot</span>
                    </div>
                    <span className="data-label">SPEED OVER GROUND</span>
                  </div>
                  <div className="data-box">
                    <div className="data-value">
                      {formatNumber(displayData.cog, 1)}{" "}
                      <span className="unit">deg</span>
                    </div>
                    <span className="data-label">COURSE OVER GROUND</span>
                  </div>
                  <div className="data-box">
                    <div className="data-value">
                      {formatNumber(displayData.variation, 3)}{" "}
                      <span className="unit">deg</span>
                    </div>
                    <span className="data-label">MAGNETIC VARIATION</span>
                  </div>
                </div>
                <div className="action-buttons-container">
                  <div className="action-buttons-group">
                    <button
                      className="action-icon-btn"
                      onClick={handleStartSimulation}
                      disabled={isDisabled || isSimulationActive}
                    >
                      <img src={iconSend} alt="Start" />
                    </button>
                    <button
                      className="action-icon-btn"
                      onClick={handleStopSimulation}
                      disabled={isDisabled || !isSimulationActive}
                    >
                      <img src={iconStop} alt="Stop" />
                    </button>
                  </div>
                  <div className="action-divider"></div>
                  <button
                    className="action-delete-btn"
                    onClick={() => openConfirmPopup("clearData")}
                    disabled={isDisabled || isSimulationActive}
                  >
                    <img src={iconDelete} alt="Delete" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

              <div
                className={`edit-data-panel ${isDisabled ? "disabled" : ""}`}
              >
                <div className="panel-header">
                  <h2>Edit Data</h2>
                  <div className="panel-header-actions">
                    <button
                      className="panel-icon-btn btn-edit-icon"
                      onClick={handleToggleAndApplyEdit}
                      disabled={isDisabled || isSimulationActive}
                    >
                      <img src={iconEditPanel} alt="Edit" />
                    </button>
                    <button
                      className="panel-icon-btn btn-delete-icon"
                      onClick={() => openConfirmPopup("clearInput")}
                      disabled={isDisabled || isSimulationActive}
                    >
                      <img src={iconDeletePanel} alt="Delete" />
                    </button>
                  </div>
                </div>
                {editWarning && (
                  <div className="edit-panel-warning">{editWarning}</div>
                )}

                {/* OPTIMIZED INPUT FIELDS */}
                <div className="input-group">
                  <label>Latitude</label>
                  <input
                    type="number"
                    ref={(el) => (inputRefs.current.latitude = el)}
                    defaultValue={editData.latitude}
                    onBlur={handleInputBlur("latitude")}
                    step="any"
                    disabled={
                      isDisabled || !isEditingData || isSimulationActive
                    }
                  />
                </div>
                <div className="input-group">
                  <label>Longitude</label>
                  <input
                    type="number"
                    ref={(el) => (inputRefs.current.longitude = el)}
                    defaultValue={editData.longitude}
                    onBlur={handleInputBlur("longitude")}
                    step="any"
                    disabled={
                      isDisabled || !isEditingData || isSimulationActive
                    }
                  />
                </div>
                <div className="input-group">
                  <label>Speed Over Ground</label>
                  <input
                    type="number"
                    ref={(el) => (inputRefs.current.sog = el)}
                    defaultValue={editData.sog}
                    onBlur={handleInputBlur("sog")}
                    step="any"
                    disabled={
                      isDisabled || !isEditingData || isSimulationActive
                    }
                  />
                </div>
                <div className="input-group">
                  <label>Course Over Ground</label>
                  <input
                    type="number"
                    ref={(el) => (inputRefs.current.cog = el)}
                    defaultValue={editData.cog}
                    onBlur={handleInputBlur("cog")}
                    step="any"
                    disabled={
                      isDisabled || !isEditingData || isSimulationActive
                    }
                  />
                </div>
                <div className="input-group">
                  <label>Magnetic Variation</label>
                  <input
                    type="number"
                    ref={(el) => (inputRefs.current.variation = el)}
                    defaultValue={editData.variation}
                    onBlur={handleInputBlur("variation")}
                    step="any"
                    disabled={
                      isDisabled || !isEditingData || isSimulationActive
                    }
                  />
                </div>
                <div className="edit-panel-actions">
                  <button
                    className="btn-default"
                    onClick={handleResetForm}
                    disabled={isDisabled || isSimulationActive}
                  >
                    Default
                  </button>
                  <button
                    className="btn-save"
                    onClick={handleSendData}
                    disabled={isDisabled || isSimulationActive}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </GpsPage>
        )}

        {activeMenu === "Dashboard" && <Dashboard />}
        {activeMenu === "Thermal" && <Thermal />}
        {activeMenu === "Gyro" && <GyroPage />}
        {activeMenu === "Sensor" && <Sensor />}
        {activeMenu === "Chart" && <Chart />}
      </div>
    </div>
  );
};

// --- Komponen App Pembungkus ---
function App() {
  return (
    <ConfigProvider>
      <AppContent />
    </ConfigProvider>
  );
}

export default App;

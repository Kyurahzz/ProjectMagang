import { useState, useEffect } from "react";
import axios from "axios";

/**
 * Custom hook untuk manage sensor config (GPS, Gyro, dll)
 * @param {string} sensorType - 'gps' atau 'gyro'
 * @param {object} defaultConfig - config default untuk sensor
 * @param {function} closeConfigPopup - fungsi untuk tutup popup
 */
export function useSensorConfig(sensorType, defaultConfig, closeConfigPopup) {
  const [config, setConfig] = useState(defaultConfig);
  const [isLoading, setIsLoading] = useState(false);
  const [configSaved, setConfigSaved] = useState(false); // NEW

  const storageKey = `${sensorType}Config`;
  const apiEndpoint = `http://localhost:8080/api/${sensorType}/config`;
  const dataEndpoint = `http://localhost:8080/api/${sensorType}`;

  // Fetch config dari API
  const fetchConfig = async () => {
    try {
      const response = await axios.get(apiEndpoint);
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
        localStorage.setItem(storageKey, JSON.stringify(configFromServer));
        console.log(`${sensorType.toUpperCase()} config loaded from server`);
        return configFromServer;
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log(
          ` No ${sensorType.toUpperCase()} config found, using default`
        );
        const savedConfig = localStorage.getItem(storageKey);
        if (savedConfig) {
          const parsed = JSON.parse(savedConfig);
          setConfig(parsed);
          return parsed;
        } else {
          setConfig(defaultConfig);
          localStorage.setItem(storageKey, JSON.stringify(defaultConfig));
          return defaultConfig;
        }
      } else {
        console.error(`Failed to fetch ${sensorType} config:`, error.message);
        throw error;
      }
    }
  };

  // Save config ke API
  const saveConfig = async (newConfig) => {
    setIsLoading(true);
    try {
      const payload = {
        ip: newConfig.ip || "",
        port: newConfig.port ? parseInt(newConfig.port, 10) : 0,
        username: newConfig.username || "",
        password: newConfig.password || "",
        update_rate: newConfig.updateRate ? parseInt(newConfig.updateRate, 10) : 0,
        topics: Array.isArray(newConfig.topic) ? newConfig.topic : [],
      };

      // Try PATCH first
      try {
        const response = await axios.patch(apiEndpoint, payload);

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
          localStorage.setItem(storageKey, JSON.stringify(updatedConfig));
          
          // Show success notification
          setConfigSaved(true);
          setTimeout(() => setConfigSaved(false), 2000);
          
          if (closeConfigPopup) closeConfigPopup();
          console.log(
            `${sensorType.toUpperCase()} config saved successfully`
          );
          return updatedConfig;
        }
      } catch (patchError) {
        if (patchError.response && patchError.response.status === 404) {
          console.log(
            `${sensorType.toUpperCase()} data not found, creating...`
          );

          const createPayload =
            sensorType === "gps"
              ? {
                  latitude: 0.0,
                  longitude: 0.0,
                  sog: 0.0,
                  cog: 0.0,
                  update_rate: payload.update_rate || 1000,
                  is_running: false,
                }
              : {
                  heading_true: 0.0,
                  pitch: 0.0,
                  roll: 0.0,
                  heading_rate: 0.0,
                  update_rate: payload.update_rate || 1000,
                  is_running: false,
                };

          await axios.post(dataEndpoint, createPayload);
          console.log(`${sensorType.toUpperCase()} data created`);

          const response = await axios.patch(apiEndpoint, payload);

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
            localStorage.setItem(storageKey, JSON.stringify(updatedConfig));
            
            // Show success notification
            setConfigSaved(true);
            setTimeout(() => setConfigSaved(false), 2000);
            
            if (closeConfigPopup) closeConfigPopup();
            console.log(
              `${sensorType.toUpperCase()} config saved after creation`
            );
            return updatedConfig;
          }
        } else {
          throw patchError;
        }
      }
    } catch (error) {
      console.error(
        `Failed to save ${sensorType} config:`,
        error.response?.data || error.message
      );
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        `Failed to save ${sensorType} configuration.`;
      alert(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Reset to default config
  const resetToDefault = async () => {
    try {
      await axios.delete(apiEndpoint);
      console.log(`${sensorType.toUpperCase()} config deleted`);
    } catch (error) {
      if (error.response && error.response.status !== 404) {
        console.error(
          `Failed to reset ${sensorType} config:`,
          error.message
        );
      }
    }

    setConfig(defaultConfig);
    localStorage.setItem(storageKey, JSON.stringify(defaultConfig));
    return defaultConfig;
  };

  // Clear config
  const clearConfig = () => {
    const emptyConfig = {
      ip: "",
      port: "",
      topic: [],
      username: "",
      password: "",
      updateRate: "",
    };
    setConfig(emptyConfig);
    localStorage.removeItem(storageKey);
    return emptyConfig;
  };

  // Auto-fetch on mount
  useEffect(() => {
    fetchConfig();
  }, []);

  return {
    config,
    setConfig,
    fetchConfig,
    saveConfig,
    resetToDefault,
    clearConfig,
    isLoading,
    configSaved, // NEW: Export state untuk notification
  };
}

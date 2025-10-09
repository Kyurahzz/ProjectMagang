import React, { useState, useEffect } from "react";
import "./ConfigPopup.css";

// Impor ikon yang dibutuhkan
import iconEdit from "../assets/icon/PropertyEdit.png";
import iconDelete from "../assets/icon/PropertyDelete.png";

function ConfigPopup({ isOpen, onClose, config, onSave, onDefault, onClear }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempConfig, setTempConfig] = useState(config);
  const [warning, setWarning] = useState("");
  const [topicInput, setTopicInput] = useState("");

  useEffect(() => {
    if (isOpen) {
      const initialConfig = {
        ...config,
        topic: Array.isArray(config.topic)
          ? config.topic
          : config.topic
          ? [config.topic]
          : [],
      };
      setTempConfig(initialConfig);
      setIsEditing(false);
      setWarning("");
      setTopicInput("");
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleLocalChange = (e) => {
    const { name, value } = e.target;
    setTempConfig((prev) => ({ ...prev, [name]: value }));
  };

  const handleTopicKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const newTopic = topicInput.trim();
      if (newTopic && !tempConfig.topic.includes(newTopic)) {
        setTempConfig((prev) => ({
          ...prev,
          topic: [...prev.topic, newTopic],
        }));
      }
      setTopicInput("");
    }
  };

  const removeTopic = (indexToRemove) => {
    setTempConfig((prev) => ({
      ...prev,
      topic: prev.topic.filter((_, index) => index !== indexToRemove),
    }));
  };

  const handleCancel = () => {
    setTempConfig(config);
    setIsEditing(false);
    setWarning("");
  };

  const handleSave = () => {
    onSave(tempConfig);
    setIsEditing(false);
  };

  const handleClearAndEdit = () => {
    const emptyConf = {
      ip: "",
      port: "",
      topic: [],
      username: "",
      password: "",
      updateRate: "",
    };
    setTempConfig(emptyConf);
    onClear();
    setIsEditing(true);
    setWarning("");
  };

  const handleDefaultClick = () => {
    onDefault();
  };

  const handleEditClick = () => {
    if (isEditing) {
      handleSave();
    } else {
      setIsEditing(true);
    }
    setWarning("");
  };

  return (
    <div className="popup-overlay">
      <div className="popup-container config-popup">
        <div className="popup-header config-header">
          <div className="header-content-left">
            <span className="popup-title">CONFIGURATION</span>
          </div>
          <button className="popup-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="popup-content config-content">
          {warning && <div className="config-warning">{warning}</div>}

          <div className="config-row">
            <div className="config-label-col">
              <label>IP Address</label>
              <input
                name="ip"
                value={tempConfig.ip}
                onChange={handleLocalChange}
                placeholder="IP Address"
                readOnly={!isEditing}
                disabled={!isEditing}
                className={!isEditing ? "input-disabled" : ""}
              />
            </div>
            <div className="config-label-col">
              <label>Username</label>
              <input
                name="username"
                value={tempConfig.username}
                onChange={handleLocalChange}
                placeholder="Username"
                readOnly={!isEditing}
                disabled={!isEditing}
                className={!isEditing ? "input-disabled" : ""}
              />
            </div>
          </div>
          <div className="config-row">
            <div className="config-label-col">
              <label>Port</label>
              <input
                name="port"
                value={tempConfig.port}
                onChange={handleLocalChange}
                placeholder="Port"
                readOnly={!isEditing}
                disabled={!isEditing}
                className={!isEditing ? "input-disabled" : ""}
              />
            </div>
            <div className="config-label-col">
              <label>Password</label>
              <input
                name="password"
                type="password"
                value={tempConfig.password}
                onChange={handleLocalChange}
                placeholder="Password"
                readOnly={!isEditing}
                disabled={!isEditing}
                className={!isEditing ? "input-disabled" : ""}
              />
            </div>
          </div>
          <div className="config-row">
            <div className="config-label-col">
              <label>Topic</label>

              {isEditing && (
                <input
                  className="topic-input-field"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyDown={handleTopicKeyDown}
                  placeholder="Add new topic (press Enter)"
                />
              )}

              <div
                className={`topic-tags-display ${
                  !isEditing ? "topic-disabled" : ""
                }`}
              >
                {tempConfig.topic.map((topic, index) => (
                  <div key={index} className="topic-tag">
                    {topic}
                    {isEditing && (
                      <button
                        className="topic-tag-remove"
                        onClick={() => removeTopic(index)}
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}
                {tempConfig.topic.length === 0 && !isEditing && (
                  <span className="no-topics-message">
                    No topics configured.
                  </span>
                )}
              </div>
            </div>
            <div className="config-label-col">
              <label>Update Rate</label>
              <input
                name="updateRate"
                value={tempConfig.updateRate}
                onChange={handleLocalChange}
                placeholder="Update Rate (ms)"
                readOnly={!isEditing}
                disabled={!isEditing}
                className={!isEditing ? "input-disabled" : ""}
              />
            </div>
          </div>

          <div className="popup-actions config-actions">
            <div className="header-actions">
              <button
                className="header-btn edit-btn"
                onClick={handleEditClick}
                // disabled={!isEditing && tempConfig.ip === ""}
              >
                <img src={iconEdit} alt={isEditing ? "Apply" : "Edit"} />
                <span>{isEditing ? "Apply" : "Edit"}</span>
              </button>
              <button
                className="header-btn delete-btn"
                onClick={handleClearAndEdit}
                disabled={!isEditing}
              >
                <img src={iconDelete} alt="Delete" />
              </button>
            </div>

            <div>
              {isEditing ? (
                <>
                  <button
                    className="popup-btn-default config-btn"
                    onClick={handleCancel}
                  >
                    CANCEL
                  </button>
                  <button
                    className="popup-btn-save config-btn"
                    onClick={handleSave}
                  >
                    SAVE
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="popup-btn-default config-btn"
                    onClick={handleDefaultClick}
                  >
                    DEFAULT
                  </button>
                  <button
                    className="popup-btn-save config-btn"
                    onClick={handleSave}
                  >
                    SAVE
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfigPopup;

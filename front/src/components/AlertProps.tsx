import React, { useState, useEffect } from 'react';

type AlertProps = {
  id: number;
  type: string;
  message: string;
  onClose: (id: number) => void;
};

const Alert: React.FC<AlertProps> = ({ id, type, message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [id, onClose]);

  return (
    <div className={`alert ${type}`}>
      <button onClick={() => onClose(id)}>Close</button>
      <p>{message}</p>
    </div>
  );
};

const AlertContainer: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertProps[]>([]);

  const handleAddAlert = (type: string, message: string) => {
    const id = Math.floor(Math.random() * 1000000);
    const newAlert: AlertProps = {
        id, type, message,
        onClose: function (id: number): void {
            throw new Error('Function not implemented.');
        }
    };
    setAlerts(prevAlerts => [...prevAlerts, newAlert]);
  };

  const handleCloseAlert = (id: number) => {
    setAlerts(prevAlerts => prevAlerts.filter(alert => alert.id !== id));
  };

  return (
    <div>
      <button onClick={() => handleAddAlert('success', 'Success message')}>Show Success Alert</button>
      <button onClick={() => handleAddAlert('error', 'Error message')}>Show Error Alert</button>
      <div className="alerts">
        {alerts.map(alert => (
          <Alert key={alert.id} {...alert} onClose={handleCloseAlert} />
        ))}
      </div>
    </div>
  );
};


export default Alert;

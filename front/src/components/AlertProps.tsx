import React, { useState, useEffect } from 'react';

interface Alert {
  id: number;
  type: string;
  message: string;
}

interface AlertProps {
  alerts: Alert[];
  onAlertDismiss: (updatedAlerts: Alert[]) => void;
}

const AlertComponent: React.FC<AlertProps> = ({ alerts, onAlertDismiss }) => {
  const [alertList, setAlertList] = useState<Alert[]>(alerts);

  useEffect(() => {
    setAlertList(alerts);
  }, [alerts]);

  useEffect(() => {
    const timeoutIds: NodeJS.Timeout[] = [];

    alerts.forEach((alert) => {
      const timeoutId = setTimeout(() => {
        handleDismiss(alert.id);
      }, 5000);

      timeoutIds.push(timeoutId);
    });

    return () => {
      timeoutIds.forEach((timeoutId) => clearTimeout(timeoutId));
    };
  }, [alerts]);

  const handleDismiss = (id: number) => {
    const updatedAlerts = alertList.filter((alert) => alert.id !== id);
    setAlertList(updatedAlerts);
    onAlertDismiss(updatedAlerts); // Передаем обновленный массив алертов обратно в родительский компонент
  };

  const handleDismissOldest = () => {
    const updatedAlerts = alertList.slice(1);
    setAlertList(updatedAlerts);
    onAlertDismiss(updatedAlerts); // Передаем обновленный массив алертов обратно в родительский компонент
  };

  if (alertList.length === 0) {
    return null;
  }

  return (
    <div className="alerts">
      {alertList.map((alert) => (
        <div key={alert.id} className={`alert ${alert.type}`}>
          <button className="close" onClick={() => handleDismiss(alert.id)}>
            <svg width={25} height={25} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M10.0303 8.96965C9.73741 8.67676 9.26253 8.67676 8.96964 8.96965C8.67675 9.26255 8.67675 9.73742 8.96964 10.0303L10.9393 12L8.96966 13.9697C8.67677 14.2625 8.67677 14.7374 8.96966 15.0303C9.26255 15.3232 9.73743 15.3232 10.0303 15.0303L12 13.0607L13.9696 15.0303C14.2625 15.3232 14.7374 15.3232 15.0303 15.0303C15.3232 14.7374 15.3232 14.2625 15.0303 13.9696L13.0606 12L15.0303 10.0303C15.3232 9.73744 15.3232 9.26257 15.0303 8.96968C14.7374 8.67678 14.2625 8.67678 13.9696 8.96968L12 10.9393L10.0303 8.96965Z" fill="#fff"></path> <path fill-rule="evenodd" clip-rule="evenodd" d="M12 1.25C6.06294 1.25 1.25 6.06294 1.25 12C1.25 17.9371 6.06294 22.75 12 22.75C17.9371 22.75 22.75 17.9371 22.75 12C22.75 6.06294 17.9371 1.25 12 1.25ZM2.75 12C2.75 6.89137 6.89137 2.75 12 2.75C17.1086 2.75 21.25 6.89137 21.25 12C21.25 17.1086 17.1086 21.25 12 21.25C6.89137 21.25 2.75 17.1086 2.75 12Z" fill="#fff"></path> </g></svg>
          </button>
          <strong>{alert.message}</strong>
        </div>
      ))}
    </div>
  );
};

export default AlertComponent;

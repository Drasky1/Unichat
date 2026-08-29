import React, { createContext, useContext, useEffect, useState } from 'react';
import { CURRENT_USER } from '../data/mockData';

const AppContext = createContext(null);

function getInitialTheme() {
  const savedTheme = localStorage.getItem('campus-theme');
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;

  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(CURRENT_USER);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [theme, setTheme] = useState(getInitialTheme);
  const [moderationReports, setModerationReports] = useState([]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem('campus-theme', theme);
  }, [theme]);

  const login = (userData) => {
    setUser(userData);
    setIsLoggedIn(true);
  };

  const recordActivity = () => {
    const today = new Date().toISOString().slice(0, 10);
    setUser(previousUser => {
      if (previousUser.lastActiveDate === today) return previousUser;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = yesterday.toISOString().slice(0, 10);
      const nextStreak = previousUser.lastActiveDate === yesterdayKey ? previousUser.streak + 1 : 1;

      return { ...previousUser, streak: nextStreak, lastActiveDate: today };
    });
  };

  const restoreStreak = () => {
    const month = new Date().toISOString().slice(0, 7);
    let restored = false;
    setUser(previousUser => {
      if (previousUser.streak < 1 || previousUser.restoreMonth === month && previousUser.restoresUsed >= 5) return previousUser;
      restored = true;
      return {
        ...previousUser,
        restoresUsed: previousUser.restoreMonth === month ? previousUser.restoresUsed + 1 : 1,
        restoreMonth: month,
        lastActiveDate: new Date().toISOString().slice(0, 10),
      };
    });
    return restored;
  };

  const addModerationReport = (report) => {
    setModerationReports(previousReports => [
      { ...report, id: `report-${Date.now()}`, status: 'open', createdAt: new Date().toISOString() },
      ...previousReports,
    ]);
  };

  const resolveModerationReport = (reportId, resolution) => {
    setModerationReports(previousReports => previousReports.map(report => (
      report.id === reportId ? { ...report, status: 'resolved', resolution } : report
    )));
  };

  const logout = () => setIsLoggedIn(false);

  return (
    <AppContext.Provider value={{ user, setUser, isLoggedIn, login, logout, recordActivity, restoreStreak, moderationReports, addModerationReport, resolveModerationReport, theme, setTheme }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}

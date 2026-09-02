import React, { createContext, useContext, useEffect, useState } from 'react';
import { CURRENT_USER } from '../data/mockData';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const AppContext = createContext(null);
const MEANINGFUL_ACTIONS = new Set([
  'community_post',
  'project_update',
  'friend_connect',
  'grade_check',
  'moderation_review',
]);

function normalizeProfile(profile = {}) {
  return {
    id: profile.id ?? 'guest-user',
    role: profile.role ?? 'student',
    name: profile.name ?? 'New Student',
    username: profile.username ?? 'newstudent',
    email: profile.email ?? '',
    avatar: profile.avatar ?? {
      initials: 'NS',
      gradient: 'from-sky-500 to-indigo-500',
    },
    major: profile.major ?? '',
    faculty: profile.faculty ?? '',
    university: profile.university ?? 'Rangsit University (RSU)',
    year: profile.year ?? '1st Year',
    gpa: profile.gpa ?? 0,
    studentId: profile.studentId ?? profile.student_id ?? '',
    bio: profile.bio ?? '',
    skills: profile.skills ?? [],
    interests: profile.interests ?? [],
    streak: profile.streak ?? 0,
    streakGoal: profile.streakGoal ?? profile.streak_goal ?? 30,
    restoresUsed: profile.restoresUsed ?? profile.restores_used ?? 0,
    restoreMonth: profile.restoreMonth ?? profile.restore_month ?? null,
    verified: Boolean(profile.verified),
    followers: profile.followers ?? 0,
    following: profile.following ?? 0,
    enrolledCourses: profile.enrolledCourses ?? profile.enrolled_courses ?? [],
    ...profile,
  };
}

function normalizeReport(row) {
  return {
    id: row.id,
    reason: row.reason,
    communityName: row.community_name,
    messageAuthor: row.message_author,
    messageText: row.message_text,
    severity: row.severity,
    source: row.source,
    status: row.status,
    resolution: row.resolution,
    createdAt: row.created_at,
  };
}

function getInitialTheme() {
  const savedTheme = localStorage.getItem('campus-theme');
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;

  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => normalizeProfile(CURRENT_USER));
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [theme, setTheme] = useState(getInitialTheme);
  const [moderationReports, setModerationReports] = useState([]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem('campus-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthLoading(false);
      return;
    }

    let cancelled = false;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        if (!cancelled) setAuthLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (cancelled) return;
      if (profile) {
        setUser(normalizeProfile(profile));
        setIsLoggedIn(true);
      }
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setIsLoggedIn(false);
      }
    });

    return () => {
      cancelled = true;
      listener?.subscription.unsubscribe();
    };
  }, []);

  const login = (userData) => {
    setUser(normalizeProfile(userData));
    setIsLoggedIn(true);
  };

  const recordActivity = (action = 'campus_engagement') => {
    if (!MEANINGFUL_ACTIONS.has(action)) return;

    const today = new Date().toISOString().slice(0, 10);
    setUser(previousUser => {
      if (!previousUser || previousUser.lastActiveDate === today) return previousUser;

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

  useEffect(() => {
    if (!isSupabaseConfigured || !isLoggedIn || user.role !== 'moderator') return;

    let cancelled = false;

    supabase
      .from('moderation_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!cancelled && data) setModerationReports(data.map(normalizeReport));
      });

    const channel = supabase
      .channel('moderation_reports_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'moderation_reports' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setModerationReports(previous => [normalizeReport(payload.new), ...previous]);
        } else if (payload.eventType === 'UPDATE') {
          setModerationReports(previous => previous.map(r => (r.id === payload.new.id ? normalizeReport(payload.new) : r)));
        }
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [isLoggedIn, user.role]);

  const addModerationReport = async (report) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('moderation_reports')
        .insert({
          message_id: report.messageId,
          community_id: report.communityId,
          community_name: report.communityName,
          message_author: report.messageAuthor,
          message_text: report.messageText,
          severity: report.severity,
          reason: report.reason,
          source: report.source,
          reported_by: user.id,
          university: user.university,
        })
        .select()
        .single();

      if (!error && data) {
        setModerationReports(previousReports => [normalizeReport(data), ...previousReports]);
      }
      return;
    }

    setModerationReports(previousReports => [
      { ...report, id: `report-${Date.now()}`, status: 'open', createdAt: new Date().toISOString() },
      ...previousReports,
    ]);
  };

  const resolveModerationReport = async (reportId, resolution) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('moderation_reports')
        .update({ status: 'resolved', resolution })
        .eq('id', reportId);

      if (!error) {
        setModerationReports(previousReports => previousReports.map(report => (
          report.id === reportId ? { ...report, status: 'resolved', resolution } : report
        )));
      }
      return;
    }

    setModerationReports(previousReports => previousReports.map(report => (
      report.id === reportId ? { ...report, status: 'resolved', resolution } : report
    )));
  };

  const logout = () => {
    if (isSupabaseConfigured) supabase.auth.signOut();
    setIsLoggedIn(false);
  };

  return (
    <AppContext.Provider value={{ user, setUser, isLoggedIn, authLoading, login, logout, recordActivity, restoreStreak, moderationReports, addModerationReport, resolveModerationReport, theme, setTheme }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}

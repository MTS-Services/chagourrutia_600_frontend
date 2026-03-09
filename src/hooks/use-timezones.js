import { useState, useEffect } from "react";
import { timezoneService } from "@/lib/timezone-service";
import {
  transformBackendTimezones,
  handleAuthError,
} from "@/utils/timezone-utils";

const TIMEZONES_KEY = "timezones_v1";

/**
 * Custom hook for managing timezones with CRUD operations
 * Handles loading, adding, editing, deleting timezones with optimistic updates
 */
export function useTimezones(signOut) {
  const [timezones, setTimezones] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load timezones from backend on mount
  useEffect(() => {
    const loadTimezones = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          // Try localStorage fallback if no token
          const saved = localStorage.getItem(TIMEZONES_KEY);
          if (saved) {
            setTimezones(JSON.parse(saved));
          }
          setIsLoading(false);
          return;
        }

        const response = await timezoneService.getAll(token);

        if (response.success && response.data) {
          const flatTimezones = transformBackendTimezones(response.data);
          setTimezones(flatTimezones);
          localStorage.setItem(TIMEZONES_KEY, JSON.stringify(flatTimezones));
        }
      } catch (e) {
        console.error("Failed to load timezones from backend", e);

        // Check if it's an auth error and handle auto-logout
        if (handleAuthError(e, signOut)) {
          setIsLoading(false);
          return;
        }

        // Fallback to localStorage
        try {
          const saved = localStorage.getItem(TIMEZONES_KEY);
          if (saved) {
            setTimezones(JSON.parse(saved));
          }
        } catch (err) {
          console.error("Failed to load from localStorage", err);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadTimezones();
  }, [signOut]);

  // Save timezones to localStorage and dispatch update event
  const saveTimezones = (newTimezones) => {
    try {
      localStorage.setItem(TIMEZONES_KEY, JSON.stringify(newTimezones));
      setTimezones(newTimezones);
      window.dispatchEvent(new Event("timezonesUpdated"));
    } catch (e) {
      console.error("Failed to save timezones to localStorage", e);
      throw new Error("Could not save timezones to localStorage.");
    }
  };

  // Add timezone with optimistic update
  const addTimezone = async (timezone) => {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      // Fallback to local-only mode
      const newTimezone = {
        id: `tz-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...timezone,
        createdAt: new Date().toISOString(),
      };
      saveTimezones([...timezones, newTimezone]);
      return { success: true };
    }

    // Optimistic update - add to UI immediately
    const tempId = `temp-${Date.now()}`;
    const optimisticTimezone = {
      id: tempId,
      ...timezone,
      groupName: timezone.groupName || "General",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const optimisticTimezones = [...timezones, optimisticTimezone];
    setTimezones(optimisticTimezones);
    localStorage.setItem(TIMEZONES_KEY, JSON.stringify(optimisticTimezones));

    try {
      // Strip the 'timezone' field before sending to API
      const { timezone: tzString, ...apiTimezoneData } = timezone;
      const response = await timezoneService.create(apiTimezoneData, token);

      if (response.success && response.data) {
        // Replace temp with real data from server
        const serverTimezone = {
          id: response.data.id,
          name: response.data.name,
          city: response.data.city,
          region: response.data.region,
          abbreviation: response.data.abbreviation,
          offset: response.data.offset,
          timezone: timezone.timezone,
          workingHoursStart: response.data.workingHoursStart ?? 9,
          workingHoursEnd: response.data.workingHoursEnd ?? 17,
          label: response.data.label,
          groupId: response.data.groupId,
          groupName: response.data.groupName || timezone.groupName || "General",
          createdAt: response.data.createdAt,
          updatedAt: response.data.updatedAt,
        };

        const finalTimezones = optimisticTimezones.map((tz) =>
          tz.id === tempId ? serverTimezone : tz,
        );
        setTimezones(finalTimezones);
        localStorage.setItem(TIMEZONES_KEY, JSON.stringify(finalTimezones));
      }

      return { success: true };
    } catch (error) {
      console.error("Failed to add timezone", error);

      // Check if it's an auth error and handle auto-logout
      if (handleAuthError(error, signOut)) {
        return { success: false, error };
      }

      // Rollback optimistic update on error
      const rollbackTimezones = timezones.filter(
        (tz) => !tz.id.startsWith("temp-"),
      );
      setTimezones(rollbackTimezones);
      localStorage.setItem(TIMEZONES_KEY, JSON.stringify(rollbackTimezones));

      return { success: false, error };
    }
  };

  // Edit timezone with optimistic update
  const editTimezone = async (id, timezone) => {
    const previousTimezones = [...timezones];
    const token = localStorage.getItem("accessToken");

    if (!token) {
      // Fallback to local-only mode
      const updated = timezones.map((tz) =>
        tz.id === id ? { ...tz, ...timezone } : tz,
      );
      saveTimezones(updated);
      return { success: true };
    }

    // Optimistic update - update UI immediately
    const optimisticTimezones = timezones.map((tz) =>
      tz.id === id
        ? { ...tz, ...timezone, updatedAt: new Date().toISOString() }
        : tz,
    );
    setTimezones(optimisticTimezones);
    localStorage.setItem(TIMEZONES_KEY, JSON.stringify(optimisticTimezones));

    try {
      // Strip the 'timezone' field before sending to API
      const { timezone: tzString, ...apiTimezoneData } = timezone;
      const response = await timezoneService.update(id, apiTimezoneData, token);

      if (response.success && response.data?.updatedAt) {
        // Update timestamp from server
        const finalTimezones = optimisticTimezones.map((tz) =>
          tz.id === id ? { ...tz, updatedAt: response.data.updatedAt } : tz,
        );
        setTimezones(finalTimezones);
        localStorage.setItem(TIMEZONES_KEY, JSON.stringify(finalTimezones));
      }

      return { success: true };
    } catch (error) {
      console.error("Failed to update timezone", error);

      // Check if it's an auth error and handle auto-logout
      if (handleAuthError(error, signOut)) {
        return { success: false, error };
      }

      // Rollback to previous state
      setTimezones(previousTimezones);
      localStorage.setItem(TIMEZONES_KEY, JSON.stringify(previousTimezones));

      return { success: false, error };
    }
  };

  // Delete timezone with optimistic update
  const deleteTimezone = async (timezoneToDelete) => {
    const previousTimezones = [...timezones];
    const token = localStorage.getItem("accessToken");

    if (!token) {
      // Fallback to local-only mode
      const updated = timezones.filter((tz) => tz.id !== timezoneToDelete.id);
      saveTimezones(updated);
      return { success: true };
    }

    // Optimistic update - remove from UI immediately
    const optimisticTimezones = timezones.filter(
      (tz) => tz.id !== timezoneToDelete.id,
    );
    setTimezones(optimisticTimezones);
    localStorage.setItem(TIMEZONES_KEY, JSON.stringify(optimisticTimezones));

    try {
      await timezoneService.delete(timezoneToDelete.id, token);
      return { success: true };
    } catch (error) {
      console.error("Failed to delete timezone", error);

      // Check if it's an auth error and handle auto-logout
      if (handleAuthError(error, signOut)) {
        return { success: false, error };
      }

      // Rollback to previous state
      setTimezones(previousTimezones);
      localStorage.setItem(TIMEZONES_KEY, JSON.stringify(previousTimezones));

      return { success: false, error };
    }
  };

  return {
    timezones,
    isLoading,
    addTimezone,
    editTimezone,
    deleteTimezone,
  };
}

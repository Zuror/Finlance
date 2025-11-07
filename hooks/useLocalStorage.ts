import { useState, useEffect } from 'react';

export function useLocalStorage<T,>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        return JSON.parse(item);
      }
      // Fallback for migration from old single-file storage
      if (key === 'finances_app_data' && window.localStorage.getItem('accounts')) {
        return initialValue;
      }
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  // This useEffect handles saving to localStorage whenever the state changes.
  // This correctly handles batched updates and prevents race conditions.
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(error);
    }
  }, [key, storedValue]);

  // Listens for changes in other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
            setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
            console.error(error);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key]);
  
  // The setter function now only needs to update the React state.
  // The useEffect above will handle the persistence.
  return [storedValue, setStoredValue];
}
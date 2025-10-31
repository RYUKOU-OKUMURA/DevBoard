import { useCallback, useEffect, useState } from 'react';
import type { SetStateAction } from 'react';

type Deserialize<T> = (raw: string) => T;
type Serialize<T> = (value: T) => string;

interface UseLocalStorageStateOptions<T> {
  deserialize?: Deserialize<T>;
  serialize?: Serialize<T>;
  onError?: (error: unknown) => void;
}

const defaultSerialize: Serialize<unknown> = (value) => JSON.stringify(value);
const defaultDeserialize: Deserialize<unknown> = (raw) => JSON.parse(raw);

/**
 * Small helper hook to keep component state in sync with localStorage.
 * Accepts optional custom (de)serializers for advanced structures.
 */
export function useLocalStorageState<T>(
  key: string,
  initialValue: T,
  options: UseLocalStorageStateOptions<T> = {}
) {
  const { serialize = defaultSerialize as Serialize<T>, deserialize = defaultDeserialize as Deserialize<T>, onError } =
    options;

  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const storedValue = window.localStorage.getItem(key);
      if (storedValue === null) {
        return initialValue;
      }
      return deserialize(storedValue);
    } catch (error) {
      console.error(`Failed to read "${key}" from localStorage:`, error);
      if (onError) {
        onError(error);
      }
      return initialValue;
    }
  }, [key, initialValue, deserialize, onError]);

  const [state, setState] = useState<T>(readValue);

  useEffect(() => {
    setState(readValue());
  }, [key, readValue]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const value = serialize(state);
      window.localStorage.setItem(key, value);
    } catch (error) {
      console.error(`Failed to write "${key}" to localStorage:`, error);
      if (onError) {
        onError(error);
      }
    }
  }, [key, state, serialize, onError]);

  const setValue = useCallback(
    (value: SetStateAction<T>) => {
      setState((prev) => {
        const nextValue = typeof value === 'function' ? (value as (previous: T) => T)(prev) : value;
        return nextValue;
      });
    },
    [setState]
  );

  return [state, setValue] as const;
}

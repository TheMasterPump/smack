// ⚡ Hooks d'optimisation et performance
import { useMemo, useCallback, useRef, useEffect, useState } from 'react';

// 🚀 Hook pour memoization intelligente
export const useSmartMemo = (fn, deps, options = {}) => {
  const { compareFunction, timeout = 5000 } = options;
  const lastDeps = useRef();
  const lastResult = useRef();
  const timeoutRef = useRef();

  return useMemo(() => {
    const depsChanged = compareFunction 
      ? !compareFunction(deps, lastDeps.current)
      : JSON.stringify(deps) !== JSON.stringify(lastDeps.current);

    if (depsChanged || !lastResult.current) {
      lastResult.current = fn();
      lastDeps.current = deps;

      // Clear cache after timeout
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        lastResult.current = null;
      }, timeout);
    }

    return lastResult.current;
  }, deps);
};

// 🎯 Hook pour debouncing
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// 📊 Hook pour lazy loading avec intersection observer
export const useLazyLoad = (options = {}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const elementRef = useRef();

  const {
    threshold = 0.1,
    rootMargin = '50px',
    triggerOnce = true
  } = options;

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  useEffect(() => {
    if (isInView && !isLoaded) {
      setIsLoaded(true);
    }
  }, [isInView, isLoaded]);

  return { elementRef, isLoaded, isInView };
};

// 🔄 Hook pour batching des updates
export const useBatchedUpdates = (initialState = {}) => {
  const [state, setState] = useState(initialState);
  const batchRef = useRef({});
  const timeoutRef = useRef();

  const batchUpdate = useCallback((updates) => {
    Object.assign(batchRef.current, updates);
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(() => {
      setState(prev => ({ ...prev, ...batchRef.current }));
      batchRef.current = {};
    }, 16); // ~60fps
  }, []);

  return [state, batchUpdate];
};

// 💾 Hook pour cache intelligent
export const useCache = (key, fetcher, options = {}) => {
  const { 
    ttl = 5 * 60 * 1000, // 5 minutes
    staleWhileRevalidate = true 
  } = options;
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cacheRef = useRef(new Map());

  const getCachedData = useCallback((cacheKey) => {
    const cached = cacheRef.current.get(cacheKey);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > ttl;
    if (isExpired && !staleWhileRevalidate) {
      cacheRef.current.delete(cacheKey);
      return null;
    }

    return { data: cached.data, stale: isExpired };
  }, [ttl, staleWhileRevalidate]);

  const fetchData = useCallback(async (forceRefresh = false) => {
    const cacheKey = typeof key === 'function' ? key() : key;
    const cached = getCachedData(cacheKey);

    if (cached && !forceRefresh) {
      setData(cached.data);
      if (!cached.stale) return cached.data;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      cacheRef.current.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
      setData(result);
      return result;
    } catch (err) {
      setError(err);
      // Return stale data if available
      if (cached) return cached.data;
      throw err;
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, getCachedData]);

  const invalidateCache = useCallback((cacheKey = null) => {
    if (cacheKey) {
      cacheRef.current.delete(cacheKey);
    } else {
      cacheRef.current.clear();
    }
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    invalidate: invalidateCache
  };
};

// 🎨 Hook pour Virtual Scrolling (pour grandes listes)
export const useVirtualScroll = (items, itemHeight, containerHeight) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    );

    return {
      startIndex,
      endIndex,
      items: items.slice(startIndex, endIndex),
      offsetY: startIndex * itemHeight,
      totalHeight: items.length * itemHeight
    };
  }, [items, itemHeight, containerHeight, scrollTop]);

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  return { visibleItems, handleScroll };
};

// 📈 Hook pour optimisation des graphiques
export const useChartOptimization = (data, options = {}) => {
  const { 
    maxDataPoints = 100,
    samplingMethod = 'uniform' 
  } = options;

  const optimizedData = useMemo(() => {
    if (!data || data.length <= maxDataPoints) return data;

    switch (samplingMethod) {
      case 'uniform':
        const step = Math.floor(data.length / maxDataPoints);
        return data.filter((_, index) => index % step === 0);
      
      case 'peak':
        // Keep peaks and valleys
        return data.filter((point, index) => {
          if (index === 0 || index === data.length - 1) return true;
          
          const prev = data[index - 1];
          const next = data[index + 1];
          
          return (
            (point.value > prev.value && point.value > next.value) || // Peak
            (point.value < prev.value && point.value < next.value)    // Valley
          );
        }).slice(0, maxDataPoints);
      
      default:
        return data.slice(-maxDataPoints);
    }
  }, [data, maxDataPoints, samplingMethod]);

  return optimizedData;
};

// 🔧 Utilitaires performance
export const performanceUtils = {
  // Mesurer le temps d'exécution
  measure: (name, fn) => {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    console.log(`${name} took ${end - start} milliseconds`);
    return result;
  },

  // Throttle function
  throttle: (func, limit) => {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }
  },

  // Deep equal comparison optimisé
  deepEqual: (a, b) => {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;
    
    if (typeof a === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      
      if (keysA.length !== keysB.length) return false;
      
      for (const key of keysA) {
        if (!keysB.includes(key)) return false;
        if (!performanceUtils.deepEqual(a[key], b[key])) return false;
      }
      
      return true;
    }
    
    return false;
  }
};

export default {
  useSmartMemo,
  useDebounce,
  useLazyLoad,
  useBatchedUpdates,
  useCache,
  useVirtualScroll,
  useChartOptimization,
  performanceUtils
};
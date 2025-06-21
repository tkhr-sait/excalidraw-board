export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T & { cancel: () => void } {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastExecTime = 0;
  let lastArgs: Parameters<T> | null = null;

  const throttled = function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    
    const execute = () => {
      lastExecTime = now;
      func.apply(this, args);
      timeoutId = null;
    };

    if (now - lastExecTime >= delay) {
      execute();
    } else {
      lastArgs = args;
      if (!timeoutId) {
        const remainingTime = delay - (now - lastExecTime);
        timeoutId = setTimeout(() => {
          if (lastArgs) {
            func.apply(this, lastArgs);
            lastExecTime = Date.now();
            lastArgs = null;
          }
          timeoutId = null;
        }, remainingTime);
      }
    }
  };

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastArgs = null;
  };

  Object.assign(throttled, { cancel });

  return throttled as T & { cancel: () => void };
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T & { cancel: () => void } {
  let timeoutId: NodeJS.Timeout | null = null;

  const debounced = function (this: any, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func.apply(this, args);
      timeoutId = null;
    }, delay);
  };

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  Object.assign(debounced, { cancel });

  return debounced as T & { cancel: () => void };
}
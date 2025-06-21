export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private observers: PerformanceObserver[] = [];

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startMeasuring(name: string): void {
    performance.mark(`${name}-start`);
  }

  endMeasuring(name: string): number {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    const measure = performance.getEntriesByName(name, 'measure')[0];
    const duration = measure?.duration || 0;
    
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(duration);
    
    return duration;
  }

  getAverageTime(name: string): number {
    const times = this.metrics.get(name) || [];
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }

  getMetrics(): Record<string, { average: number; count: number; latest: number }> {
    const result: Record<string, { average: number; count: number; latest: number }> = {};
    
    this.metrics.forEach((times, name) => {
      result[name] = {
        average: this.getAverageTime(name),
        count: times.length,
        latest: times[times.length - 1] || 0,
      };
    });
    
    return result;
  }

  measureMemoryUsage(): {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };
    }
    return null;
  }

  startObservingLongTasks(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.duration > 50) {
            console.warn(`Long task detected: ${entry.duration}ms`);
          }
        });
      });
      
      try {
        observer.observe({ entryTypes: ['longtask'] });
        this.observers.push(observer);
      } catch (e) {
        console.warn('Long task observer not supported');
      }
    }
  }

  startObservingPageLoad(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            console.log('Page Load Metrics:', {
              loadComplete: navEntry.loadEventEnd - navEntry.navigationStart,
              domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.navigationStart,
              firstPaint: this.getFirstPaint(),
              firstContentfulPaint: this.getFirstContentfulPaint(),
            });
          }
        });
      });
      
      try {
        observer.observe({ entryTypes: ['navigation'] });
        this.observers.push(observer);
      } catch (e) {
        console.warn('Navigation observer not supported');
      }
    }
  }

  private getFirstPaint(): number {
    const entries = performance.getEntriesByType('paint');
    const fpEntry = entries.find(entry => entry.name === 'first-paint');
    return fpEntry ? fpEntry.startTime : 0;
  }

  private getFirstContentfulPaint(): number {
    const entries = performance.getEntriesByType('paint');
    const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
    return fcpEntry ? fcpEntry.startTime : 0;
  }

  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics.clear();
  }
}

export const perfMonitor = PerformanceMonitor.getInstance();
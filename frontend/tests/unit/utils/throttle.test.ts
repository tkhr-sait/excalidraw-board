import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { throttle } from '../../../src/utils/throttle';

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should call function immediately on first call', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    
    throttled('arg1', 'arg2');
    
    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should throttle subsequent calls', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    
    throttled('call1');
    throttled('call2');
    throttled('call3');
    
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('call1');
  });

  it('should call function with latest arguments after delay', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    
    throttled('call1');
    throttled('call2');
    throttled('call3');
    
    vi.advanceTimersByTime(100);
    
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(2, 'call3');
  });

  it('should allow function to be called again after delay', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    
    throttled('call1');
    vi.advanceTimersByTime(100);
    throttled('call2');
    
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(1, 'call1');
    expect(fn).toHaveBeenNthCalledWith(2, 'call2');
  });

  it('should cancel pending calls when cancel is called', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    
    throttled('call1');
    throttled('call2');
    throttled.cancel();
    
    vi.advanceTimersByTime(100);
    
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('call1');
  });
});
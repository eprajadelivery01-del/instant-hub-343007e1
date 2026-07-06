/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import App from '../App';

describe('Lovable Runtime Checker', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let assignSpy: ReturnType<typeof vi.fn>;
  let replaceSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Spy on console
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Spy on fetch
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async () => {
      return new Response(JSON.stringify({}), { status: 200 });
    });

    // Mock window.location
    assignSpy = vi.fn();
    replaceSpy = vi.fn();
    
    // @ts-ignãore
    delete window.location;
    window.location = {
      ...window.location,
      assign: assignSpy,
      replace: replaceSpy,
      href: 'http://localhost/',
      origin: 'http://localhost'
    } as any;

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should nãot contain lovableproject.com in runtime requests, logs, or routing', () => {
    render(<App />);

    const checkLovable = (args: any[]) => {
      const stringified = JSON.stringify(args).toLowerCase();
      expect(stringified).nãot.toContain('lovableproject.com');
    };

    // Check logs
    consoleLogSpy.mock.calls.forEach(checkLovable);
    consoleErrorSpy.mock.calls.forEach(checkLovable);

    // Check fetch requests (URLs and headers)
    fetchSpy.mock.calls.forEach(checkLovable);

    // Check routing / window.location changes
    assignSpy.mock.calls.forEach(checkLovable);
    replaceSpy.mock.calls.forEach(checkLovable);
  });
});

import { renderHook, act } from "@testing-library/react";
import {
  useScreenBreakpoint,
  _resetRegistry,
} from "../useScreenBreakpoint";

// --- matchMedia mock infrastructure ---

type ChangeHandler = (e: MediaQueryListEvent) => void;

function createMockMQL(matches: boolean) {
  const listeners: ChangeHandler[] = [];

  const mql = {
    matches,
    media: "(min-width: 1024px)",
    addEventListener: jest.fn((event: string, handler: ChangeHandler) => {
      if (event === "change") listeners.push(handler);
    }),
    removeEventListener: jest.fn((event: string, handler: ChangeHandler) => {
      if (event === "change") {
        const idx = listeners.indexOf(handler);
        if (idx !== -1) listeners.splice(idx, 1);
      }
    }),
    dispatchEvent: jest.fn(),
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
  } as unknown as MediaQueryList;

  const fireChange = (newMatches: boolean) => {
    (mql as { matches: boolean }).matches = newMatches;
    const event = { matches: newMatches } as MediaQueryListEvent;
    [...listeners].forEach((h) => h(event));
  };

  return { mql, fireChange, listeners };
}

let mockMQL: ReturnType<typeof createMockMQL>;

beforeEach(() => {
  mockMQL = createMockMQL(true);
  window.matchMedia = jest.fn().mockReturnValue(mockMQL.mql);
  _resetRegistry();
});

afterEach(() => {
  _resetRegistry();
});

describe("useScreenBreakpoint", () => {
  test('returns "screenLG" on mount when width >= 1024px', () => {
    mockMQL = createMockMQL(true);
    window.matchMedia = jest.fn().mockReturnValue(mockMQL.mql);

    const { result } = renderHook(() => useScreenBreakpoint());

    expect(result.current).toBe("screenLG");
  });

  test('returns "screenSM" on mount when width < 1024px', () => {
    mockMQL = createMockMQL(false);
    window.matchMedia = jest.fn().mockReturnValue(mockMQL.mql);

    const { result } = renderHook(() => useScreenBreakpoint());

    expect(result.current).toBe("screenSM");
  });

  test('returns "screenSM" when media query change event fires (matches=false)', () => {
    const { result } = renderHook(() => useScreenBreakpoint());

    act(() => {
      mockMQL.fireChange(false);
    });

    expect(result.current).toBe("screenSM");
  });

  test('returns "screenLG" when media query change event fires (matches=true)', () => {
    mockMQL = createMockMQL(false);
    window.matchMedia = jest.fn().mockReturnValue(mockMQL.mql);

    const { result } = renderHook(() => useScreenBreakpoint());

    act(() => {
      mockMQL.fireChange(true);
    });

    expect(result.current).toBe("screenLG");
  });

  test("removes event listener on unmount", () => {
    const { unmount } = renderHook(() => useScreenBreakpoint());

    unmount();

    expect(mockMQL.mql.removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
  });

  test("unregisters subscriber from registry on unmount — no listeners remain", () => {
    const { unmount } = renderHook(() => useScreenBreakpoint());

    unmount();

    expect(mockMQL.listeners).toHaveLength(0);
  });

  test("multiple hook instances each get their own listener", () => {
    const mql1 = createMockMQL(true);
    const mql2 = createMockMQL(true);
    let callCount = 0;
    (window.matchMedia as jest.Mock).mockImplementation(() => {
      callCount++;
      return callCount <= 1 ? mql1.mql : mql2.mql;
    });

    const { result: resultA } = renderHook(() => useScreenBreakpoint());
    const { result: resultB } = renderHook(() => useScreenBreakpoint());

    // Fire change only on mql1
    act(() => {
      mql1.fireChange(false);
    });

    expect(resultA.current).toBe("screenSM");
    expect(resultB.current).toBe("screenLG");

    // Fire change only on mql2
    act(() => {
      mql2.fireChange(false);
    });

    expect(resultA.current).toBe("screenSM");
    expect(resultB.current).toBe("screenSM");
  });

  test("subscribeId auto-increments and _resetRegistry resets it", () => {
    const { unmount: unmount1 } = renderHook(() => useScreenBreakpoint());
    const { unmount: unmount2 } = renderHook(() => useScreenBreakpoint());

    expect(window.matchMedia).toHaveBeenCalledTimes(2);

    unmount1();
    unmount2();

    _resetRegistry();
    const { result } = renderHook(() => useScreenBreakpoint());

    expect(result.current).toBe("screenLG");
  });
});

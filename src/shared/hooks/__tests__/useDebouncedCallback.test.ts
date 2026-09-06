import { act, renderHook } from "@testing-library/react";
import { useDebouncedCallback } from "../useDebouncedCallback";

describe("useDebouncedCallback", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("does not call the callback before the delay", () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 200));

    act(() => {
      result.current.run("first");
      jest.advanceTimersByTime(199);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it("calls once after the delay with the latest scheduled arguments", () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 200));

    act(() => {
      result.current.run("first", 1);
      result.current.run("second", 2);
      jest.advanceTimersByTime(200);
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith("second", 2);
  });

  it("collapses rapid repeated runs into one callback", () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 200));

    act(() => {
      result.current.run("first");
      jest.advanceTimersByTime(100);
      result.current.run("second");
      jest.advanceTimersByTime(100);
      result.current.run("third");
      jest.advanceTimersByTime(200);
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith("third");
  });

  it("cancels pending work", () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 200));

    act(() => {
      result.current.run("first");
      result.current.cancel();
      jest.advanceTimersByTime(200);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it("does not clear a browser timer when no work is pending", () => {
    const clearTimeout = jest.spyOn(window, "clearTimeout");
    const { result } = renderHook(() => useDebouncedCallback(jest.fn(), 200));

    act(() => {
      result.current.cancel();
    });

    expect(clearTimeout).not.toHaveBeenCalled();
    clearTimeout.mockRestore();
  });

  it("cancels pending work on unmount", () => {
    const callback = jest.fn();
    const { result, unmount } = renderHook(() => useDebouncedCallback(callback, 200));

    act(() => {
      result.current.run("first");
    });

    unmount();

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it("uses the latest callback implementation after rerender", () => {
    const firstCallback = jest.fn();
    const secondCallback = jest.fn();
    const { result, rerender } = renderHook(
      ({ callback }) => useDebouncedCallback(callback, 200),
      { initialProps: { callback: firstCallback } },
    );

    act(() => {
      result.current.run("first");
    });

    rerender({ callback: secondCallback });

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(firstCallback).not.toHaveBeenCalled();
    expect(secondCallback).toHaveBeenCalledWith("first");
  });

  it("uses a changed delay after rerendering and keeps controls stable otherwise", () => {
    const callback = jest.fn();
    const { result, rerender } = renderHook(
      ({ delay }) => useDebouncedCallback(callback, delay),
      { initialProps: { delay: 200 } },
    );
    const firstRun = result.current.run;
    const firstCancel = result.current.cancel;

    rerender({ delay: 50 });
    expect(result.current.run).not.toBe(firstRun);
    expect(result.current.cancel).toBe(firstCancel);

    act(() => {
      result.current.run("changed delay");
      jest.advanceTimersByTime(49);
    });
    expect(callback).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(callback).toHaveBeenCalledWith("changed delay");
  });
});

// lib/context/ScrollDirectionContext.tsx
import React, { createContext, useCallback, useContext, useRef } from "react";
import { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

type ScrollDirection = "up" | "down" | "idle";

interface ScrollDirectionContextValue {
  /** Current scroll direction — "up", "down", or "idle" */
  direction: React.MutableRefObject<ScrollDirection>;
  /** Call this from any screen to report scroll direction */
  reportDirection: (dir: ScrollDirection) => void;
  /** Subscribe to direction changes */
  subscribe: (cb: (dir: ScrollDirection) => void) => () => void;
  /**
   * Ready-made onScroll handler for ScrollView / FlatList.
   * Attach with `onScroll={scrollHandler}` and `scrollEventThrottle={16}`.
   */
  createScrollHandler: () => (
    e: NativeSyntheticEvent<NativeScrollEvent>,
  ) => void;
}

const ScrollDirectionContext = createContext<ScrollDirectionContextValue>(
  null as any,
);

const SCROLL_THRESHOLD = 8; // minimum delta to trigger direction change

export function ScrollDirectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const direction = useRef<ScrollDirection>("idle"); 
  const listenersRef = useRef<Set<(dir: ScrollDirection) => void>>(new Set());

  const reportDirection = useCallback((dir: ScrollDirection) => {
    if (direction.current !== dir) {
      direction.current = dir;
      listenersRef.current.forEach((cb) => cb(dir));
    }
  }, []);

  const subscribe = useCallback((cb: (dir: ScrollDirection) => void) => {
    listenersRef.current.add(cb);
    return () => {
      listenersRef.current.delete(cb);
    };
  }, []);

  const createScrollHandler = useCallback(() => {
    let lastOffsetY = 0;

    return (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentY = e.nativeEvent.contentOffset.y;
      const delta = currentY - lastOffsetY;

      // Only change direction if user scrolled beyond threshold
      if (delta > SCROLL_THRESHOLD && currentY > 0) {
        reportDirection("down");
      } else if (delta < -SCROLL_THRESHOLD) {
        reportDirection("up");
      }

      lastOffsetY = currentY;
    };
  }, [reportDirection]);

  return (
    <ScrollDirectionContext.Provider
      value={{ direction, reportDirection, subscribe, createScrollHandler }}
    >
      {children}
    </ScrollDirectionContext.Provider>
  );
}

/** Hook to access the scroll direction context */
export function useScrollDirection() {
  const ctx = useContext(ScrollDirectionContext);
  if (!ctx) {
    throw new Error(
      "useScrollDirection must be used within a ScrollDirectionProvider",
    );
  }
  return ctx;
}

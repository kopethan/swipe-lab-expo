import type { ComponentProps, ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { useTheme } from '../../../providers/ThemeProvider';
import { DEFAULT_BORDER_WIDTH, DEFAULT_RADIUS } from '../deck.constants';
import { rgbaBorder } from '../deck.utils';

type DeckCardShellProps = {
  cardSize: number;
  borderAlpha: number;

  /**
   * Depth-based surface ramp for stacked deck layers.
   * - 0 = pure surface (front card)
   * - 1..3 = progressively distinct surface for back layers
   */
  surfaceDepth?: number;

  /**
   * Explicit surface color override (opaque, monochrome).
   * If provided, takes precedence over surfaceDepth.
   */
  surfaceColor?: string;

  /**
   * Optional overlay rendered between surface and content.
   * Use for promotion wipes (opaque only).
   */
  overlay?: ReactNode;

  borderWidth?: number;
  radius?: number;
  style?: ComponentProps<typeof Animated.View>['style'];
  pointerEvents?: ComponentProps<typeof Animated.View>['pointerEvents'];
  gesture?: ComponentProps<typeof GestureDetector>['gesture'];
  children?: ReactNode;
};

function resolveDepthSurface(palette: { surface: string; deckSurface1?: string; deckSurface2?: string; deckSurface3?: string }, depth: number) {
  if (depth <= 0) return palette.surface;
  if (depth === 1) return palette.deckSurface1 ?? palette.surface;
  if (depth === 2) return palette.deckSurface2 ?? palette.deckSurface1 ?? palette.surface;
  return palette.deckSurface3 ?? palette.deckSurface2 ?? palette.deckSurface1 ?? palette.surface;
}

export function DeckCardShell({
  cardSize,
  borderAlpha,
  surfaceDepth,
  surfaceColor,
  overlay,
  borderWidth = DEFAULT_BORDER_WIDTH,
  radius = DEFAULT_RADIUS,
  style,
  pointerEvents,
  gesture,
  children,
}: DeckCardShellProps) {
  const { palette } = useTheme();
  const mode = palette.mode === 'light' ? 'light' : 'dark';

  const backgroundColor =
    surfaceColor ?? (surfaceDepth != null ? resolveDepthSurface(palette, surfaceDepth) : palette.surface);

  // iOS-safe depth: shadow must live on a wrapper that does NOT clip.
  // Android note: elevation shadow can "black-crush" the peek of the next card in dark mode.
  // Make elevation depth-aware on Android dark to preserve visible stack separation.
  const isAndroidDark = Platform.OS === 'android' && palette.mode === 'dark';
  const depth = surfaceDepth ?? 0;

  const shadowBase = palette.mode === 'light' ? styles.shadowLight : styles.shadowDark;
  const androidElevation = isAndroidDark ? (depth <= 0 ? 10 : depth === 1 ? 2 : 1) : undefined;
  const shadowStyle =
    isAndroidDark && androidElevation != null ? [shadowBase, { elevation: androidElevation }] : shadowBase;

  const node = (
    <Animated.View
      pointerEvents={pointerEvents}
      style={[
        styles.outer,
        shadowStyle,
        {
          width: cardSize,
          height: cardSize,
          borderRadius: radius,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.inner,
          {
            borderRadius: radius,
            borderWidth,
            borderColor: rgbaBorder(borderAlpha, mode),
            backgroundColor,
          },
        ]}
      >
        {overlay}
        {children}
      </View>
    </Animated.View>
  );

  return gesture ? <GestureDetector gesture={gesture}>{node}</GestureDetector> : node;
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  inner: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },

  shadowLight: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  shadowDark: {
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
});

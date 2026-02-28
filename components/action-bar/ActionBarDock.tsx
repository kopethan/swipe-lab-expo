import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { AiPanel } from './panels/AiPanel';
import {
  FilterPanel,
  type ParticipationFilter,
  type SortMode,
  type StatusFilter,
} from './panels/FilterPanel';
import { SearchPanel, type SearchOp } from './panels/SearchPanel';
import { ThemePanel, type ThemeAccent, type ThemeMode } from './panels/ThemePanel';

type ToolId = 'search' | 'filter' | 'add' | 'ai' | 'theme';

type ToolKind = 'panel' | 'navigate';

type ToolDef = {
  id: ToolId;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  kind: ToolKind;
  /** Icon-only UI. Keep a11y labels but don't render text in the bar surface. */
  a11yLabel: string;
  // Slice C: geometry + layout profiles
  panelProfile?: 'DEFAULT' | 'WIDE_RECT' | 'AUTO' | 'WIDE_AUTO';
};

const TOOLS: ToolDef[] = [
  { id: 'search', icon: 'search', kind: 'panel', a11yLabel: 'Search', panelProfile: 'WIDE_RECT' },
  { id: 'filter', icon: 'tune', kind: 'panel', a11yLabel: 'Filter', panelProfile: 'AUTO' },
  { id: 'add', icon: 'add-circle-outline', kind: 'navigate', a11yLabel: 'Add' },
  { id: 'ai', icon: 'auto-awesome', kind: 'panel', a11yLabel: 'AI', panelProfile: 'WIDE_RECT' },
  { id: 'theme', icon: 'palette', kind: 'panel', a11yLabel: 'Theme', panelProfile: 'WIDE_AUTO' },
];

type Phase = 'idle' | 'opening' | 'open' | 'closing';

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Slice A (foundation):
 * - Tool registry (TOOLS)
 * - Single surface dock (no dragging)
 * - Simple state machine (idle/opening/open/closing)
 * - Content swap pipeline (fade out -> switch tool -> fade in)
 *
 * NOTE: Visual rules (icons-only, geometry variations, no empty space) come in later slices.
 */
export function ActionBarDock() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { width: W, height: H } = useWindowDimensions();

  const surface = isDark ? '#000' : '#fff';
  const surfaceAlt = isDark ? '#1a1a1a' : '#f2f2f2';
  const text = isDark ? '#fff' : '#111';
  const muted = isDark ? 'rgba(255,255,255,0.70)' : 'rgba(0,0,0,0.65)';
  const border = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.10)';
  const overlay = isDark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.25)';

  const panelPalette = useMemo(
    () => ({ surface, surfaceAlt, text, muted, border }),
    [border, muted, surface, surfaceAlt, text]
  );

  // Slice C: per-tool geometry (width + height + radius).
  // NOTE: Slice D will harden responsive + safe-area behavior. Here we add basic clamping.
  const closedH = 64;
  const closedR = 20;
  const closedW = useMemo(() => {
    // Enough room for 5 icons + gaps; clamp to viewport.
    const min = 292;
    const preferred = 340;
    const max = Math.max(min, W - 24);
    return clamp(preferred, min, max);
  }, [W]);

  const maxPanelHeight = Math.min(520, Math.max(260, Math.floor(H * 0.72)));

  // Chrome sizes (used to compute auto-height panels)
  const ICON_SLOT_H = 64; // reserved space for the icon rail
  const PANEL_PAD_TOP = 14;
  const PANEL_PAD_BOTTOM = 12;
  const HEADER_H = 34;
  const HEADER_GAP = 10;
  const chromeH = ICON_SLOT_H + PANEL_PAD_TOP + PANEL_PAD_BOTTOM + HEADER_H + HEADER_GAP;

  const [phase, setPhase] = useState<Phase>('idle');
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const isOpen = phase !== 'idle';

  // Slice E: real panel state (lab-only)
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTerm2, setSearchTerm2] = useState('');
  const [searchOp, setSearchOp] = useState<SearchOp>('AND');

  const [participation, setParticipation] = useState<ParticipationFilter>('ALL');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [nearMe, setNearMe] = useState(false);

  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [themeAccent, setThemeAccent] = useState<ThemeAccent>('teal');

  const [aiPrompt, setAiPrompt] = useState('');

  const [measuredContentH, setMeasuredContentH] = useState<Partial<Record<ToolId, number>>>({});
  const lastMeasuredH = useRef<Partial<Record<ToolId, number>>>({});

  // Reanimated progress values
  const openP = useSharedValue(0); // 0 = closed, 1 = open
  const contentP = useSharedValue(1); // 0 = hidden, 1 = visible

  // Target geometry for the OPEN state (closed state is derived from closedW/closedH/closedR)
  const openW = useSharedValue(closedW);
  const openH = useSharedValue(closedH);
  const openR = useSharedValue(closedR);

  const pendingSwapTo = useRef<ToolId | null>(null);

  const activeDef = useMemo(() => {
    if (!activeTool) return null;
    return TOOLS.find((t) => t.id === activeTool) ?? null;
  }, [activeTool]);

  const setPhaseSafe = useCallback((p: Phase) => setPhase(p), []);
  const computeTargetGeometry = useCallback(
    (id: ToolId) => {
      const def = TOOLS.find((t) => t.id === id);
      const profile = def?.panelProfile ?? 'DEFAULT';

      const availableW = Math.max(292, W - 24);

      // Width
      const wide = profile === 'WIDE_RECT' || profile === 'WIDE_AUTO';
      const preferredW = wide ? 720 : 560;
      const minW = wide ? 360 : 320;
      const targetW = Math.max(closedW, clamp(preferredW, minW, availableW));

      // Height (auto-fit uses measured content)
      const measured = measuredContentH[id];
      const fallbackContent = profile === 'WIDE_RECT' ? 240 : 180;
      const contentH = measured ?? fallbackContent;

      let targetH = chromeH + contentH;
      if (profile === 'WIDE_RECT') {
        // Rect feel: don't go too short.
        targetH = Math.max(targetH, 320);
      } else {
        // Auto panels: keep compact.
        targetH = Math.max(targetH, 220);
      }
      targetH = clamp(targetH, closedH, maxPanelHeight);

      // Radius
      const targetR = wide ? 28 : 26;

      return { targetW, targetH, targetR };
    },
    [W, chromeH, closedH, closedW, maxPanelHeight, measuredContentH]
  );

  const applyGeometry = useCallback(
    (id: ToolId, opts?: { animate?: boolean }) => {
      const { targetW, targetH, targetR } = computeTargetGeometry(id);
      const animate = opts?.animate ?? true;

      if (!animate) {
        openW.value = targetW;
        openH.value = targetH;
        openR.value = targetR;
        return;
      }

      openW.value = withTiming(targetW, { duration: 240, easing: Easing.out(Easing.cubic) });
      openH.value = withTiming(targetH, { duration: 240, easing: Easing.out(Easing.cubic) });
      openR.value = withTiming(targetR, { duration: 220, easing: Easing.out(Easing.cubic) });
    },
    [computeTargetGeometry, openH, openR, openW]
  );
  const clearAfterClose = useCallback(() => {
    setActiveTool(null);
    setPhase('idle');
  }, []);

  const animateOpen = useCallback(() => {
    openP.value = withTiming(
      1,
      { duration: 260, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (!finished) return;
        runOnJS(setPhaseSafe)('open');
      }
    );
  }, [openP, setPhaseSafe]);

  const animateClose = useCallback(() => {
    // Hide content first for a cleaner exit
    contentP.value = withTiming(0, { duration: 120, easing: Easing.out(Easing.quad) });
    openP.value = withTiming(
      0,
      { duration: 220, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (!finished) return;
        runOnJS(clearAfterClose)();
      }
    );
  }, [clearAfterClose, contentP, openP]);

  const openPanel = useCallback(
    (id: ToolId) => {
      const def = TOOLS.find((t) => t.id === id);
      if (!def) return;

      if (def.kind === 'navigate') {
        // Lab default: go to an existing placeholder screen.
        // Later: route to a dedicated “Add” page.
        router.push('/modal');
        return;
      }

      // Toggle close if same tool
      if (isOpen && activeTool === id) {
        setPhase('closing');
        animateClose();
        return;
      }

      // Switch tool while open: fade content out -> swap -> fade in
      if (isOpen && activeTool && activeTool !== id) {
        // Start morph immediately (surface changes even while content fades out)
        applyGeometry(id, { animate: true });
        pendingSwapTo.current = id;
        contentP.value = withTiming(
          0,
          { duration: 120, easing: Easing.out(Easing.quad) },
          (finished) => {
            if (!finished) return;
            const next = pendingSwapTo.current;
            pendingSwapTo.current = null;
            if (!next) return;
            runOnJS(setActiveTool)(next);
            contentP.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) });
          }
        );
        return;
      }

      // Open from idle
      setActiveTool(id);
      setPhase('opening');
      contentP.value = 0;

      // Set target geometry before opening animation.
      applyGeometry(id, { animate: false });
      animateOpen();
      contentP.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    },
    [activeTool, animateClose, animateOpen, applyGeometry, contentP, isOpen]
  );

  const closePanel = useCallback(() => {
    if (!isOpen) return;
    setPhase('closing');
    animateClose();
  }, [animateClose, isOpen]);

  const resetFilters = useCallback(() => {
    setParticipation('ALL');
    setStatus('ALL');
    setSortMode('default');
    setNearMe(false);
  }, []);

  const submitAi = useCallback(() => {
    // Lab-only placeholder
    // eslint-disable-next-line no-console
    console.log('[AI lab] prompt:', aiPrompt);
  }, [aiPrompt]);

  // Ensure reanimated state stays consistent when React state changes abruptly.
  useEffect(() => {
    if (!isOpen) {
      openP.value = 0;
      contentP.value = 1;
      openW.value = closedW;
      openH.value = closedH;
      openR.value = closedR;
    }
  }, [closedH, closedR, closedW, contentP, isOpen, openH, openP, openR, openW]);

  // When tool or viewport changes, recompute geometry.
  useEffect(() => {
    if (!isOpen || !activeTool) return;
    applyGeometry(activeTool, { animate: true });
  }, [W, H, activeTool, applyGeometry, isOpen]);

  // When measured content changes for the active tool, recompute geometry (auto-fit).
  useEffect(() => {
    if (!isOpen || !activeTool) return;
    if (measuredContentH[activeTool] == null) return;
    applyGeometry(activeTool, { animate: true });
  }, [activeTool, applyGeometry, isOpen, measuredContentH]);

  const dockStyle = useAnimatedStyle(() => {
    const w = closedW + (openW.value - closedW) * openP.value;
    const h = closedH + (openH.value - closedH) * openP.value;
    const r = closedR + (openR.value - closedR) * openP.value;
    return {
      width: w,
      height: h,
      borderRadius: r,
      transform: [{ translateY: interpolate(openP.value, [0, 1], [0, -6]) }],
    };
  }, [closedH, closedR, closedW, openH, openR, openW]);

  const iconsRowStyle = useAnimatedStyle(() => {
    // Slice A: mild collapse when open (later: full morph behavior)
    const scale = interpolate(openP.value, [0, 1], [1, 0.94]);
    const opacity = interpolate(openP.value, [0, 1], [1, 0.86]);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const panelShellStyle = useAnimatedStyle(() => {
    const opacity = interpolate(openP.value, [0, 0.35, 1], [0, 0, 1]);
    const translateY = interpolate(openP.value, [0, 1], [10, 0]);
    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  const panelContentStyle = useAnimatedStyle(() => {
    return {
      opacity: contentP.value,
      transform: [{ translateY: interpolate(contentP.value, [0, 1], [6, 0]) }],
    };
  });

  const backdropStyle = useAnimatedStyle(() => {
    return { opacity: interpolate(openP.value, [0, 1], [0, 1]) };
  });

  const renderPanel = (id: ToolId) => {
    switch (id) {
      case 'search':
        return (
          <SearchPanel
            term={searchTerm}
            term2={searchTerm2}
            op={searchOp}
            onChangeTerm={setSearchTerm}
            onChangeTerm2={setSearchTerm2}
            onChangeOp={setSearchOp}
            palette={panelPalette}
          />
        );
      case 'filter':
        return (
          <FilterPanel
            participation={participation}
            status={status}
            sortMode={sortMode}
            nearMe={nearMe}
            onChangeParticipation={setParticipation}
            onChangeStatus={setStatus}
            onChangeSortMode={setSortMode}
            onToggleNearMe={() => setNearMe((v) => !v)}
            onReset={resetFilters}
            palette={panelPalette}
          />
        );
      case 'ai':
        return (
          <AiPanel
            prompt={aiPrompt}
            onChangePrompt={setAiPrompt}
            onSubmit={submitAi}
            palette={{ text, muted, border, surfaceAlt }}
          />
        );
      case 'theme':
        return (
          <ThemePanel
            mode={themeMode}
            accent={themeAccent}
            onChangeMode={setThemeMode}
            onChangeAccent={setThemeAccent}
            palette={panelPalette}
          />
        );
      default:
        return null;
    }
  };

  const onMeasureActivePanel = useCallback(
    (h: number) => {
      if (!activeTool) return;
      const prev = lastMeasuredH.current[activeTool];
      if (prev != null && Math.abs(prev - h) < 2) return;
      lastMeasuredH.current[activeTool] = h;
      setMeasuredContentH((m) => ({ ...m, [activeTool]: h }));
    },
    [activeTool]
  );

  return (
    <View pointerEvents="box-none" style={styles.root}>
      {/* Outside click-catcher */}
      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFillObject, { backgroundColor: overlay }, backdropStyle]}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={closePanel} />
      </Animated.View>

      <View pointerEvents="box-none" style={styles.dockWrap}>
        <Animated.View
          style={[
            styles.dock,
            {
              backgroundColor: surface,
              borderColor: border,
              ...(Platform.OS === 'web'
                ? ({
                    boxShadow: isDark
                      ? '0 24px 70px rgba(0,0,0,0.65)'
                      : '0 24px 70px rgba(0,0,0,0.18)',
                  } as any)
                : null),
            },
            dockStyle,
          ]}
        >
          {/* Panel area (same surface) */}
          <Animated.View
            style={[styles.panelShell, panelShellStyle]}
            pointerEvents={isOpen ? 'auto' : 'none'}
          >
            <View style={styles.panelHeader}>
              {/* Icon-only: show tool icon, no text title */}
              <View style={[styles.panelIcon, { borderColor: border }]}>
                <MaterialIcons name={activeDef?.icon ?? 'crop-square'} size={18} color={text} />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={closePanel}
                style={({ pressed }) => [
                  styles.closeBtn,
                  { borderColor: border, opacity: pressed ? 0.72 : 1 },
                ]}
              >
                <MaterialIcons name="close" size={18} color={text} />
              </Pressable>
            </View>

            <Animated.View style={[styles.panelBody, panelContentStyle]}>
              {activeTool ? (
                <View
                  onLayout={(e) => onMeasureActivePanel(e.nativeEvent.layout.height)}
                  style={styles.panelMeasureWrap}
                >
                  {renderPanel(activeTool)}
                </View>
              ) : null}
            </Animated.View>
          </Animated.View>

          {/* Icon rail (bottom) */}
          <Animated.View style={[styles.iconRow, iconsRowStyle]} pointerEvents="auto">
            {TOOLS.map((t) => {
              const active = activeTool === t.id && isOpen && t.kind === 'panel';
              return (
                <Pressable
                  key={t.id}
                  accessibilityRole="button"
                  accessibilityLabel={t.a11yLabel}
                  onPress={() => openPanel(t.id)}
                  style={({ pressed }) => [
                    styles.iconBtn,
                    {
                      borderColor: border,
                      backgroundColor: active
                        ? isDark
                          ? 'rgba(255,255,255,0.08)'
                          : 'rgba(0,0,0,0.06)'
                        : 'transparent',
                      opacity: pressed ? 0.75 : 1,
                    },
                    active ? styles.iconBtnActive : null,
                  ]}
                >
                  <MaterialIcons name={t.icon} size={22} color={text} />
                </Pressable>
              );
            })}
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
  },
  dockWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 18,
    alignItems: 'center',
  },
  dock: {
    borderWidth: 1,
    overflow: 'hidden',
  },

  // Panel
  panelShell: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 64,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  panelHeader: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  panelIcon: {
    height: 28,
    width: 28,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    height: 28,
    width: 28,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelBody: {
    // Let content size itself; Slice D/E will add scroll rules for large panels.
  },
  panelMeasureWrap: {
    alignSelf: 'stretch',
  },

  // Icon row
  iconRow: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    height: 44,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnActive: {
    transform: [{ scale: 1.03 }],
  },

});

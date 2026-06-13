import { Stack, router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/providers/ThemeProvider";

type AuthMode = "login" | "register" | "reset";
type MoodState = "straight" | "smile" | "frown" | "submitting";
type AuthFieldId = "name" | "email" | "password" | "confirmPassword";

type AuthValues = Record<AuthFieldId, string>;
type MockFlowStage =
  | "idle"
  | "localError"
  | "requesting"
  | "serverError"
  | "success";
type FieldErrors = Partial<Record<AuthFieldId, string>>;
type MockFlowResult = {
  ok: boolean;
  message: string;
  fieldErrors?: FieldErrors;
};
type FlowStepState = "idle" | "active" | "done" | "error";
type CurveIntensity = "soft" | "standard" | "deep";
type MotionSpeed = "calm" | "balanced" | "quick";
type GlowIntensity = "off" | "soft" | "strong";
type FieldStyle = "calmFill" | "innerWave" | "curvedField" | "ribbon";

type MotionTuning = {
  curveIntensity: CurveIntensity;
  speed: MotionSpeed;
  glow: GlowIntensity;
  fieldStyle: FieldStyle;
  shakeEnabled: boolean;
  reducedMotion: boolean;
};

type TuningChoice<T extends string> = {
  value: T;
  label: string;
};

type FieldConfig = {
  id: AuthFieldId;
  label: string;
  placeholder: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  helper?: string;
};

const emptyValues: AuthValues = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const modes: { id: AuthMode; label: string }[] = [
  { id: "login", label: "Login" },
  { id: "register", label: "Register" },
  { id: "reset", label: "Reset" },
];

const curveChoices: TuningChoice<CurveIntensity>[] = [
  { value: "soft", label: "Subtle" },
  { value: "standard", label: "Medium" },
  { value: "deep", label: "Strong" },
];

const speedChoices: TuningChoice<MotionSpeed>[] = [
  { value: "calm", label: "Calm" },
  { value: "balanced", label: "Balanced" },
  { value: "quick", label: "Quick" },
];

const glowChoices: TuningChoice<GlowIntensity>[] = [
  { value: "off", label: "Off" },
  { value: "soft", label: "Soft" },
  { value: "strong", label: "Strong" },
];

const fieldStyleChoices: TuningChoice<FieldStyle>[] = [
  { value: "ribbon", label: "Ribbon" },
  { value: "calmFill", label: "Calm fill" },
  { value: "innerWave", label: "Inner wave" },
  { value: "curvedField", label: "Clean curve" },
];

const defaultMotionTuning: MotionTuning = {
  curveIntensity: "standard",
  speed: "balanced",
  glow: "soft",
  fieldStyle: "ribbon",
  shakeEnabled: true,
  reducedMotion: false,
};

const mockLoginEmail = "mina@example.com";
const mockLoginPassword = "hello2026";

const stateCards: {
  state: Exclude<MoodState, "submitting">;
  title: string;
  description: string;
  line: string;
}[] = [
  {
    state: "straight",
    title: "Typing / incomplete",
    description:
      "Keep the field stable while the user is still entering information.",
    line: "────────────",
  },
  {
    state: "smile",
    title: "Valid / ready",
    description:
      "Curve the mood line gently upward after the field passes validation.",
    line: "╰────────╯",
  },
  {
    state: "frown",
    title: "Error / failed",
    description:
      "Curve the mood line downward, then pair it with clear helper text.",
    line: "╭────────╮",
  },
];

function getModeCopy(mode: AuthMode) {
  switch (mode) {
    case "register":
      return {
        title: "Create your account",
        subtitle:
          "Create your account and set local display preferences for the beta.",
        button: "Create account",
        success:
          "Account shape looks ready. This lab does not create a real account.",
      };
    case "reset":
      return {
        title: "Reset your password",
        subtitle: "Request a reset link for your Hellowhen account.",
        button: "Send reset link",
        success:
          "Reset-link success state preview. No email is sent from this lab.",
      };
    case "login":
    default:
      return {
        title: "Welcome back",
        subtitle: "Sign in to create needs, offers, trades, and proposals.",
        button: "Login",
        success:
          "Login success state preview. This lab does not call production auth.",
      };
  }
}

function getFieldConfigs(mode: AuthMode): FieldConfig[] {
  switch (mode) {
    case "register":
      return [
        { id: "name", label: "Full name", placeholder: "Mina Chen" },
        {
          id: "email",
          label: "Email",
          placeholder: "you@example.com",
          keyboardType: "email-address",
        },
        {
          id: "password",
          label: "Password",
          placeholder: "At least 8 characters",
          secureTextEntry: true,
        },
        {
          id: "confirmPassword",
          label: "Confirm password",
          placeholder: "Repeat password",
          secureTextEntry: true,
        },
      ];
    case "reset":
      return [
        {
          id: "email",
          label: "Email",
          placeholder: "you@example.com",
          keyboardType: "email-address",
        },
      ];
    case "login":
    default:
      return [
        {
          id: "email",
          label: "Email",
          placeholder: "you@example.com",
          keyboardType: "email-address",
        },
        {
          id: "password",
          label: "Password",
          placeholder: "At least 8 characters",
          secureTextEntry: true,
        },
      ];
  }
}

function getSampleValues(mode: AuthMode): AuthValues {
  switch (mode) {
    case "register":
      return {
        name: "Mina Chen",
        email: "mina@example.com",
        password: "hello2026",
        confirmPassword: "hello2026",
      };
    case "reset":
      return { ...emptyValues, email: "mina@example.com" };
    case "login":
    default:
      return {
        ...emptyValues,
        email: "mina@example.com",
        password: "hello2026",
      };
  }
}

function getErrorSampleValues(mode: AuthMode): AuthValues {
  switch (mode) {
    case "register":
      return {
        name: "M",
        email: "mina",
        password: "short",
        confirmPassword: "different",
      };
    case "reset":
      return { ...emptyValues, email: "not-an-email" };
    case "login":
    default:
      return { ...emptyValues, email: "mina", password: "short" };
  }
}

function getServerCaseValues(mode: AuthMode): AuthValues {
  switch (mode) {
    case "register":
      return {
        name: "Mina Chen",
        email: "taken@example.com",
        password: mockLoginPassword,
        confirmPassword: mockLoginPassword,
      };
    case "reset":
      return { ...emptyValues, email: "unknown@example.com" };
    case "login":
    default:
      return {
        ...emptyValues,
        email: mockLoginEmail,
        password: "validbutwrong",
      };
  }
}

function isEmailValid(value: string) {
  return /^\S+@\S+\.\S+$/.test(value.trim());
}

function isFieldValid(fieldId: AuthFieldId, values: AuthValues) {
  const value = values[fieldId].trim();

  switch (fieldId) {
    case "name":
      return value.length >= 2;
    case "email":
      return isEmailValid(value);
    case "password":
      return values.password.length >= 8;
    case "confirmPassword":
      return (
        values.confirmPassword.length > 0 &&
        values.confirmPassword === values.password
      );
    default:
      return false;
  }
}

function getFieldError(fieldId: AuthFieldId) {
  switch (fieldId) {
    case "name":
      return "Use at least 2 characters.";
    case "email":
      return "Enter a valid email address.";
    case "password":
      return "Use at least 8 characters.";
    case "confirmPassword":
      return "Passwords should match before the curve turns into a smile.";
    default:
      return "Check this field.";
  }
}

function getModeFlowIntro(mode: AuthMode) {
  switch (mode) {
    case "register":
      return "Register validates all fields, simulates account creation, and can return a taken-email error without leaving the lab.";
    case "reset":
      return "Reset validates the email, simulates a neutral reset-link response, and never reveals whether the account exists.";
    case "login":
    default:
      return "Login validates the fields, simulates an auth request, then either opens a success state or returns a password-level error.";
  }
}

function getMockFlowResult(mode: AuthMode, values: AuthValues): MockFlowResult {
  const email = values.email.trim().toLowerCase();

  switch (mode) {
    case "register":
      if (email === "taken@example.com") {
        return {
          ok: false,
          message:
            "Mock register failed: this email is already used in the lab seed data.",
          fieldErrors: {
            email: "This mock email is already taken. Try another email.",
          },
        };
      }

      return {
        ok: true,
        message:
          "Mock account created. A real flow would now enter the beta with the selected local display preferences.",
      };
    case "reset":
      return {
        ok: true,
        message:
          "Mock reset accepted. A real flow should keep this neutral: if the account exists, a reset link will be sent.",
      };
    case "login":
    default:
      if (email === mockLoginEmail && values.password === mockLoginPassword) {
        return {
          ok: true,
          message:
            "Mock login accepted. A real flow would now continue to the signed-in app shell.",
        };
      }

      return {
        ok: false,
        message:
          "Mock login failed: valid field shapes can still receive a server-side error.",
        fieldErrors: {
          password: `Use ${mockLoginEmail} / ${mockLoginPassword} for the success path.`,
        },
      };
  }
}

function getStateProgress(state: MoodState) {
  switch (state) {
    case "smile":
      return 1;
    case "frown":
      return 2;
    case "submitting":
      return 3;
    case "straight":
    default:
      return 0;
  }
}

function getMoodVariantMetrics(intensity: CurveIntensity) {
  switch (intensity) {
    case "soft":
      return {
        waveInset: 58,
        waveHeight: 14,
        curveInset: 34,
        curveHeight: 30,
        curveOffset: -19,
      };
    case "deep":
      return {
        waveInset: 36,
        waveHeight: 22,
        curveInset: 18,
        curveHeight: 42,
        curveOffset: -27,
      };
    case "standard":
    default:
      return {
        waveInset: 46,
        waveHeight: 18,
        curveInset: 26,
        curveHeight: 36,
        curveOffset: -23,
      };
  }
}

function getRibbonMetrics(intensity: CurveIntensity, compact = false) {
  const shellHeight = compact ? 50 : 54;
  const segmentHeight = compact ? 34 : 38;
  const fieldTop = Math.round((shellHeight - segmentHeight) / 2);

  switch (intensity) {
    case "soft":
      return {
        shellHeight,
        segmentHeight,
        fieldTop,
        curveDepth: compact ? 5 : 6,
        segmentOverlap: 6,
        segmentRotation: 2.2,
        textAmplitude: compact ? 3 : 4,
        textRotation: 1.4,
      };
    case "deep":
      return {
        shellHeight,
        segmentHeight,
        fieldTop,
        curveDepth: compact ? 9 : 10,
        segmentOverlap: 7,
        segmentRotation: 4.4,
        textAmplitude: compact ? 5 : 6,
        textRotation: 2.7,
      };
    case "standard":
    default:
      return {
        shellHeight,
        segmentHeight,
        fieldTop,
        curveDepth: compact ? 7 : 8,
        segmentOverlap: 7,
        segmentRotation: 3.4,
        textAmplitude: compact ? 4 : 5,
        textRotation: 2.1,
      };
  }
}

function getRibbonColor(
  state: MoodState,
  palette: ReturnType<typeof useTheme>["palette"],
  isTyping: boolean,
  isFocused: boolean,
) {
  if (isTyping || isFocused || state === "submitting") {
    return "#FFE56E";
  }

  if (state === "smile") {
    return "#10C878";
  }

  if (state === "frown") {
    return "#FF646C";
  }

  return palette.surfaceAlt;
}

function getRibbonTextColor() {
  return "#050505";
}

type SmoothRibbonState = Extract<MoodState, "smile" | "frown">;

type SmoothRibbonConfig = {
  viewBoxWidth: number;
  viewBoxHeight: number;
  edgeX: number;
  startY: number;
  controlY: number;
  endY: number;
  strokeWidth: number;
  fontSize: number;
  textDy: number;
};

function getSmoothRibbonConfig(
  state: SmoothRibbonState,
  intensity: CurveIntensity,
): SmoothRibbonConfig {
  const viewBoxWidth = 320;
  const viewBoxHeight = 64;
  const edgeX = 26;
  const depthByIntensity: Record<CurveIntensity, number> = {
    soft: 10,
    standard: 15,
    deep: 20,
  };
  const strokeByIntensity: Record<CurveIntensity, number> = {
    soft: 32,
    standard: 34,
    deep: 36,
  };
  const depth = depthByIntensity[intensity];
  const isSmile = state === "smile";
  const startY = isSmile ? 24 : 40;

  return {
    viewBoxWidth,
    viewBoxHeight,
    edgeX,
    startY,
    endY: startY,
    controlY: isSmile ? startY + depth : startY - depth,
    strokeWidth: strokeByIntensity[intensity],
    fontSize: 18,
    textDy: 6,
  };
}

function getSmoothRibbonDisplayText(value: string) {
  if (/^•+$/.test(value)) {
    return value.length > 16 ? "•".repeat(16) : value;
  }

  if (value.length <= 30) {
    return value;
  }

  return `${value.slice(0, 14)}…${value.slice(-12)}`;
}

function getSmoothRibbonPath(config: SmoothRibbonConfig) {
  return `M ${config.edgeX} ${config.startY} Q ${
    config.viewBoxWidth / 2
  } ${config.controlY} ${config.viewBoxWidth - config.edgeX} ${
    config.endY
  }`;
}

function SmoothRibbonRenderer({
  color,
  displayValue,
  intensity,
  state,
}: {
  color: string;
  displayValue: string;
  intensity: CurveIntensity;
  state: SmoothRibbonState;
}) {
  const pathIdRef = useRef(
    `authRibbonPath${Math.random().toString(36).slice(2)}`,
  );
  const pathId = pathIdRef.current;
  const config = getSmoothRibbonConfig(state, intensity);
  const path = getSmoothRibbonPath(config);
  const text = getSmoothRibbonDisplayText(displayValue);

  if (Platform.OS === "web") {
    return (
      <View pointerEvents="none" style={styles.smoothRibbonLayer}>
        {React.createElement(
          "svg",
          {
            viewBox: `0 0 ${config.viewBoxWidth} ${config.viewBoxHeight}`,
            preserveAspectRatio: "none",
            style: {
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              width: "100%",
              height: "100%",
              overflow: "visible",
            },
          },
          React.createElement(
            "defs",
            null,
            React.createElement("path", { id: pathId, d: path }),
          ),
          React.createElement("path", {
            d: path,
            fill: "none",
            stroke: color,
            strokeLinecap: "round",
            strokeLinejoin: "round",
            strokeWidth: config.strokeWidth,
          }),
          React.createElement(
            "text",
            {
              dy: config.textDy,
              fill: getRibbonTextColor(),
              fontFamily:
                "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              fontSize: config.fontSize,
              fontWeight: 900,
              letterSpacing: /^•+$/.test(text) ? 3 : 0.2,
              textAnchor: "middle",
            },
            React.createElement(
              "textPath",
              {
                href: `#${pathId}`,
                startOffset: "50%",
              },
              text,
            ),
          ),
        )}
      </View>
    );
  }

  return (
    <View pointerEvents="none" style={styles.smoothRibbonLayer}>
      <View
        style={[
          styles.nativeSmoothRibbonFallback,
          {
            backgroundColor: color,
            transform: [
              { translateY: state === "smile" ? 3 : -3 },
              { rotate: state === "smile" ? "-1.5deg" : "1.5deg" },
            ],
          },
        ]}
      />
      <Text style={styles.nativeSmoothRibbonText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function getSpeedMultiplier(speed: MotionSpeed) {
  switch (speed) {
    case "calm":
      return 1.35;
    case "quick":
      return 0.72;
    case "balanced":
    default:
      return 1;
  }
}

function getTransitionDuration(state: MoodState, tuning: MotionTuning) {
  if (tuning.reducedMotion) {
    return 0;
  }

  const baseDuration = state === "frown" ? 170 : 260;
  return Math.round(baseDuration * getSpeedMultiplier(tuning.speed));
}

function getPulseDuration(tuning: MotionTuning) {
  return Math.round(560 * getSpeedMultiplier(tuning.speed));
}

function getShakeDuration(tuning: MotionTuning) {
  return Math.round(38 * getSpeedMultiplier(tuning.speed));
}

function getGlowOpacity(state: MoodState, tuning: MotionTuning) {
  if (state === "straight" || tuning.glow === "off") {
    return 0;
  }

  return tuning.glow === "strong" ? 0.2 : 0.1;
}

function getTextCurveAmplitude(intensity: CurveIntensity) {
  switch (intensity) {
    case "soft":
      return 2;
    case "deep":
      return 5;
    case "standard":
    default:
      return 3;
  }
}

function getTextCurveRotation(intensity: CurveIntensity) {
  switch (intensity) {
    case "soft":
      return 0.4;
    case "deep":
      return 1.2;
    case "standard":
    default:
      return 0.7;
  }
}

function getCurvedDisplayValue(field: FieldConfig, value: string) {
  if (!value) {
    return "";
  }

  if (field.secureTextEntry) {
    return "•".repeat(value.length);
  }

  return value;
}

function getMoodColor(
  state: MoodState,
  palette: ReturnType<typeof useTheme>["palette"],
  isFocused: boolean,
  isTyping: boolean,
) {
  if (isTyping) {
    return "#D88917";
  }

  if (state === "frown") {
    return palette.danger;
  }

  if (state === "smile") {
    return "#35B86B";
  }

  if (state === "submitting") {
    return "#D88917";
  }

  return isFocused ? "#FFB74D" : palette.border;
}

function getMoodFillColor(
  state: MoodState,
  palette: ReturnType<typeof useTheme>["palette"],
  isTyping: boolean,
) {
  const isLight = palette.mode === "light";

  if (isTyping || state === "submitting") {
    return isLight ? "#FFFBF0" : "#2B210E";
  }

  if (state === "smile") {
    return isLight ? "#F5FCF7" : "#102417";
  }

  if (state === "frown") {
    return isLight ? "#FFF7F8" : "#30121A";
  }

  return palette.surfaceAlt;
}

function getMoodOverlayColor(
  state: MoodState,
  palette: ReturnType<typeof useTheme>["palette"],
  isTyping: boolean,
) {
  const isLight = palette.mode === "light";

  if (isTyping || state === "submitting") {
    return isLight ? "rgba(255,183,77,0.2)" : "rgba(255,183,77,0.16)";
  }

  if (state === "smile") {
    return isLight ? "rgba(53,184,107,0.16)" : "rgba(53,184,107,0.18)";
  }

  if (state === "frown") {
    return isLight ? "rgba(255,93,119,0.18)" : "rgba(255,93,119,0.2)";
  }

  return "transparent";
}

function getMoodBorderColor(
  state: MoodState,
  palette: ReturnType<typeof useTheme>["palette"],
  isFocused: boolean,
  isTyping: boolean,
) {
  if (isTyping || state === "submitting") {
    return "rgba(255,183,77,0.36)";
  }

  if (state === "smile") {
    return "rgba(53,184,107,0.32)";
  }

  if (state === "frown") {
    return "rgba(255,93,119,0.38)";
  }

  return isFocused ? "rgba(255,183,77,0.4)" : palette.border;
}

function getHelperTextColor(
  state: MoodState,
  palette: ReturnType<typeof useTheme>["palette"],
) {
  if (state === "frown") {
    return palette.danger;
  }

  if (state === "submitting") {
    return palette.mode === "light" ? "#8A5200" : "#FFD38A";
  }

  return palette.muted;
}

function ModeTabs({
  activeMode,
  onChange,
}: {
  activeMode: AuthMode;
  onChange: (mode: AuthMode) => void;
}) {
  const { palette } = useTheme();

  return (
    <View style={[styles.tabs, { backgroundColor: palette.surfaceAlt }]}>
      {modes.map((mode) => {
        const isActive = mode.id === activeMode;
        return (
          <Pressable
            key={mode.id}
            onPress={() => onChange(mode.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            style={({ pressed }) => [
              styles.tab,
              isActive ? { backgroundColor: palette.surface } : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={[styles.tabText, { color: palette.text }]}>
              {mode.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function AuthMoodInput({
  field,
  value,
  state,
  helper,
  shakeKey,
  tuning,
  onChangeText,
  compact = false,
}: {
  field: FieldConfig;
  value: string;
  state: MoodState;
  helper?: string;
  shakeKey: number;
  tuning: MotionTuning;
  onChangeText: (value: string) => void;
  compact?: boolean;
}) {
  const { palette } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visualState: MoodState =
    isTyping && state !== "submitting" ? "straight" : state;
  const progress = useRef(
    new Animated.Value(getStateProgress(visualState)),
  ).current;
  const submitPulse = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const textBendProgress = useRef(new Animated.Value(0)).current;

  const clearTypingTimer = () => {
    if (typingTimer.current) {
      clearTimeout(typingTimer.current);
      typingTimer.current = null;
    }
  };

  const holdStraightWhileEditing = () => {
    if (state === "submitting") {
      return;
    }

    setIsTyping(true);
    clearTypingTimer();
    typingTimer.current = setTimeout(() => {
      setIsTyping(false);
      typingTimer.current = null;
    }, 1000);
  };

  useEffect(() => {
    Animated.timing(progress, {
      toValue: getStateProgress(visualState),
      duration: getTransitionDuration(visualState, tuning),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress, visualState, tuning]);

  useEffect(
    () => () => {
      clearTypingTimer();
    },
    [],
  );

  useEffect(() => {
    if (state !== "submitting") {
      return;
    }

    clearTypingTimer();
    setIsTyping(false);
  }, [state]);

  const handleChangeText = (nextValue: string) => {
    onChangeText(nextValue);
    holdStraightWhileEditing();
  };

  const handleFocus = () => {
    setIsFocused(true);

    if (value.length > 0) {
      holdStraightWhileEditing();
    }
  };

  const handleBlur = () => {
    clearTypingTimer();
    setIsTyping(false);
    setIsFocused(false);
  };

  useEffect(() => {
    if (state !== "submitting" || tuning.reducedMotion) {
      submitPulse.stopAnimation();
      submitPulse.setValue(0);
      return;
    }

    const duration = getPulseDuration(tuning);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(submitPulse, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(submitPulse, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [state, submitPulse, tuning]);

  useEffect(() => {
    if (
      state !== "frown" ||
      shakeKey === 0 ||
      tuning.reducedMotion ||
      !tuning.shakeEnabled
    ) {
      shake.stopAnimation();
      shake.setValue(0);
      return;
    }

    const duration = getShakeDuration(tuning);
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, {
        toValue: -5,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        toValue: 5,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        toValue: -3,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        toValue: 3,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        toValue: 0,
        duration: Math.round(55 * getSpeedMultiplier(tuning.speed)),
        useNativeDriver: true,
      }),
    ]).start();
  }, [shake, shakeKey, state, tuning]);

  const isRibbonStyle = tuning.fieldStyle === "ribbon";
  const ribbonMetrics = useMemo(
    () => getRibbonMetrics(tuning.curveIntensity, compact),
    [compact, tuning.curveIntensity],
  );
  const ribbonColor = getRibbonColor(visualState, palette, isTyping, isFocused);
  const moodColor = isRibbonStyle
    ? ribbonColor
    : getMoodColor(visualState, palette, isFocused, isTyping);
  const moodFillColor = getMoodFillColor(visualState, palette, isTyping);
  const moodBorderColor = getMoodBorderColor(
    visualState,
    palette,
    isFocused,
    isTyping,
  );
  const variantMetrics = getMoodVariantMetrics(tuning.curveIntensity);
  const showRibbonDisplay =
    isRibbonStyle &&
    !isTyping &&
    !isFocused &&
    value.length > 0 &&
    (visualState === "smile" || visualState === "frown");
  const showRibbonTyping =
    isRibbonStyle &&
    !showRibbonDisplay &&
    (isTyping || isFocused || visualState === "submitting");
  const showInnerWave = tuning.fieldStyle === "innerWave";
  const showCurvedField = tuning.fieldStyle === "curvedField";
  const overlayColor = getMoodOverlayColor(visualState, palette, isTyping);
  const smileOpacity = progress.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [0, 0.9, 0, 0.55],
  });
  const frownOpacity = progress.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [0, 0, 0.9, 0],
  });
  const smileScaleY = submitPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.86, 1.14],
  });
  const smileScaleX = submitPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1.02],
  });
  const visibleHelper = state === "straight" && !isTyping ? undefined : helper;
  const displayValue = getCurvedDisplayValue(field, value);
  const showCurvedText =
    !isRibbonStyle &&
    !isTyping &&
    !isFocused &&
    displayValue.length > 0 &&
    (visualState === "smile" || visualState === "frown");
  const textCurveDirection = visualState === "smile" ? 1 : -1;
  const textCurveAmplitude = getTextCurveAmplitude(tuning.curveIntensity);
  const textCurveRotation = getTextCurveRotation(tuning.curveIntensity);
  const textCharacters = Array.from(displayValue);
  const textCenterIndex = Math.max((textCharacters.length - 1) / 2, 1);
  const inputTextColor = showRibbonDisplay
    ? "transparent"
    : showRibbonTyping
      ? getRibbonTextColor()
      : palette.text;
  const inputPlaceholderColor = showRibbonTyping
    ? "rgba(5,5,5,0.52)"
    : palette.muted;
  useEffect(() => {
    Animated.timing(textBendProgress, {
      toValue: showCurvedText ? 1 : 0,
      duration: tuning.reducedMotion
        ? 0
        : Math.round(220 * getSpeedMultiplier(tuning.speed)),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [showCurvedText, textBendProgress, tuning]);

  return (
    <Animated.View
      style={[styles.fieldBlock, { transform: [{ translateX: shake }] }]}
    >
      <View style={styles.fieldLabelRow}>
        <Text style={[styles.fieldLabel, { color: palette.text }]}>
          {field.label}
        </Text>
      </View>

      <View
        style={[
          styles.inputShell,
          isRibbonStyle
            ? {
                height: ribbonMetrics.shellHeight,
                minHeight: ribbonMetrics.shellHeight,
                borderRadius: 999,
                paddingHorizontal: 16,
              }
            : null,
          {
            shadowColor: moodColor,
            shadowOpacity:
              Platform.OS === "ios" ? getGlowOpacity(visualState, tuning) : 0,
          },
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            isRibbonStyle ? styles.ribbonInputFill : styles.inputFill,
            isRibbonStyle
              ? {
                  top: ribbonMetrics.fieldTop,
                  height: ribbonMetrics.segmentHeight,
                }
              : null,
            {
              backgroundColor: showRibbonDisplay
                ? "transparent"
                : showRibbonTyping
                  ? ribbonColor
                  : moodFillColor,
              borderColor: showRibbonDisplay
                ? "transparent"
                : showRibbonTyping
                  ? "rgba(5,5,5,0.08)"
                  : moodBorderColor,
            },
          ]}
        />
        {showRibbonDisplay &&
        (visualState === "smile" || visualState === "frown") ? (
          <SmoothRibbonRenderer
            color={ribbonColor}
            displayValue={displayValue}
            intensity={tuning.curveIntensity}
            state={visualState}
          />
        ) : null}
        {showCurvedField ? (
          <>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.inputCurveField,
                {
                  left: variantMetrics.curveInset,
                  right: variantMetrics.curveInset,
                  height: variantMetrics.curveHeight,
                  bottom: variantMetrics.curveOffset,
                  backgroundColor: overlayColor,
                  opacity: smileOpacity,
                  transform: [{ scaleX: smileScaleX }, { scaleY: smileScaleY }],
                },
              ]}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.inputCurveField,
                {
                  left: variantMetrics.curveInset,
                  right: variantMetrics.curveInset,
                  height: variantMetrics.curveHeight,
                  top: variantMetrics.curveOffset,
                  backgroundColor: overlayColor,
                  opacity: frownOpacity,
                },
              ]}
            />
          </>
        ) : null}

        {showInnerWave ? (
          <>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.inputMoodWave,
                styles.inputSmileWave,
                {
                  left: variantMetrics.waveInset,
                  right: variantMetrics.waveInset,
                  height: variantMetrics.waveHeight,
                  bottom: 7,
                  borderColor: moodColor,
                  opacity: smileOpacity,
                  transform: [{ scaleX: smileScaleX }, { scaleY: smileScaleY }],
                },
              ]}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.inputMoodWave,
                styles.inputFrownWave,
                {
                  left: variantMetrics.waveInset,
                  right: variantMetrics.waveInset,
                  height: variantMetrics.waveHeight,
                  top: 7,
                  borderColor: moodColor,
                  opacity: frownOpacity,
                },
              ]}
            />
          </>
        ) : null}

        <TextInput
          value={value}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={field.placeholder}
          placeholderTextColor={
            showRibbonDisplay ? "transparent" : inputPlaceholderColor
          }
          keyboardType={field.keyboardType}
          secureTextEntry={field.secureTextEntry}
          autoCapitalize="none"
          autoCorrect={false}
          editable={state !== "submitting"}
          style={[
            styles.textInput,
            isRibbonStyle ? styles.ribbonTextInput : null,
            { color: inputTextColor, opacity: showRibbonDisplay ? 0 : 1 },
            Platform.OS === "web" ? styles.webTextInput : null,
          ]}
        />

        {displayValue.length > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.curvedTextLayer,
              isRibbonStyle ? styles.ribbonTextLayer : null,
              { opacity: textBendProgress },
            ]}
          >
            <View style={styles.curvedTextRow}>
              {textCharacters.map((part, index) => {
                const normalizedIndex =
                  textCharacters.length <= 1
                    ? 0
                    : (index - textCenterIndex) / textCenterIndex;
                const centerWeight = Math.max(0, 1 - Math.abs(normalizedIndex));
                const translateY =
                  textCurveDirection * textCurveAmplitude * centerWeight;
                const rotate =
                  normalizedIndex * textCurveRotation * textCurveDirection;
                const text = String(part) === " " ? "\u00A0" : String(part);

                return (
                  <Animated.Text
                    key={`${text}-${index}`}
                    numberOfLines={1}
                    style={[
                      styles.curvedTextChar,
                      {
                        color: palette.text,
                        transform: [
                          {
                            translateY: textBendProgress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, translateY],
                            }),
                          },
                          {
                            rotate: textBendProgress.interpolate({
                              inputRange: [0, 1],
                              outputRange: ["0deg", `${rotate}deg`],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    {text}
                  </Animated.Text>
                );
              })}
            </View>
          </Animated.View>
        ) : null}
      </View>

      {visibleHelper ? (
        <Text
          style={[
            styles.helper,
            { color: getHelperTextColor(visualState, palette) },
          ]}
        >
          {visibleHelper}
        </Text>
      ) : null}
    </Animated.View>
  );
}

function getFlowStepColor(
  state: FlowStepState,
  palette: ReturnType<typeof useTheme>["palette"],
) {
  switch (state) {
    case "active":
      return "#4CC9FF";
    case "done":
      return "#35E6C6";
    case "error":
      return palette.danger;
    case "idle":
    default:
      return palette.border;
  }
}

function getFlowSteps(stage: MockFlowStage): {
  label: string;
  state: FlowStepState;
}[] {
  const validationState: FlowStepState =
    stage === "localError"
      ? "error"
      : stage === "idle"
        ? "idle"
        : stage === "requesting"
          ? "done"
          : stage === "serverError" || stage === "success"
            ? "done"
            : "idle";
  const requestState: FlowStepState =
    stage === "requesting"
      ? "active"
      : stage === "serverError"
        ? "error"
        : stage === "success"
          ? "done"
          : "idle";
  const resultState: FlowStepState =
    stage === "success"
      ? "done"
      : stage === "serverError" || stage === "localError"
        ? "error"
        : "idle";

  return [
    { label: "Validate fields", state: validationState },
    { label: "Mock request", state: requestState },
    { label: "Result copy", state: resultState },
  ];
}

function AuthMockFlowPanel({
  mode,
  stage,
  message,
  fieldErrors,
}: {
  mode: AuthMode;
  stage: MockFlowStage;
  message: string | null;
  fieldErrors: FieldErrors;
}) {
  const { palette } = useTheme();
  const steps = getFlowSteps(stage);
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  const isErrorStage = stage === "localError" || stage === "serverError";

  return (
    <View
      style={[
        styles.flowBox,
        { backgroundColor: palette.surfaceAlt, borderColor: palette.border },
      ]}
    >
      <View style={styles.flowTopRow}>
        <Text style={[styles.flowTitle, { color: palette.text }]}>
          Mock flow
        </Text>
        <Text style={[styles.flowBadge, { color: palette.muted }]}>
          LAB ONLY
        </Text>
      </View>
      <Text style={[styles.flowDescription, { color: palette.muted }]}>
        {getModeFlowIntro(mode)}
      </Text>

      {mode === "login" ? (
        <Text style={[styles.flowSeed, { color: palette.muted }]}>
          Success seed: {mockLoginEmail} / {mockLoginPassword}
        </Text>
      ) : null}

      <View style={styles.flowStepList}>
        {steps.map((step) => {
          const color = getFlowStepColor(step.state, palette);
          return (
            <View key={step.label} style={styles.flowStepItem}>
              <View
                style={[
                  styles.flowStepDot,
                  {
                    backgroundColor:
                      step.state === "idle" ? "transparent" : color,
                    borderColor: color,
                  },
                ]}
              />
              <Text style={[styles.flowStepText, { color: palette.text }]}>
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>

      {message ? (
        <View
          style={[
            styles.flowMessage,
            {
              borderColor: isErrorStage
                ? "rgba(255,93,119,0.55)"
                : "rgba(53,230,198,0.5)",
              backgroundColor: isErrorStage
                ? "rgba(255,93,119,0.12)"
                : "rgba(53,230,198,0.12)",
            },
          ]}
        >
          <Text
            style={[
              styles.flowMessageText,
              { color: isErrorStage ? palette.danger : "#B8FFF1" },
            ]}
          >
            {message}
          </Text>
          {hasFieldErrors ? (
            <Text style={[styles.flowMessageHint, { color: palette.muted }]}>
              Server-side field errors force the related mood line into the
              frown state even when the local format is valid.
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function TuningOptionGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: TuningChoice<T>[];
  onChange: (value: T) => void;
}) {
  const { palette } = useTheme();

  return (
    <View style={styles.tuningGroup}>
      <Text style={[styles.tuningLabel, { color: palette.text }]}>{label}</Text>
      <View
        style={[
          styles.tuningSegment,
          { borderColor: palette.border, backgroundColor: palette.surfaceAlt },
        ]}
      >
        {options.map((option) => {
          const isActive = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              style={({ pressed }) => [
                styles.tuningSegmentButton,
                isActive ? { backgroundColor: palette.surface } : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text
                style={[
                  styles.tuningSegmentText,
                  { color: isActive ? palette.text : palette.muted },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function TuningToggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const { palette } = useTheme();

  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      style={({ pressed }) => [
        styles.tuningToggle,
        { backgroundColor: palette.surfaceAlt, borderColor: palette.border },
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.tuningToggleCopy}>
        <Text style={[styles.tuningLabel, { color: palette.text }]}>
          {label}
        </Text>
        <Text
          style={[styles.tuningToggleDescription, { color: palette.muted }]}
        >
          {description}
        </Text>
      </View>
      <View
        style={[
          styles.switchTrack,
          {
            backgroundColor: value ? "rgba(53,230,198,0.28)" : "transparent",
            borderColor: value ? "#35E6C6" : palette.border,
          },
        ]}
      >
        <View
          style={[
            styles.switchThumb,
            {
              backgroundColor: value ? "#35E6C6" : palette.muted,
              transform: [{ translateX: value ? 18 : 0 }],
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

function AuthMotionTuningPanel({
  tuning,
  onChange,
  onReset,
}: {
  tuning: MotionTuning;
  onChange: (tuning: MotionTuning) => void;
  onReset: () => void;
}) {
  const { palette } = useTheme();

  const update = (patch: Partial<MotionTuning>) => {
    onChange({ ...tuning, ...patch });
  };

  return (
    <View
      style={[
        styles.tuningPanel,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
    >
      <View style={styles.tuningHeaderRow}>
        <View style={styles.tuningHeaderCopy}>
          <Text style={[styles.tuningTitle, { color: palette.text }]}>
            Motion tuning
          </Text>
          <Text style={[styles.tuningIntro, { color: palette.muted }]}>
            Compare the smooth ribbon mood input against calmer field
            treatments. Reduced motion keeps validation states but removes
            shake, pulse, and long transitions.
          </Text>
        </View>
        <Pressable
          onPress={onReset}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.resetTuningButton,
            { borderColor: palette.border },
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={[styles.resetTuningText, { color: palette.text }]}>
            Reset tuning
          </Text>
        </Pressable>
      </View>

      <View style={styles.tuningGrid}>
        <TuningOptionGroup
          label="Field style"
          value={tuning.fieldStyle}
          options={fieldStyleChoices}
          onChange={(fieldStyle) => update({ fieldStyle })}
        />
        <TuningOptionGroup
          label="Curve strength"
          value={tuning.curveIntensity}
          options={curveChoices}
          onChange={(curveIntensity) => update({ curveIntensity })}
        />
        <TuningOptionGroup
          label="Animation speed"
          value={tuning.speed}
          options={speedChoices}
          onChange={(speed) => update({ speed })}
        />
        <TuningOptionGroup
          label="Glow intensity"
          value={tuning.glow}
          options={glowChoices}
          onChange={(glow) => update({ glow })}
        />
      </View>

      <View style={styles.tuningToggleGrid}>
        <TuningToggle
          label="Error shake"
          description="Use a short nudge when validation fails."
          value={tuning.shakeEnabled}
          onChange={(shakeEnabled) => update({ shakeEnabled })}
        />
        <TuningToggle
          label="Reduced motion"
          description="Disable pulse and shake while preserving text feedback."
          value={tuning.reducedMotion}
          onChange={(reducedMotion) => update({ reducedMotion })}
        />
      </View>
    </View>
  );
}

function AuthInlineStatus({
  stage,
  message,
}: {
  stage: MockFlowStage;
  message: string | null;
}) {
  const { palette } = useTheme();

  if (!message) {
    return null;
  }

  const isErrorStage = stage === "localError" || stage === "serverError";
  const isSuccessStage = stage === "success";
  const isLight = palette.mode === "light";
  const borderColor = isErrorStage
    ? "rgba(255,93,119,0.55)"
    : isSuccessStage
      ? "rgba(53,184,107,0.5)"
      : "rgba(255,183,77,0.5)";
  const backgroundColor = isErrorStage
    ? isLight
      ? "#FFECEF"
      : "rgba(255,93,119,0.12)"
    : isSuccessStage
      ? isLight
        ? "#E8F9EE"
        : "rgba(53,230,198,0.12)"
      : isLight
        ? "#FFF4D8"
        : "rgba(255,183,77,0.12)";
  const textColor = isErrorStage
    ? palette.danger
    : isSuccessStage
      ? isLight
        ? "#176C3B"
        : "#B8FFF1"
      : isLight
        ? "#8A5200"
        : "#FFE0A3";

  return (
    <View style={[styles.authStatusBox, { borderColor, backgroundColor }]}>
      <Text style={[styles.authStatusText, { color: textColor }]}>
        {message}
      </Text>
    </View>
  );
}

function AuthPreview({
  mode,
  tuning,
  onModeChange,
  onTuningChange,
  onResetTuning,
}: {
  mode: AuthMode;
  tuning: MotionTuning;
  onModeChange: (mode: AuthMode) => void;
  onTuningChange: (tuning: MotionTuning) => void;
  onResetTuning: () => void;
}) {
  const { mode: themeMode, palette, toggleMode } = useTheme();
  const copy = getModeCopy(mode);
  const fields = useMemo(() => getFieldConfigs(mode), [mode]);
  const [values, setValues] = useState<AuthValues>(emptyValues);
  const [attempted, setAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [flowStage, setFlowStage] = useState<MockFlowStage>("idle");
  const [flowMessage, setFlowMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [shakeKey, setShakeKey] = useState(0);
  const [showPrototypeSettings, setShowPrototypeSettings] = useState(false);
  const submitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSubmitTimer = () => {
    if (submitTimer.current) {
      clearTimeout(submitTimer.current);
      submitTimer.current = null;
    }
  };

  useEffect(() => {
    setAttempted(false);
    setIsSubmitting(false);
    setSuccessMessage(null);
    setFlowStage("idle");
    setFlowMessage(null);
    setFieldErrors({});
    setShakeKey(0);
    setValues(emptyValues);
    clearSubmitTimer();
  }, [mode]);

  useEffect(
    () => () => {
      if (submitTimer.current) {
        clearTimeout(submitTimer.current);
      }
    },
    [],
  );

  const activeFieldsValid = fields.every((field) =>
    isFieldValid(field.id, values),
  );

  const updateField = (fieldId: AuthFieldId, nextValue: string) => {
    setValues((current) => ({ ...current, [fieldId]: nextValue }));
    setSuccessMessage(null);
    setFlowMessage(null);
    setFlowStage("idle");
    setFieldErrors((current) => {
      if (!current[fieldId]) {
        return current;
      }

      const { [fieldId]: _removed, ...rest } = current;
      return rest;
    });
  };

  const getMoodState = (fieldId: AuthFieldId): MoodState => {
    if (isSubmitting) {
      return "submitting";
    }

    const value = values[fieldId];
    const isValid = isFieldValid(fieldId, values);

    if (fieldErrors[fieldId]) {
      return "frown";
    }

    if (isValid) {
      return "smile";
    }

    if (attempted || value.length > 0) {
      return "frown";
    }

    return "straight";
  };

  const getHelper = (field: FieldConfig, state: MoodState) => {
    if (fieldErrors[field.id]) {
      return fieldErrors[field.id];
    }

    if (state === "frown") {
      return getFieldError(field.id);
    }

    if (state === "submitting") {
      return "Checking…";
    }

    return field.helper;
  };

  const handleSubmit = () => {
    if (isSubmitting) {
      return;
    }

    setAttempted(true);
    setSuccessMessage(null);
    setFlowMessage(null);
    setFieldErrors({});

    if (!activeFieldsValid) {
      setFlowStage("localError");
      setFlowMessage("Fix the red fields first.");
      setShakeKey((current) => current + 1);
      return;
    }

    clearSubmitTimer();
    setIsSubmitting(true);
    setFlowStage("requesting");
    setFlowMessage("Checking…");
    submitTimer.current = setTimeout(() => {
      const result = getMockFlowResult(mode, values);
      setIsSubmitting(false);
      setFlowMessage(result.message);

      if (result.ok) {
        setFlowStage("success");
        setSuccessMessage(result.message);
        return;
      }

      setFlowStage("serverError");
      setFieldErrors(result.fieldErrors ?? {});
      setShakeKey((current) => current + 1);
    }, 860);
  };

  const fillValidDemo = () => {
    setValues(getSampleValues(mode));
    setAttempted(false);
    setSuccessMessage(null);
    setFlowStage("idle");
    setFlowMessage(null);
    setFieldErrors({});
    setIsSubmitting(false);
    clearSubmitTimer();
  };

  const triggerErrorDemo = () => {
    setValues(getErrorSampleValues(mode));
    setAttempted(true);
    setSuccessMessage(null);
    setFlowStage("localError");
    setFlowMessage("Demo local error loaded.");
    setFieldErrors({});
    setIsSubmitting(false);
    clearSubmitTimer();
    setShakeKey((current) => current + 1);
  };

  const fillServerCaseDemo = () => {
    setValues(getServerCaseValues(mode));
    setAttempted(false);
    setSuccessMessage(null);
    setFlowStage("idle");
    setFlowMessage(
      mode === "reset"
        ? "Reset uses neutral success copy. Press submit to test it."
        : "Server-case values loaded. Press submit to test it.",
    );
    setFieldErrors({});
    setIsSubmitting(false);
    clearSubmitTimer();
  };

  const resetDemo = () => {
    setValues(emptyValues);
    setAttempted(false);
    setSuccessMessage(null);
    setFlowStage("idle");
    setFlowMessage(null);
    setFieldErrors({});
    setIsSubmitting(false);
    clearSubmitTimer();
    setShakeKey(0);
  };

  const statusMessage = flowMessage ?? successMessage;

  return (
    <View
      style={[
        styles.phoneFrame,
        { backgroundColor: palette.background, borderColor: palette.border },
      ]}
    >
      <View style={styles.previewTopRow}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.backPill,
            {
              borderColor: palette.border,
              backgroundColor: palette.surfaceAlt,
            },
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={[styles.backPillText, { color: palette.text }]}>
            ‹ Labs
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setShowPrototypeSettings((current) => !current)}
          accessibilityRole="button"
          accessibilityState={{ expanded: showPrototypeSettings }}
          accessibilityLabel="Toggle prototype settings"
          style={({ pressed }) => [
            styles.settingsPill,
            {
              borderColor: showPrototypeSettings ? "#35E6C6" : palette.border,
              backgroundColor: showPrototypeSettings
                ? "rgba(53,230,198,0.14)"
                : palette.surfaceAlt,
            },
            pressed ? styles.pressed : null,
          ]}
        >
          <Text
            style={[
              styles.settingsPillText,
              {
                color: showPrototypeSettings
                  ? themeMode === "light"
                    ? "#0F766E"
                    : "#B8FFF1"
                  : palette.text,
              },
            ]}
          >
            {showPrototypeSettings ? "Close" : "⚙"}
          </Text>
        </Pressable>
      </View>

      <View
        style={[styles.tradeBadge, { borderColor: "rgba(130,80,255,0.65)" }]}
      >
        <Text style={styles.tradeBadgeText}>TRADE</Text>
      </View>

      <Text style={[styles.previewTitle, { color: palette.text }]}>
        {copy.title}
      </Text>
      <Text style={[styles.previewSubtitle, { color: palette.muted }]}>
        {copy.subtitle}
      </Text>

      <ModeTabs activeMode={mode} onChange={onModeChange} />

      {showPrototypeSettings ? (
        <View
          style={[
            styles.prototypeSettingsPanel,
            {
              backgroundColor: palette.surfaceAlt,
              borderColor: palette.border,
            },
          ]}
        >
          <View style={styles.prototypeSettingsHeader}>
            <View style={styles.prototypeSettingsCopy}>
              <Text
                style={[styles.prototypeSettingsTitle, { color: palette.text }]}
              >
                Prototype settings
              </Text>
              <Text
                style={[
                  styles.prototypeSettingsSubtitle,
                  { color: palette.muted },
                ]}
              >
                Hidden lab controls; close this panel for the clean auth view.
              </Text>
            </View>
            <Pressable
              onPress={toggleMode}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.demoButton,
                { borderColor: palette.border, flexGrow: 0 },
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={[styles.demoButtonText, { color: palette.text }]}>
                {themeMode === "dark" ? "Light" : "Dark"}
              </Text>
            </Pressable>
          </View>

          <AuthMotionTuningPanel
            tuning={tuning}
            onChange={onTuningChange}
            onReset={onResetTuning}
          />

          <View style={styles.demoControls}>
            <Pressable
              onPress={fillValidDemo}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.demoButton,
                { borderColor: palette.border },
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={[styles.demoButtonText, { color: palette.text }]}>
                Fill valid
              </Text>
            </Pressable>
            <Pressable
              onPress={triggerErrorDemo}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.demoButton,
                { borderColor: palette.border },
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={[styles.demoButtonText, { color: palette.text }]}>
                Trigger error
              </Text>
            </Pressable>
            <Pressable
              onPress={fillServerCaseDemo}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.demoButton,
                { borderColor: palette.border },
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={[styles.demoButtonText, { color: palette.text }]}>
                Server case
              </Text>
            </Pressable>
            <Pressable
              onPress={resetDemo}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.demoButton,
                { borderColor: palette.border },
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={[styles.demoButtonText, { color: palette.text }]}>
                Reset
              </Text>
            </Pressable>
          </View>

          <AuthMockFlowPanel
            mode={mode}
            stage={flowStage}
            message={flowMessage}
            fieldErrors={fieldErrors}
          />
        </View>
      ) : null}

      <View
        style={[
          styles.previewFields,
          mode === "register" ? styles.previewFieldsCompact : null,
        ]}
      >
        {fields.map((field) => {
          const state = getMoodState(field.id);
          return (
            <AuthMoodInput
              key={`${mode}-${field.id}`}
              field={field}
              value={values[field.id]}
              state={state}
              helper={getHelper(field, state)}
              shakeKey={shakeKey}
              tuning={tuning}
              compact={mode === "register"}
              onChangeText={(nextValue) => updateField(field.id, nextValue)}
            />
          );
        })}
      </View>

      <AuthInlineStatus stage={flowStage} message={statusMessage} />

      <Pressable
        onPress={handleSubmit}
        accessibilityRole="button"
        accessibilityState={{ disabled: isSubmitting }}
        style={({ pressed }) => [
          styles.primaryButton,
          { backgroundColor: isSubmitting ? "#FFB74D" : palette.text },
          pressed && !isSubmitting ? styles.pressed : null,
        ]}
      >
        <Text
          style={[
            styles.primaryButtonText,
            { color: isSubmitting ? "#1B1001" : palette.background },
          ]}
        >
          {isSubmitting ? "Checking…" : copy.button}
        </Text>
      </Pressable>

      <View
        style={[
          styles.noticeBox,
          {
            borderColor:
              themeMode === "light"
                ? "rgba(35,151,190,0.4)"
                : "rgba(44,229,255,0.45)",
            backgroundColor:
              themeMode === "light" ? "#E8F7FF" : "rgba(0,150,220,0.18)",
          },
        ]}
      >
        <Text
          style={[
            styles.noticeText,
            { color: themeMode === "light" ? "#0A415A" : "#BFEFFF" },
          ]}
        >
          Google sign-in is disabled for the first launch. Please use email
          login or create an account with email for now.
        </Text>
      </View>
    </View>
  );
}

function MotionStateCard({
  title,
  description,
  line,
  state,
}: (typeof stateCards)[number]) {
  const { palette } = useTheme();

  return (
    <View
      style={[
        styles.stateCard,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
    >
      <View style={styles.stateCardTopRow}>
        <Text style={[styles.stateTitle, { color: palette.text }]}>
          {title}
        </Text>
        <Text
          style={[
            styles.stateBadge,
            {
              color:
                state === "frown"
                  ? palette.danger
                  : state === "smile"
                    ? "#35E6C6"
                    : palette.muted,
            },
          ]}
        >
          {state.toUpperCase()}
        </Text>
      </View>
      <Text style={[styles.stateLine, { color: palette.text }]}>{line}</Text>
      <Text style={[styles.stateDescription, { color: palette.muted }]}>
        {description}
      </Text>
    </View>
  );
}

export function AuthMotionLabScreen() {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeMode, setActiveMode] = useState<AuthMode>("login");
  const [motionTuning, setMotionTuning] =
    useState<MotionTuning>(defaultMotionTuning);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      style={[styles.screen, { backgroundColor: palette.background }]}
    >
      <Stack.Screen
        options={{ title: "Auth Motion Lab", headerShown: false }}
      />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 140 },
        ]}
      >
        <AuthPreview
          mode={activeMode}
          tuning={motionTuning}
          onModeChange={setActiveMode}
          onTuningChange={setMotionTuning}
          onResetTuning={() => setMotionTuning(defaultMotionTuning)}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    borderBottomWidth: 1,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  headerButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  headerButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.9,
  },
  title: {
    marginTop: 8,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900",
    letterSpacing: -0.5,
    maxWidth: 820,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 820,
  },
  content: {
    paddingHorizontal: 16,
    gap: 16,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
  },
  sectionHeader: {
    gap: 6,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  sectionText: {
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 720,
  },
  tabs: {
    flexDirection: "row",
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    minHeight: 42,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "900",
  },
  tuningPanel: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    gap: 14,
  },
  tuningHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  tuningHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  tuningTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  tuningIntro: {
    fontSize: 12,
    lineHeight: 17,
  },
  resetTuningButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  resetTuningText: {
    fontSize: 12,
    fontWeight: "900",
  },
  tuningGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tuningGroup: {
    flexGrow: 1,
    flexBasis: 210,
    gap: 7,
  },
  tuningLabel: {
    fontSize: 12,
    fontWeight: "900",
  },
  tuningSegment: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 999,
    padding: 3,
    gap: 3,
  },
  tuningSegmentButton: {
    flex: 1,
    minHeight: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  tuningSegmentText: {
    fontSize: 11,
    fontWeight: "900",
  },
  tuningToggleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tuningToggle: {
    flexGrow: 1,
    flexBasis: 260,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  tuningToggleCopy: {
    flex: 1,
    gap: 3,
  },
  tuningToggleDescription: {
    fontSize: 11,
    lineHeight: 15,
  },
  switchTrack: {
    width: 44,
    height: 26,
    borderRadius: 999,
    borderWidth: 1,
    padding: 3,
    justifyContent: "center",
  },
  switchThumb: {
    width: 18,
    height: 18,
    borderRadius: 999,
  },
  phoneFrame: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 18,
    gap: 14,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "ios" ? 0.2 : 0,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 2,
  },
  previewTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  backPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  backPillText: {
    fontSize: 13,
    fontWeight: "900",
  },
  settingsPill: {
    minWidth: 44,
    minHeight: 38,
    borderWidth: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 13,
  },
  settingsPillText: {
    fontSize: 13,
    fontWeight: "900",
  },
  tradeBadge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: "rgba(120,72,255,0.22)",
  },
  tradeBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.9,
  },
  previewTitle: {
    fontSize: 34,
    lineHeight: 39,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  previewSubtitle: {
    marginTop: -8,
    fontSize: 15,
    lineHeight: 22,
  },
  prototypeSettingsPanel: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 12,
    gap: 12,
  },
  prototypeSettingsHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  prototypeSettingsCopy: {
    flex: 1,
    gap: 3,
  },
  prototypeSettingsTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  prototypeSettingsSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  previewFields: {
    gap: 12,
  },
  previewFieldsCompact: {
    gap: 9,
  },
  fieldBlock: {
    gap: 6,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "900",
  },
  fieldStateText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  inputShell: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 14,
    position: "relative",
    overflow: "hidden",
    borderRadius: 18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  inputFill: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 18,
    borderWidth: 1,
  },
  ribbonInputFill: {
    position: "absolute",
    left: 0,
    right: 0,
    borderRadius: 999,
    borderWidth: 1,
  },
  smoothRibbonLayer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: "visible",
    zIndex: 1,
  },
  nativeSmoothRibbonFallback: {
    position: "absolute",
    top: 9,
    right: 0,
    left: 0,
    height: 36,
    borderRadius: 999,
  },
  nativeSmoothRibbonText: {
    position: "absolute",
    top: 15,
    right: 18,
    left: 18,
    color: "#050505",
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  inputCurveField: {
    position: "absolute",
    borderRadius: 999,
  },
  inputMoodWave: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1.5,
    opacity: 0,
  },
  inputSmileWave: {
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
  },
  inputFrownWave: {
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
  },
  textInput: {
    minHeight: 46,
    paddingVertical: 0,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    zIndex: 2,
  },
  ribbonTextInput: {
    minHeight: 0,
    height: "100%",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "900",
    letterSpacing: 0.15,
    textAlign: "center",
  },
  curvedTextLayer: {
    position: "absolute",
    top: 6,
    right: 14,
    bottom: 6,
    left: 14,
    zIndex: 3,
    justifyContent: "center",
    overflow: "hidden",
  },
  ribbonTextLayer: {
    top: 0,
    right: 18,
    bottom: 0,
    left: 18,
  },
  curvedTextRow: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  curvedTextChar: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "900",
    letterSpacing: 0.15,
  },
  webTextInput: {
    outlineStyle: "none",
  } as any,
  helper: {
    fontSize: 12,
    lineHeight: 16,
  },
  flowBox: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 13,
    gap: 10,
  },
  flowTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  flowTitle: {
    fontSize: 13,
    fontWeight: "900",
  },
  flowBadge: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  flowDescription: {
    fontSize: 12,
    lineHeight: 17,
  },
  flowSeed: {
    marginTop: -2,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
  },
  flowStepList: {
    gap: 8,
  },
  flowStepItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  flowStepDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  flowStepText: {
    fontSize: 12,
    fontWeight: "800",
  },
  flowMessage: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 11,
    gap: 5,
  },
  flowMessageText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
  },
  flowMessageHint: {
    fontSize: 11,
    lineHeight: 15,
  },
  authStatusBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  authStatusText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
  },
  successBox: {
    borderWidth: 1,
    borderColor: "rgba(53,230,198,0.5)",
    borderRadius: 16,
    padding: 13,
    backgroundColor: "rgba(53,230,198,0.12)",
  },
  successText: {
    color: "#B8FFF1",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "900",
  },
  demoControls: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  demoButton: {
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 12,
  },
  demoButtonText: {
    fontSize: 12,
    fontWeight: "900",
  },
  noticeBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800",
  },
  stateGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  stateCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 9,
    flexGrow: 1,
    flexBasis: 220,
  },
  stateCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  stateTitle: {
    fontSize: 14,
    fontWeight: "900",
    flex: 1,
  },
  stateBadge: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  stateLine: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "900",
    fontFamily: Platform.select({
      web: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
      default: undefined,
    }),
  },
  stateDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.72,
  },
});

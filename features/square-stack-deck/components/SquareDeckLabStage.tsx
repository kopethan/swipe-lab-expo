import React, { memo, useCallback, useState } from "react";
import { type LayoutChangeEvent, StyleSheet, Text, type StyleProp, View, type ViewStyle } from "react-native";

import { useTheme } from "@/providers/ThemeProvider";

import { ContinuousSquareStackDeck } from "./ContinuousSquareStackDeck";
import { HelloWhenPlaceCardDemo } from "./HelloWhenPlaceCardDemo";
import type { DemoSquareCard } from "../demoPlaceCards";
import type { SquareStackDeckProps } from "../squareStackDeck.types";

type Props = {
  cards: DemoSquareCard[];
  title?: string;
  description?: string;
  footer?: string;
  containerStyle?: StyleProp<ViewStyle>;
  stageStyle?: StyleProp<ViewStyle>;
  minCardSize?: number;
  maxCardSize?: number;
  renderWindow?: SquareStackDeckProps<DemoSquareCard>["renderWindow"];
  showDebugBadge?: boolean;
  depthEffect?: SquareStackDeckProps<DemoSquareCard>["depthEffect"];
};

function SquareDeckLabStageInner({
  cards,
  title,
  description,
  footer,
  containerStyle,
  stageStyle,
  minCardSize,
  maxCardSize,
  renderWindow = "all",
  showDebugBadge = false,
  depthEffect = "motionOnly",
}: Props) {
  const { palette } = useTheme();
  const [activeLabel, setActiveLabel] = useState(cards[0]?.id ?? "—");
  const [stageBounds, setStageBounds] = useState({ width: 0, height: 0 });

  const handleStageLayout = useCallback((event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    setStageBounds((current) => {
      const nextWidth = Math.round(width);
      const nextHeight = Math.round(height);
      if (Math.abs(current.width - nextWidth) < 1 && Math.abs(current.height - nextHeight) < 1) {
        return current;
      }

      return { width: nextWidth, height: nextHeight };
    });
  }, []);

  return (
    <View style={[styles.wrap, containerStyle]}>
      {title || description ? (
        <View style={styles.copy}>
          {title ? <Text style={[styles.title, { color: palette.text }]}>{title}</Text> : null}
          {description ? <Text style={[styles.description, { color: palette.muted }]}>{description}</Text> : null}
          <Text style={[styles.meta, { color: palette.muted }]}>Active: {activeLabel}</Text>
        </View>
      ) : null}

      <View style={[styles.stage, stageStyle]} onLayout={handleStageLayout}>
        <ContinuousSquareStackDeck
          cards={cards}
          availableWidth={stageBounds.width}
          availableHeight={stageBounds.height}
          minCardSize={minCardSize}
          maxCardSize={maxCardSize}
          renderWindow={renderWindow}
          showDebugBadge={showDebugBadge}
          depthEffect={depthEffect}
          onIndexChange={(_, card) => setActiveLabel(card.id)}
          renderCard={({ card, index, total }) => <HelloWhenPlaceCardDemo card={card} index={index} total={total} />}
        />
      </View>

      {footer ? <Text style={[styles.footer, { color: palette.muted }]}>{footer}</Text> : null}
    </View>
  );
}

export const SquareDeckLabStage = memo(SquareDeckLabStageInner);

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  copy: {
    paddingHorizontal: 18,
    gap: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  meta: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  stage: {
    minHeight: 420,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    paddingHorizontal: 18,
  },
  footer: {
    paddingHorizontal: 18,
    fontSize: 11,
    lineHeight: 15,
  },
});

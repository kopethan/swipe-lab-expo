import { Stack, router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/providers/ThemeProvider";

import { chainLabScenario } from "./chainLab.mockData";
import type { ChainParticipant, ChainParticipantId } from "./chainLab.types";

type Point = {
  x: number;
  y: number;
};

type NodePlacement = Point & {
  participant: ChainParticipant;
};

type ChainStage = "suggested" | "waiting" | "ready" | "active" | "dismissed";

type ChainStageConfig = {
  label: string;
  progressLabel: string;
  title: string;
  description: string;
  centerLabel: string;
  hint: string;
};

const CHAIN_STAGE_CONFIG: Record<ChainStage, ChainStageConfig> = {
  suggested: {
    label: "Suggested",
    progressLabel: "0/3 interested",
    title: "Review the chain",
    description: "Nothing starts yet. First check what you receive, what you give, and who is linked to you.",
    centerLabel: "match",
    hint: chainLabScenario.helperText,
  },
  waiting: {
    label: "Waiting",
    progressLabel: "2/3 interested",
    title: "Waiting for Alex",
    description: "You and Sara are interested. Alex still needs to review their role before this can move forward.",
    centerLabel: "wait",
    hint: "Tap each person to see what they would receive and give.",
  },
  ready: {
    label: "Ready",
    progressLabel: "3/3 interested",
    title: "Everyone is interested",
    description: "All three people like the chain. The next step would turn this suggestion into a Chain Deal workspace.",
    centerLabel: "ready",
    hint: "Everyone has reviewed the loop. You can still inspect each role.",
  },
  active: {
    label: "Active Chain Deal",
    progressLabel: "3/3 confirmed",
    title: "Chain Deal active",
    description: "The chain is now a shared deal workspace. People can coordinate, submit progress, and complete safely.",
    centerLabel: "deal",
    hint: "Tap a person to review their active deal role.",
  },
  dismissed: {
    label: "Dismissed",
    progressLabel: "Not for me",
    title: "Suggestion dismissed",
    description: "In the real app, this chain match would leave your suggestions. In the lab, you can bring it back.",
    centerLabel: "skip",
    hint: "This state previews the declined suggestion experience.",
  },
};

function getConfirmedParticipantIds(stage: ChainStage): ChainParticipantId[] {
  if (stage === "waiting") {
    return [chainLabScenario.currentUserId, "sara"];
  }

  if (stage === "ready" || stage === "active") {
    return [...chainLabScenario.order];
  }

  return [];
}

const AVATAR_SIZE = 68;
const AVATAR_SIZE_COMPACT = 62;
const NODE_TOUCH_WIDTH = 104;

function getParticipant(participantId: ChainParticipantId) {
  const participant = chainLabScenario.participants.find((item) => item.id === participantId);

  if (!participant) {
    throw new Error(`Missing chain participant: ${participantId}`);
  }

  return participant;
}

function getDisplayName(participant: ChainParticipant) {
  return participant.id === chainLabScenario.currentUserId ? "You" : participant.name;
}

function ScreenBackdrop() {
  const { palette } = useTheme();

  return (
    <View pointerEvents="none" style={styles.screenBackdrop}>
      <View
        style={[
          styles.ambientOrb,
          styles.ambientOrbTop,
          { borderColor: palette.border, backgroundColor: palette.surfaceAlt },
        ]}
      />
      <View
        style={[
          styles.ambientOrb,
          styles.ambientOrbBottom,
          { borderColor: palette.border, backgroundColor: palette.surface },
        ]}
      />
      <View
        style={[
          styles.ambientLine,
          styles.ambientLineTop,
          { borderColor: palette.border },
        ]}
      />
      <View
        style={[
          styles.ambientLine,
          styles.ambientLineBottom,
          { borderColor: palette.border },
        ]}
      />
    </View>
  );
}

function ScreenHeader({
  optionsOpen,
  statusLine,
  onToggleOptions,
}: {
  optionsOpen: boolean;
  statusLine: string;
  onToggleOptions: () => void;
}) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        { borderBottomColor: palette.border, paddingTop: insets.top + 10 },
      ]}
    >
      <View style={styles.headerCompactRow}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          style={({ pressed }) => [styles.textButton, pressed ? styles.pressed : null]}
        >
          <Text style={[styles.textButtonLabel, { color: palette.text }]}>{"< Labs"}</Text>
        </Pressable>

        <View style={styles.headerTitleBlock}>
          <Text style={[styles.headerTitle, { color: palette.text }]}>{chainLabScenario.title}</Text>
          <Text style={[styles.headerMeta, { color: palette.muted }]}>{statusLine}</Text>
        </View>

        <Pressable
          onPress={onToggleOptions}
          accessibilityRole="button"
          accessibilityLabel={optionsOpen ? "Hide lab options" : "Show lab options"}
          style={({ pressed }) => [
            styles.iconButton,
            {
              borderColor: palette.border,
              backgroundColor: optionsOpen ? palette.surfaceAlt : palette.surface,
            },
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={[styles.iconButtonText, { color: palette.text }]}>•••</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ConnectionLine({
  from,
  to,
  active,
  color,
  mutedColor,
}: {
  from: Point;
  to: Point;
  active: boolean;
  color: string;
  mutedColor: string;
}) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  const startOffset = AVATAR_SIZE * 0.58;
  const endOffset = AVATAR_SIZE * 0.62;
  const visibleLength = Math.max(0, length - startOffset - endOffset);
  const centerX = from.x + Math.cos(angle) * (startOffset + visibleLength / 2);
  const centerY = from.y + Math.sin(angle) * (startOffset + visibleLength / 2);
  const arrowX = from.x + Math.cos(angle) * (startOffset + visibleLength * 0.78);
  const arrowY = from.y + Math.sin(angle) * (startOffset + visibleLength * 0.78);
  const lineColor = active ? color : mutedColor;

  return (
    <>
      {active ? (
        <View
          pointerEvents="none"
          style={[
            styles.connectionLineGlow,
            {
              left: centerX - visibleLength / 2 - 8,
              top: centerY - 3,
              width: visibleLength + 16,
              backgroundColor: color,
              transform: [{ rotate: `${angle}rad` }],
            },
          ]}
        />
      ) : null}
      <View
        pointerEvents="none"
        style={[
          styles.connectionLine,
          active ? styles.connectionLineActive : null,
          {
            left: centerX - visibleLength / 2,
            top: centerY,
            width: visibleLength,
            backgroundColor: lineColor,
            opacity: active ? 0.95 : 0.36,
            transform: [{ rotate: `${angle}rad` }],
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.connectionArrow,
          active ? styles.connectionArrowActive : null,
          {
            left: arrowX - 12,
            top: arrowY - 12,
            borderColor: lineColor,
            backgroundColor: active ? color : mutedColor,
            opacity: active ? 1 : 0.5,
            transform: [{ rotate: `${angle}rad` }],
          },
        ]}
      >
        <Text style={[styles.connectionArrowText, { color: active ? "#ffffff" : color }]}>›</Text>
      </View>
    </>
  );
}

function ParticipantNode({
  placement,
  selected,
  currentUser,
  joined,
  onPress,
}: {
  placement: NodePlacement;
  selected: boolean;
  currentUser: boolean;
  joined: boolean;
  onPress: () => void;
}) {
  const { palette } = useTheme();
  const avatarSize = currentUser ? AVATAR_SIZE : AVATAR_SIZE_COMPACT;
  const participant = placement.participant;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Show ${participant.name} in the chain`}
      style={({ pressed }) => [
        styles.node,
        {
          left: placement.x - NODE_TOUCH_WIDTH / 2,
          top: placement.y - avatarSize / 2 - 4,
          width: NODE_TOUCH_WIDTH,
        },
        pressed ? styles.nodePressed : null,
      ]}
    >
      <View style={[styles.avatarStack, { width: avatarSize + 32, height: avatarSize + 32 }]}>
        {selected ? (
          <View
            pointerEvents="none"
            style={[
              styles.selectedHalo,
              {
                width: avatarSize + 18,
                height: avatarSize + 18,
                borderRadius: (avatarSize + 18) / 2,
                backgroundColor: palette.text,
                left: 7,
                top: 7,
              },
            ]}
          />
        ) : null}
        {currentUser ? (
          <View
            pointerEvents="none"
            style={[
              styles.currentUserHalo,
              {
                width: avatarSize + 30,
                height: avatarSize + 30,
                borderRadius: (avatarSize + 30) / 2,
                borderColor: palette.border,
                left: 1,
                top: 1,
              },
            ]}
          />
        ) : null}
        <View
          style={[
            styles.avatarBubble,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
              borderColor: selected ? palette.background : currentUser ? palette.text : palette.border,
              backgroundColor: selected ? palette.text : palette.surface,
            },
            currentUser ? styles.currentUserAvatar : null,
          ]}
        >
          <Text style={[styles.nodeInitials, { color: selected ? palette.background : palette.text }]}>
            {participant.initials}
          </Text>
        </View>
        {joined ? (
          <View
            style={[
              styles.joinedDot,
              {
                borderColor: selected ? palette.text : palette.surface,
                backgroundColor: palette.text,
                bottom: 9,
                right: 9,
              },
            ]}
          >
            <Text style={[styles.joinedDotText, { color: palette.background }]}>✓</Text>
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.nodeNamePill,
          {
            borderColor: selected ? palette.text : palette.border,
            backgroundColor: selected ? palette.text : palette.surface,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[styles.nodeName, { color: selected ? palette.background : palette.text }]}
        >
          {currentUser ? "You" : participant.name}
        </Text>
      </View>
    </Pressable>
  );
}

function ChainCircle({
  selectedId,
  confirmedIds,
  centerLabel,
  onSelect,
}: {
  selectedId: ChainParticipantId;
  confirmedIds: ChainParticipantId[];
  centerLabel: string;
  onSelect: (participantId: ChainParticipantId) => void;
}) {
  const { palette } = useTheme();
  const { width } = useWindowDimensions();
  const diagramSize = Math.min(Math.max(width - 40, 280), 380);
  const radius = diagramSize * 0.32;
  const center = diagramSize / 2;

  const placements = useMemo<NodePlacement[]>(() => {
    return chainLabScenario.order.map((participantId, index) => {
      const angle = -Math.PI / 2 + index * ((Math.PI * 2) / chainLabScenario.order.length);
      const participant = getParticipant(participantId);

      return {
        participant,
        x: center + Math.cos(angle) * radius,
        y: center + Math.sin(angle) * radius,
      };
    });
  }, [center, radius]);

  const sparkles = useMemo(() => {
    return [-0.78, 0.26, 1.48, 2.72].map((turn, index) => {
      const angle = turn * Math.PI;
      const sparkleRadius = radius + (index % 2 === 0 ? 50 : 34);

      return {
        id: `sparkle-${index}`,
        size: index % 2 === 0 ? 8 : 5,
        x: center + Math.cos(angle) * sparkleRadius,
        y: center + Math.sin(angle) * sparkleRadius,
      };
    });
  }, [center, radius]);

  return (
    <View style={[styles.circleWrap, { width: diagramSize, height: diagramSize }]}>
      <View
        pointerEvents="none"
        style={[
          styles.orbitAuraOuter,
          {
            left: center - radius - 58,
            top: center - radius - 58,
            width: radius * 2 + 116,
            height: radius * 2 + 116,
            borderRadius: radius + 58,
            borderColor: palette.border,
            backgroundColor: palette.surfaceAlt,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.orbitAuraInner,
          {
            left: center - radius - 40,
            top: center - radius - 40,
            width: radius * 2 + 80,
            height: radius * 2 + 80,
            borderRadius: radius + 40,
            borderColor: palette.border,
          },
        ]}
      />
      {sparkles.map((sparkle) => (
        <View
          key={sparkle.id}
          pointerEvents="none"
          style={[
            styles.orbitSparkle,
            {
              left: sparkle.x - sparkle.size / 2,
              top: sparkle.y - sparkle.size / 2,
              width: sparkle.size,
              height: sparkle.size,
              borderRadius: sparkle.size / 2,
              backgroundColor: palette.text,
            },
          ]}
        />
      ))}
      <View
        pointerEvents="none"
        style={[
          styles.orbitGlow,
          {
            left: center - radius - 28,
            top: center - radius - 28,
            width: radius * 2 + 56,
            height: radius * 2 + 56,
            borderRadius: radius + 28,
            backgroundColor: palette.surface,
            borderColor: palette.border,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.circleGhost,
          {
            left: center - radius,
            top: center - radius,
            width: radius * 2,
            height: radius * 2,
            borderRadius: radius,
            borderColor: palette.border,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.circleGhostInner,
          {
            left: center - radius * 0.62,
            top: center - radius * 0.62,
            width: radius * 1.24,
            height: radius * 1.24,
            borderRadius: radius * 0.62,
            borderColor: palette.border,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[styles.loopCore, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}
      >
        <Text style={[styles.loopCoreIcon, { color: palette.text }]}>↻</Text>
        <Text style={[styles.loopCoreText, { color: palette.muted }]}>{centerLabel}</Text>
      </View>

      {placements.map((placement, index) => {
        const nextPlacement = placements[(index + 1) % placements.length];
        const active =
          placement.participant.id === selectedId || nextPlacement.participant.id === selectedId;

        return (
          <ConnectionLine
            key={`${placement.participant.id}-${nextPlacement.participant.id}`}
            from={placement}
            to={nextPlacement}
            active={active}
            color={palette.text}
            mutedColor={palette.border}
          />
        );
      })}

      {placements.map((placement) => (
        <ParticipantNode
          key={placement.participant.id}
          placement={placement}
          selected={placement.participant.id === selectedId}
          currentUser={placement.participant.id === chainLabScenario.currentUserId}
          joined={confirmedIds.includes(placement.participant.id)}
          onPress={() => onSelect(placement.participant.id)}
        />
      ))}
    </View>
  );
}

function InfoChip({ label }: { label: string }) {
  const { palette } = useTheme();

  return (
    <View style={[styles.infoChip, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
      <Text style={[styles.infoChipText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

function SectionDivider({ inset = false }: { inset?: boolean }) {
  const { palette } = useTheme();

  return (
    <View
      pointerEvents="none"
      style={[
        styles.sectionDivider,
        inset ? styles.sectionDividerInset : null,
        { backgroundColor: palette.border },
      ]}
    />
  );
}

function FlowNode({
  participant,
  selected,
}: {
  participant: ChainParticipant;
  selected?: boolean;
}) {
  const { palette } = useTheme();

  return (
    <View
      style={[
        styles.flowNode,
        {
          borderColor: selected ? palette.text : palette.border,
          backgroundColor: selected ? palette.text : palette.surfaceAlt,
        },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[styles.flowNodeText, { color: selected ? palette.background : palette.text }]}
      >
        {getDisplayName(participant)}
      </Text>
    </View>
  );
}

function RoleFlow({
  participant,
  receivesFrom,
  givesTo,
}: {
  participant: ChainParticipant;
  receivesFrom: ChainParticipant;
  givesTo: ChainParticipant;
}) {
  const { palette } = useTheme();

  return (
    <View style={styles.roleFlow}>
      <Text style={[styles.roleFlowLabel, { color: palette.muted }]}>CHAIN PATH</Text>
      <View style={styles.roleFlowRow}>
        <FlowNode participant={receivesFrom} />
        <Text style={[styles.roleFlowArrow, { color: palette.muted }]}>→</Text>
        <FlowNode participant={participant} selected />
        <Text style={[styles.roleFlowArrow, { color: palette.muted }]}>→</Text>
        <FlowNode participant={givesTo} />
      </View>
    </View>
  );
}

function RoleExchangeBlock({
  kind,
  icon,
  title,
  peerLabel,
  peerName,
}: {
  kind: "Receives" | "Gives";
  icon: string;
  title: string;
  peerLabel: string;
  peerName: string;
}) {
  const { palette } = useTheme();

  return (
    <View style={styles.exchangeBlock}>
      <View
        style={[
          styles.exchangeIcon,
          { borderColor: palette.border, backgroundColor: palette.surfaceAlt },
        ]}
      >
        <Text style={[styles.exchangeIconText, { color: palette.text }]}>{icon}</Text>
      </View>
      <View style={styles.exchangeCopy}>
        <Text style={[styles.exchangeLabel, { color: palette.muted }]}>{kind}</Text>
        <Text style={[styles.exchangeTitle, { color: palette.text }]}>{title}</Text>
        <Text style={[styles.exchangeCaption, { color: palette.muted }]}>
          {peerLabel} <Text style={[styles.exchangePeerName, { color: palette.text }]}>{peerName}</Text>
        </Text>
      </View>
    </View>
  );
}

function MatchFit({ participant }: { participant: ChainParticipant }) {
  const { palette } = useTheme();

  return (
    <View style={styles.matchFitCard}>
      <View style={styles.matchFitHeader}>
        <Text style={[styles.matchFitTitle, { color: palette.text }]}>Match fit</Text>
        <Text style={[styles.matchFitCaption, { color: palette.muted }]}>Why this role may work</Text>
      </View>
      <View style={styles.infoChipsRow}>
        <InfoChip label={participant.timingLabel} />
        <InfoChip label={participant.modeLabel} />
        <InfoChip label={participant.effortLabel} />
      </View>
    </View>
  );
}

function SelectedParticipantCard({ participant }: { participant: ChainParticipant }) {
  const { palette } = useTheme();
  const receivesFrom = getParticipant(participant.receivesFromId);
  const givesTo = getParticipant(participant.givesToId);
  const isCurrentUser = participant.id === chainLabScenario.currentUserId;

  return (
    <View style={styles.detailCard}>
      <View style={styles.detailHeaderRow}>
        <View style={[styles.miniAvatar, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
          <Text style={[styles.miniAvatarText, { color: palette.text }]}>{participant.initials}</Text>
        </View>
        <View style={styles.detailHeaderCopy}>
          <Text style={[styles.detailEyebrow, { color: palette.muted }]}>
            {isCurrentUser ? "Your chain role" : "Selected participant"}
          </Text>
          <Text style={[styles.detailTitle, { color: palette.text }]}>{getDisplayName(participant)}</Text>
          <Text style={[styles.detailSubtitle, { color: palette.muted }]}>{participant.roleLabel}</Text>
        </View>
      </View>

      <SectionDivider />

      <RoleFlow participant={participant} receivesFrom={receivesFrom} givesTo={givesTo} />

      <SectionDivider />

      <View style={styles.exchangeStack}>
        <RoleExchangeBlock
          kind="Receives"
          icon="↓"
          title={participant.needTitle}
          peerLabel="from"
          peerName={getDisplayName(receivesFrom)}
        />
        <SectionDivider inset />
        <RoleExchangeBlock
          kind="Gives"
          icon="↑"
          title={participant.offerTitle}
          peerLabel="to"
          peerName={getDisplayName(givesTo)}
        />
      </View>

      <SectionDivider />

      <MatchFit participant={participant} />
    </View>
  );
}

function ActionFooter({
  stage,
  onPrimaryPress,
  onSecondaryPress,
}: {
  stage: ChainStage;
  onPrimaryPress: () => void;
  onSecondaryPress: () => void;
}) {
  const { palette } = useTheme();

  const primaryLabelByStage: Record<ChainStage, string> = {
    suggested: "I’m interested",
    waiting: "Simulate Alex joining",
    ready: "Start Chain Deal",
    active: "Reset demo",
    dismissed: "Show suggestion again",
  };
  const secondaryLabelByStage: Partial<Record<ChainStage, string>> = {
    suggested: "Not for me",
    waiting: "Reset demo",
    ready: "Reset demo",
  };
  const secondaryLabel = secondaryLabelByStage[stage];

  return (
    <View style={styles.actionStack}>
      <Text style={[styles.actionPrompt, { color: palette.muted }]}>
        {stage === "active" ? "Prototype controls" : "Does this chain work for you?"}
      </Text>
      <View style={styles.actionsRow}>
        <Pressable
          onPress={onPrimaryPress}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.primaryAction,
            { backgroundColor: palette.text },
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={[styles.primaryActionText, { color: palette.background }]}>
            {primaryLabelByStage[stage]}
          </Text>
        </Pressable>
        {secondaryLabel ? (
          <Pressable
            onPress={onSecondaryPress}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.secondaryAction,
              { borderColor: palette.border, backgroundColor: palette.surface },
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={[styles.secondaryActionText, { color: palette.text }]}>{secondaryLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function ChainHint({ text }: { text: string }) {
  const { palette } = useTheme();

  return (
    <View style={[styles.hintPill, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      <Text style={[styles.hintPillText, { color: palette.muted }]}>{text}</Text>
    </View>
  );
}

function ParticipantStatusPill({
  participant,
  confirmed,
}: {
  participant: ChainParticipant;
  confirmed: boolean;
}) {
  const { palette } = useTheme();

  return (
    <View
      style={[
        styles.participantStatusPill,
        {
          borderColor: confirmed ? palette.text : palette.border,
          backgroundColor: confirmed ? palette.text : palette.surfaceAlt,
        },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[styles.participantStatusName, { color: confirmed ? palette.background : palette.text }]}
      >
        {getDisplayName(participant)}
      </Text>
      <Text style={[styles.participantStatusMark, { color: confirmed ? palette.background : palette.muted }]}>
        {confirmed ? "✓" : "…"}
      </Text>
    </View>
  );
}

function ChainStateCard({
  stageConfig,
  confirmedIds,
}: {
  stageConfig: ChainStageConfig;
  confirmedIds: ChainParticipantId[];
}) {
  const { palette } = useTheme();

  return (
    <View style={styles.stateCard}>
      <View style={styles.stateHeaderRow}>
        <View style={styles.stateHeaderCopy}>
          <Text style={[styles.stateEyebrow, { color: palette.muted }]}>{stageConfig.label}</Text>
          <Text style={[styles.stateTitle, { color: palette.text }]}>{stageConfig.title}</Text>
        </View>
        <View style={[styles.stateProgressPill, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
          <Text style={[styles.stateProgressText, { color: palette.text }]}>{stageConfig.progressLabel}</Text>
        </View>
      </View>

      <Text style={[styles.stateDescription, { color: palette.muted }]}>{stageConfig.description}</Text>

      <SectionDivider />

      <View style={styles.participantStatusRow}>
        {chainLabScenario.order.map((participantId) => {
          const participant = getParticipant(participantId);

          return (
            <ParticipantStatusPill
              key={participant.id}
              participant={participant}
              confirmed={confirmedIds.includes(participant.id)}
            />
          );
        })}
      </View>
    </View>
  );
}

function LabOptionsPanel() {
  const { mode, palette, toggleMode } = useTheme();

  return (
    <View style={[styles.optionsPanel, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      <View style={styles.optionsHeaderRow}>
        <View>
          <Text style={[styles.optionsEyebrow, { color: palette.muted }]}>LAB SETTINGS</Text>
          <Text style={[styles.optionsTitle, { color: palette.text }]}>Prototype notes</Text>
        </View>
        <Pressable
          onPress={toggleMode}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.themeToggle,
            { borderColor: palette.border, backgroundColor: palette.surfaceAlt },
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={[styles.themeToggleText, { color: palette.text }]}> 
            {mode === "dark" ? "Light mode" : "Dark mode"}
          </Text>
        </Pressable>
      </View>

      <View style={[styles.optionsDivider, { backgroundColor: palette.border }]} />

      <View style={styles.optionsSection}>
        <Text style={[styles.optionsSectionTitle, { color: palette.text }]}>Page content rule</Text>
        <Text style={[styles.optionsText, { color: palette.muted }]}>
          Keep the real Chain Match page focused on the circle, selected person card, and actions.
          Lab-only information stays here behind the menu.
        </Text>
      </View>

      <View style={styles.optionsSection}>
        <Text style={[styles.optionsSectionTitle, { color: palette.text }]}>Design note</Text>
        <Text style={[styles.optionsText, { color: palette.muted }]}>
          Circle = relationship map. The card below = selected person details. This keeps the chain
          visual on mobile without crowding the diagram.
        </Text>
      </View>
    </View>
  );
}

export function ChainLabScreen() {
  const { palette } = useTheme();
  const { width } = useWindowDimensions();
  const [selectedId, setSelectedId] = useState<ChainParticipantId>(chainLabScenario.currentUserId);
  const [chainStage, setChainStage] = useState<ChainStage>("suggested");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const selectedParticipant = getParticipant(selectedId);
  const stageConfig = CHAIN_STAGE_CONFIG[chainStage];
  const confirmedIds = useMemo(() => getConfirmedParticipantIds(chainStage), [chainStage]);
  const isDesktop = Platform.OS === "web" && width >= 820;

  function handlePrimaryAction() {
    if (chainStage === "suggested") {
      setChainStage("waiting");
      return;
    }

    if (chainStage === "waiting") {
      setChainStage("ready");
      return;
    }

    if (chainStage === "ready") {
      setChainStage("active");
      return;
    }

    setChainStage("suggested");
  }

  function handleSecondaryAction() {
    if (chainStage === "suggested") {
      setChainStage("dismissed");
      return;
    }

    setChainStage("suggested");
  }

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <Stack.Screen options={{ title: "Chain Match Lab", headerShown: false }} />
      <ScreenBackdrop />
      <ScreenHeader
        optionsOpen={optionsOpen}
        statusLine={`${stageConfig.label} · ${stageConfig.progressLabel}`}
        onToggleOptions={() => setOptionsOpen((open) => !open)}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, isDesktop ? styles.contentDesktop : null]}
      >
        {optionsOpen ? <LabOptionsPanel /> : null}

        <View style={[styles.labPanel, isDesktop ? styles.labPanelDesktop : null]}>
          <View style={[styles.mapPane, isDesktop ? styles.mapPaneDesktop : null]}>
            <View pointerEvents="none" style={[styles.mapPaneGlow, { backgroundColor: palette.surfaceAlt }]} />
            <ChainCircle
              selectedId={selectedId}
              confirmedIds={confirmedIds}
              centerLabel={stageConfig.centerLabel}
              onSelect={setSelectedId}
            />
            <ChainHint text={stageConfig.hint} />
          </View>

          <View style={[styles.detailsPane, isDesktop ? styles.detailsPaneDesktop : null]}>
            <ChainStateCard stageConfig={stageConfig} confirmedIds={confirmedIds} />
            <SectionDivider />
            <SelectedParticipantCard participant={selectedParticipant} />
            <SectionDivider />
            <ActionFooter
              stage={chainStage}
              onPrimaryPress={handlePrimaryAction}
              onSecondaryPress={handleSecondaryAction}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: "hidden",
  },
  screenBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  ambientOrb: {
    borderWidth: 1,
    opacity: 0.72,
    position: "absolute",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 34,
    shadowOffset: { height: 18, width: 0 },
  },
  ambientOrbTop: {
    borderRadius: 110,
    height: 220,
    right: -86,
    top: 92,
    width: 220,
  },
  ambientOrbBottom: {
    borderRadius: 150,
    bottom: -112,
    height: 300,
    left: -132,
    width: 300,
  },
  ambientLine: {
    borderRadius: 999,
    borderWidth: 1,
    height: 150,
    opacity: 0.35,
    position: "absolute",
    width: 150,
  },
  ambientLineTop: {
    right: 38,
    top: 192,
    transform: [{ rotate: "18deg" }],
  },
  ambientLineBottom: {
    bottom: 78,
    left: 36,
    transform: [{ rotate: "-18deg" }],
  },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  headerCompactRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    minHeight: 44,
  },
  headerTitleBlock: {
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.15,
  },
  headerMeta: {
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
  iconButton: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
  },
  iconButtonText: {
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 17,
    marginTop: -5,
  },
  headerTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  textButton: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
  },
  textButtonLabel: {
    fontSize: 13,
    fontWeight: "800",
  },
  titleRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
    marginTop: 16,
  },
  titleBlock: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.4,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 5,
  },
  statusPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "900",
  },
  content: {
    gap: 14,
    padding: 14,
    paddingBottom: 34,
  },
  contentDesktop: {
    alignSelf: "center",
    maxWidth: 1080,
    width: "100%",
  },
  introBlock: {
    gap: 5,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  introText: {
    fontSize: 14,
    lineHeight: 20,
  },
  labPanel: {
    gap: 18,
  },
  labPanelDesktop: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: 28,
  },
  mapPane: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 348,
    overflow: "visible",
    position: "relative",
  },
  mapPaneGlow: {
    borderRadius: 180,
    height: 360,
    opacity: 0.58,
    position: "absolute",
    top: -118,
    width: 360,
  },
  mapPaneDesktop: {
    flex: 1,
    minHeight: 440,
  },
  detailsPane: {
    gap: 16,
  },
  detailsPaneDesktop: {
    flex: 1,
    justifyContent: "center",
    maxWidth: 430,
  },
  circleWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  orbitAuraOuter: {
    borderWidth: 1,
    opacity: 0.28,
    position: "absolute",
  },
  orbitAuraInner: {
    borderStyle: "dashed",
    borderWidth: 1,
    opacity: 0.42,
    position: "absolute",
  },
  orbitSparkle: {
    opacity: 0.18,
    position: "absolute",
  },
  orbitGlow: {
    borderWidth: StyleSheet.hairlineWidth,
    opacity: 0.8,
    position: "absolute",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 28,
    shadowOffset: { height: 18, width: 0 },
  },
  circleGhost: {
    borderStyle: "dashed",
    borderWidth: 1,
    opacity: 0.84,
    position: "absolute",
  },
  circleGhostInner: {
    borderStyle: "dotted",
    borderWidth: 1,
    opacity: 0.34,
    position: "absolute",
  },
  loopCore: {
    alignItems: "center",
    borderRadius: 28,
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
    position: "absolute",
    width: 56,
  },
  loopCoreIcon: {
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 22,
  },
  loopCoreText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.7,
    marginTop: -1,
    textTransform: "uppercase",
  },
  connectionLineGlow: {
    borderRadius: 999,
    height: 8,
    opacity: 0.12,
    position: "absolute",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { height: 8, width: 0 },
  },
  connectionLine: {
    borderRadius: 999,
    height: 2,
    position: "absolute",
  },
  connectionLineActive: {
    height: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { height: 3, width: 0 },
  },
  connectionArrow: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    height: 24,
    justifyContent: "center",
    position: "absolute",
    width: 24,
  },
  connectionArrowActive: {
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 9,
    shadowOffset: { height: 5, width: 0 },
  },
  connectionArrowText: {
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 21,
    marginTop: -1,
  },
  node: {
    alignItems: "center",
    gap: 7,
    position: "absolute",
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
  },
  nodePressed: {
    transform: [{ scale: 0.97 }],
  },
  avatarStack: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBubble: {
    alignItems: "center",
    borderWidth: 2,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { height: 8, width: 0 },
  },
  currentUserAvatar: {
    borderWidth: 3,
  },
  selectedHalo: {
    opacity: 0.13,
    position: "absolute",
  },
  currentUserHalo: {
    borderStyle: "dashed",
    borderWidth: 1,
    opacity: 0.86,
    position: "absolute",
  },
  nodeInitials: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  nodeNamePill: {
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 92,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  nodeName: {
    fontSize: 12,
    fontWeight: "900",
    maxWidth: 70,
    textAlign: "center",
  },
  joinedDot: {
    alignItems: "center",
    borderRadius: 11,
    borderWidth: 2,
    bottom: -1,
    height: 22,
    justifyContent: "center",
    position: "absolute",
    right: -2,
    width: 22,
  },
  joinedDotText: {
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 13,
  },
  detailCard: {
    gap: 16,
  },
  detailHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  detailHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  detailEyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  detailTitle: {
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: -0.25,
    marginTop: 2,
  },
  detailSubtitle: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2,
  },
  miniAvatar: {
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  miniAvatarText: {
    fontSize: 14,
    fontWeight: "900",
  },
  roleFlow: {
    gap: 10,
    paddingVertical: 2,
  },
  roleFlowLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.9,
  },
  roleFlowRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
  },
  roleFlowArrow: {
    fontSize: 15,
    fontWeight: "900",
  },
  flowNode: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  flowNodeText: {
    fontSize: 12,
    fontWeight: "900",
    maxWidth: "100%",
  },
  exchangeStack: {
    gap: 10,
  },
  exchangeBlock: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    paddingVertical: 2,
  },
  exchangeIcon: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  exchangeIconText: {
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 22,
  },
  exchangeCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  exchangeLabel: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  exchangeTitle: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.15,
    lineHeight: 23,
  },
  exchangeCaption: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  exchangePeerName: {
    fontWeight: "900",
  },
  matchFitCard: {
    gap: 10,
  },
  matchFitHeader: {
    gap: 2,
  },
  matchFitTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  matchFitCaption: {
    fontSize: 12,
    fontWeight: "700",
  },
  infoChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  infoChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  infoChipText: {
    fontSize: 12,
    fontWeight: "900",
  },
  stateCard: {
    gap: 13,
  },
  stateHeaderRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  stateHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  stateEyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.1,
    marginTop: 3,
  },
  stateProgressPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  stateProgressText: {
    fontSize: 11,
    fontWeight: "900",
  },
  stateDescription: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  participantStatusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  participantStatusPill: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  participantStatusName: {
    fontSize: 12,
    fontWeight: "900",
    maxWidth: 72,
  },
  participantStatusMark: {
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 14,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.9,
    width: "100%",
  },
  sectionDividerInset: {
    marginLeft: 48,
    width: "auto",
  },
  actionStack: {
    gap: 8,
  },
  actionPrompt: {
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  primaryAction: {
    alignItems: "center",
    borderRadius: 18,
    flex: 1,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 14,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: "900",
  },
  secondaryAction: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 14,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: "900",
  },
  hintPill: {
    borderRadius: 999,
    borderWidth: 1,
    marginTop: -4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  hintPillText: {
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  optionsPanel: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  optionsHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  optionsEyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.9,
  },
  optionsTitle: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.1,
    marginTop: 3,
  },
  themeToggle: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
  },
  themeToggleText: {
    fontSize: 12,
    fontWeight: "900",
  },
  optionsDivider: {
    height: StyleSheet.hairlineWidth,
  },
  optionsSection: {
    gap: 5,
  },
  optionsSectionTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  optionsText: {
    fontSize: 13,
    lineHeight: 19,
  },
  tipsCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  tipsText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  pressed: {
    opacity: 0.72,
  },
});

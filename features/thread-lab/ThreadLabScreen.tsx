import { Stack, router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useTheme } from "@/providers/ThemeProvider";

import { threadLabScenario } from "./threadLab.mockData";
import type {
  ThreadLabMode,
  ThreadMessage,
  ThreadParticipant,
} from "./threadLab.types";

const MODES: Array<{ key: ThreadLabMode; label: string; helper: string }> = [
  {
    key: "public",
    label: "Public",
    helper: "Comment-section rows",
  },
  {
    key: "private",
    label: "Private",
    helper: "Two-user bubbles",
  },
];

function getParticipantName(
  participants: ThreadParticipant[],
  authorId: string,
) {
  return (
    participants.find((participant) => participant.id === authorId)?.name ??
    "User"
  );
}

function getParticipantInitials(
  participants: ThreadParticipant[],
  authorId: string,
) {
  return (
    participants.find((participant) => participant.id === authorId)?.initials ??
    "?"
  );
}

function HeaderAction({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const { palette } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.headerButton,
        { borderColor: palette.border, backgroundColor: palette.surface },
        pressed ? styles.pressed : null,
      ]}
    >
      <Text style={[styles.headerButtonText, { color: palette.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function ModeSwitcher({
  value,
  onChange,
}: {
  value: ThreadLabMode;
  onChange: (mode: ThreadLabMode) => void;
}) {
  const { palette } = useTheme();

  return (
    <View
      style={[
        styles.modeShell,
        { borderColor: palette.border, backgroundColor: palette.surfaceAlt },
      ]}
    >
      {MODES.map((mode) => {
        const selected = mode.key === value;
        return (
          <Pressable
            key={mode.key}
            onPress={() => onChange(mode.key)}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.modeButton,
              selected ? { backgroundColor: palette.text } : null,
              pressed ? { opacity: 0.86 } : null,
            ]}
          >
            <Text
              style={[
                styles.modeLabel,
                { color: selected ? palette.background : palette.text },
              ]}
            >
              {mode.label}
            </Text>
            <Text
              style={[
                styles.modeHelper,
                { color: selected ? palette.background : palette.muted },
              ]}
            >
              {mode.helper}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TradeDetailsPanel({
  mode,
  onClose,
}: {
  mode: ThreadLabMode;
  onClose: () => void;
}) {
  const { palette } = useTheme();
  const scenario = threadLabScenario;
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(true);

  return (
    <View
      style={[
        styles.detailsPanel,
        { borderColor: palette.border, backgroundColor: palette.surface },
      ]}
    >
      <View style={styles.detailsPanelHeader}>
        <View style={styles.detailsPanelTitleWrap}>
          <Text style={[styles.detailsPanelKicker, { color: palette.muted }]}>
            TRADE / DEAL DETAILS
          </Text>
          <Text style={[styles.detailsPanelTitle, { color: palette.text }]}>
            Agreement context
          </Text>
          <Text style={[styles.detailsPanelText, { color: palette.muted }]}>
            Proposal package, accepted deal, safety notes, and context stay here
            so the conversation stays easy to scan.
          </Text>
        </View>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Hide trade / deal details"
          style={({ pressed }) => [
            styles.detailsPanelClose,
            { borderColor: palette.border, backgroundColor: palette.surfaceAlt },
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={[styles.detailsPanelCloseText, { color: palette.text }]}>
            ^
          </Text>
        </Pressable>
      </View>

      {mode === "private" ? (
        <>
          <View
            style={[
              styles.dealSummaryCard,
              { borderColor: palette.border, backgroundColor: palette.surfaceAlt },
            ]}
          >
            <View style={styles.dealSummaryHeader}>
              <View
                style={[
                  styles.statusPill,
                  { borderColor: palette.border, backgroundColor: palette.surface },
                ]}
              >
                <Text style={[styles.statusPillText, { color: palette.text }]}>
                  Accepted deal
                </Text>
              </View>
              <View
                style={[
                  styles.statusPill,
                  { borderColor: palette.border, backgroundColor: palette.surface },
                ]}
              >
                <Text style={[styles.statusPillText, { color: palette.text }]}>
                  In progress
                </Text>
              </View>
            </View>
            <Text style={[styles.dealSummaryTitle, { color: palette.text }]}>
              {scenario.tradeTitle}
            </Text>
            <Text style={[styles.dealSummaryMeta, { color: palette.muted }]}>
              Accepted deal snapshot: actions stay available without forcing the
              full agreement into the conversation.
            </Text>
          </View>

          <DealCollapsibleSection
            title="Agreement"
            body="Need, offer, and accepted proposal message are grouped here."
            badge="Snapshot"
            open={agreementOpen}
            onToggle={() => setAgreementOpen((value) => !value)}
          >
            <View style={styles.detailZone}>
              <Text style={[styles.detailKicker, { color: palette.muted }]}>
                I NEED
              </Text>
              <Text style={[styles.detailTitle, { color: palette.text }]}>
                {scenario.needTitle}
              </Text>
              <Text style={[styles.detailText, { color: palette.muted }]}>
                {scenario.needDescription}
              </Text>
            </View>

            <View
              style={[styles.detailDivider, { backgroundColor: palette.border }]}
            />

            <View style={styles.detailZone}>
              <Text style={[styles.detailKicker, { color: palette.muted }]}>
                I OFFER
              </Text>
              <Text style={[styles.detailTitle, { color: palette.text }]}>
                {scenario.offerTitle}
              </Text>
              <Text style={[styles.detailText, { color: palette.muted }]}>
                {scenario.offerDescription}
              </Text>
            </View>

            <View
              style={[styles.detailDivider, { backgroundColor: palette.border }]}
            />

            <View style={styles.detailZone}>
              <Text style={[styles.detailKicker, { color: palette.muted }]}>
                ACCEPTED PROPOSAL MESSAGE
              </Text>
              <Text style={[styles.detailText, { color: palette.text }]}>
                {scenario.acceptedDealSummary}
              </Text>
            </View>
          </DealCollapsibleSection>

          <DealCollapsibleSection
            title="Safety checklist"
            body="Open this before submitting, confirming, or reporting the deal."
            badge={`${scenario.safetyNotes.length} checks`}
            open={safetyOpen}
            onToggle={() => setSafetyOpen((value) => !value)}
          >
            <View style={styles.safetyList}>
              {scenario.safetyNotes.map((note) => (
                <Text
                  key={note}
                  style={[styles.safetyText, { color: palette.muted }]}
                >
                  - {note}
                </Text>
              ))}
            </View>
          </DealCollapsibleSection>

          <DealCollapsibleSection
            title="Progress"
            body="Accepted, in progress, submitted, and completed states stay visible on demand."
            badge="In progress"
            open={progressOpen}
            onToggle={() => setProgressOpen((value) => !value)}
          >
            <View style={styles.progressList}>
              {["Accepted", "In progress", "Submitted", "Completed"].map(
                (step, index) => (
                  <View key={step} style={styles.progressStep}>
                    <View
                      style={[
                        styles.progressDot,
                        {
                          borderColor: palette.border,
                          backgroundColor:
                            index <= 1 ? palette.text : palette.surface,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.progressDotText,
                          {
                            color:
                              index <= 1 ? palette.background : palette.muted,
                          },
                        ]}
                      >
                        {index + 1}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.progressLabel,
                        { color: index <= 1 ? palette.text : palette.muted },
                      ]}
                    >
                      {step}
                    </Text>
                  </View>
                ),
              )}
            </View>
          </DealCollapsibleSection>

          <DealCollapsibleSection
            title="Safe actions"
            body="Actions are shown only when your role and the current status allow them."
            badge="Available"
            open={actionsOpen}
            onToggle={() => setActionsOpen((value) => !value)}
          >
            <View style={styles.actionRowWrap}>
              {["Mark delivered", "Report problem", "Cancel accepted trade"].map(
                (label, index) => (
                  <View
                    key={label}
                    style={[
                      styles.mockActionButton,
                      {
                        borderColor: palette.border,
                        backgroundColor:
                          index === 0 ? palette.text : palette.surface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.mockActionText,
                        {
                          color:
                            index === 0 ? palette.background : palette.text,
                        },
                      ]}
                    >
                      {label}
                    </Text>
                  </View>
                ),
              )}
            </View>
          </DealCollapsibleSection>
        </>
      ) : (
        <>
          <View style={styles.detailZone}>
            <Text style={[styles.detailKicker, { color: palette.muted }]}>
              I NEED
            </Text>
            <Text style={[styles.detailTitle, { color: palette.text }]}>
              {scenario.needTitle}
            </Text>
            <Text style={[styles.detailText, { color: palette.muted }]}>
              {scenario.needDescription}
            </Text>
          </View>

          <View
            style={[styles.detailDivider, { backgroundColor: palette.border }]}
          />

          <View style={styles.detailZone}>
            <Text style={[styles.detailKicker, { color: palette.muted }]}>
              I OFFER
            </Text>
            <Text style={[styles.detailTitle, { color: palette.text }]}>
              {scenario.offerTitle}
            </Text>
            <Text style={[styles.detailText, { color: palette.muted }]}>
              {scenario.offerDescription}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

function DealCollapsibleSection({
  title,
  body,
  badge,
  open,
  onToggle,
  children,
}: {
  title: string;
  body: string;
  badge: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const { palette } = useTheme();

  return (
    <View
      style={[
        styles.dealCollapsedSection,
        { borderColor: palette.border, backgroundColor: palette.surface },
      ]}
    >
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [
          styles.dealCollapsedHeader,
          pressed ? styles.pressed : null,
        ]}
      >
        <View style={styles.dealCollapsedCopy}>
          <View style={styles.dealCollapsedTitleRow}>
            <Text style={[styles.dealCollapsedTitle, { color: palette.text }]}>
              {title}
            </Text>
            <View
              style={[
                styles.dealCollapsedBadge,
                {
                  borderColor: palette.border,
                  backgroundColor: open ? palette.text : palette.surfaceAlt,
                },
              ]}
            >
              <Text
                style={[
                  styles.dealCollapsedBadgeText,
                  { color: open ? palette.background : palette.muted },
                ]}
              >
                {badge}
              </Text>
            </View>
          </View>
          <Text
            style={[styles.dealCollapsedBody, { color: palette.muted }]}
            numberOfLines={open ? 3 : 2}
          >
            {body}
          </Text>
        </View>
        <View
          style={[
            styles.dealCollapsedIcon,
            { borderColor: palette.border, backgroundColor: palette.surfaceAlt },
          ]}
        >
          <Text style={[styles.dealCollapsedIconText, { color: palette.text }]}>
            {open ? "^" : "v"}
          </Text>
        </View>
      </Pressable>
      {open ? <View style={styles.dealCollapsedContent}>{children}</View> : null}
    </View>
  );
}

function ThreadSummaryStrip({
  mode,
  expanded,
  onToggle,
}: {
  mode: ThreadLabMode;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { palette } = useTheme();
  const scenario = threadLabScenario;
  const statusLabel =
    mode === "public" ? scenario.tradeStatus : scenario.proposalStatus;

  return (
    <View
      style={[
        styles.summaryShell,
        { borderColor: palette.border, backgroundColor: palette.surfaceAlt },
      ]}
    >
      <View style={styles.summaryTopRow}>
        <View style={styles.summaryTextBlock}>
          <Text style={[styles.summaryKicker, { color: palette.muted }]}>
            {mode === "public" ? "PUBLIC THREAD" : "PRIVATE THREAD"}
          </Text>
          <Text
            style={[styles.summaryTitle, { color: palette.text }]}
            numberOfLines={2}
          >
            {scenario.tradeTitle}
          </Text>
          <Text
            style={[styles.summaryMeta, { color: palette.muted }]}
            numberOfLines={1}
          >
            {scenario.tradeMeta}
          </Text>
        </View>
        <View
          style={[
            styles.statusPill,
            { borderColor: palette.border, backgroundColor: palette.surface },
          ]}
        >
          <Text style={[styles.statusPillText, { color: palette.text }]}>
            {statusLabel}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.summaryStatusBox,
          { borderColor: palette.border, backgroundColor: palette.surface },
        ]}
      >
        <Text style={[styles.summaryStatusText, { color: palette.text }]}>
          {mode === "private"
            ? scenario.proposalSummary
            : "Public comments stay lightweight; trade details are available when needed."}
        </Text>
        {!expanded ? (
          <Text style={[styles.summaryCollapsedHint, { color: palette.muted }]}>
            Details are collapsed by default. Open them only when you need the
            agreement, safety notes, or trade context.
          </Text>
        ) : null}
      </View>

      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={
          expanded ? "Hide trade / deal details" : "Show trade / deal details"
        }
        style={({ pressed }) => [
          styles.detailsToggle,
          {
            borderColor: palette.text,
            backgroundColor: palette.text,
          },
          pressed ? styles.pressed : null,
        ]}
      >
        <Text style={[styles.detailsToggleText, { color: palette.background }]}>
          {expanded ? "Hide trade / deal details" : "Show trade / deal details"}
        </Text>
        <Text style={[styles.detailsToggleIcon, { color: palette.background }]}>
          {expanded ? "^" : "v"}
        </Text>
      </Pressable>

      {expanded ? <TradeDetailsPanel mode={mode} onClose={onToggle} /> : null}
    </View>
  );
}

function SystemEvent({ label }: { label: string }) {
  const { palette } = useTheme();

  return (
    <View style={styles.systemEvent}>
      <View style={[styles.systemLine, { backgroundColor: palette.border }]} />
      <Text style={[styles.systemText, { color: palette.muted }]}>{label}</Text>
      <View style={[styles.systemLine, { backgroundColor: palette.border }]} />
    </View>
  );
}

function PublicMessageRow({
  message,
  participants,
}: {
  message: ThreadMessage;
  participants: ThreadParticipant[];
}) {
  const { palette } = useTheme();
  const name = getParticipantName(participants, message.authorId);
  const initials = getParticipantInitials(participants, message.authorId);

  return (
    <View style={styles.publicRow}>
      <View
        style={[
          styles.avatar,
          { borderColor: palette.border, backgroundColor: palette.surfaceAlt },
        ]}
      >
        <Text style={[styles.avatarText, { color: palette.text }]}>
          {initials}
        </Text>
      </View>
      <View style={styles.publicBody}>
        <View style={styles.messageMetaRow}>
          <Text style={[styles.messageAuthor, { color: palette.text }]}>
            {name}
          </Text>
          <Text style={[styles.messageTime, { color: palette.muted }]}>
            {message.createdAtLabel}
          </Text>
          {message.edited ? (
            <Text style={[styles.messageTime, { color: palette.muted }]}>
              Edited
            </Text>
          ) : null}
        </View>
        <Text style={[styles.publicMessageText, { color: palette.text }]}>
          {message.body}
        </Text>
      </View>
      <Text style={[styles.moreText, { color: palette.muted }]}>⋯</Text>
    </View>
  );
}

function PublicThread() {
  const { palette } = useTheme();
  const scenario = threadLabScenario;
  const participants = useMemo(
    () => [scenario.owner, scenario.applicant],
    [scenario.applicant, scenario.owner],
  );

  return (
    <View
      style={[
        styles.threadCard,
        { borderColor: palette.border, backgroundColor: palette.surface },
      ]}
    >
      <View style={styles.threadIntro}>
        <Text style={[styles.threadIntroTitle, { color: palette.text }]}>
          Public comment-section model
        </Text>
        <Text style={[styles.threadIntroText, { color: palette.muted }]}>
          Flat rows, thin dividers, visible to public trade viewers.
        </Text>
      </View>

      <View
        style={[
          styles.fakeComposer,
          { borderColor: palette.border, backgroundColor: palette.surfaceAlt },
        ]}
      >
        <Text style={[styles.fakeComposerText, { color: palette.muted }]}>
          Write a public comment…
        </Text>
      </View>

      <View style={styles.publicList}>
        {scenario.publicMessages.map((message, index) => (
          <React.Fragment key={message.id}>
            <PublicMessageRow message={message} participants={participants} />
            {index < scenario.publicMessages.length - 1 ? (
              <View
                style={[styles.rowDivider, { backgroundColor: palette.border }]}
              />
            ) : null}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

function PrivateMessageBubble({
  message,
  participants,
}: {
  message: ThreadMessage;
  participants: ThreadParticipant[];
}) {
  const { palette } = useTheme();
  const scenario = threadLabScenario;
  const mine = message.authorId === scenario.owner.id;
  const name = getParticipantName(participants, message.authorId);

  return (
    <View
      style={[
        styles.privateBubbleRow,
        mine ? styles.privateBubbleRowMine : styles.privateBubbleRowOther,
      ]}
    >
      <View
        style={[
          styles.privateBubble,
          mine ? styles.privateBubbleMine : styles.privateBubbleOther,
          {
            borderColor: palette.border,
            backgroundColor: mine ? palette.text : palette.surfaceAlt,
          },
        ]}
      >
        <Text
          style={[
            styles.privateAuthor,
            { color: mine ? palette.background : palette.muted },
          ]}
        >
          {mine ? "You" : name}
        </Text>
        <Text
          style={[
            styles.privateMessageText,
            { color: mine ? palette.background : palette.text },
          ]}
        >
          {message.body}
        </Text>
        <Text
          style={[
            styles.privateTime,
            { color: mine ? palette.background : palette.muted },
          ]}
        >
          {message.createdAtLabel}
          {message.edited ? " · edited" : ""}
        </Text>
      </View>
    </View>
  );
}

function PrivateThread() {
  const { palette } = useTheme();
  const scenario = threadLabScenario;
  const participants = useMemo(
    () => [scenario.owner, scenario.applicant],
    [scenario.applicant, scenario.owner],
  );

  return (
    <View
      style={[
        styles.threadCard,
        { borderColor: palette.border, backgroundColor: palette.surface },
      ]}
    >
      <View style={[styles.timelineShell, { borderTopColor: palette.border }]}>
        <View style={styles.timelineHeader}>
          <View style={styles.timelineHeaderCopy}>
            <Text style={[styles.timelineTitle, { color: palette.text }]}>
              Private proposal conversation
            </Text>
            <Text style={[styles.timelineBody, { color: palette.muted }]}>
              Conversation first. Proposal/deal details stay collapsed until
              needed.
            </Text>
          </View>
          <View
            style={[
              styles.statusPill,
              { borderColor: palette.border, backgroundColor: palette.surfaceAlt },
            ]}
          >
            <Text style={[styles.statusPillText, { color: palette.text }]}>
              {scenario.proposalStatus}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.privateList}>
        <SystemEvent label="Sara sent a private proposal" />
        {scenario.privateMessages.map((message) => (
          <PrivateMessageBubble
            key={message.id}
            message={message}
            participants={participants}
          />
        ))}
      </View>

      <View
        style={[
          styles.fakeComposer,
          { borderColor: palette.border, backgroundColor: palette.surfaceAlt },
        ]}
      >
        <Text style={[styles.fakeComposerText, { color: palette.muted }]}>
          Write a private message…
        </Text>
        <View style={[styles.sendButton, { backgroundColor: palette.text }]}>
          <Text style={[styles.sendButtonText, { color: palette.background }]}>
            Send
          </Text>
        </View>
      </View>
    </View>
  );
}

export function ThreadLabScreen() {
  const { mode, palette, toggleMode } = useTheme();
  const [activeMode, setActiveMode] = useState<ThreadLabMode>("public");
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <Stack.Screen options={{ title: "Thread Lab", headerShown: false }} />

      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <View style={styles.headerTopRow}>
          <HeaderAction label="‹ Labs" onPress={() => router.back()} />
          <HeaderAction
            label={mode === "dark" ? "Light" : "Dark"}
            onPress={toggleMode}
          />
        </View>
        <Text style={[styles.eyebrow, { color: palette.muted }]}>
          CONVERSATION LAB
        </Text>
        <Text style={[styles.title, { color: palette.text }]}>
          Public + private threads
        </Text>
        <Text style={[styles.subtitle, { color: palette.muted }]}>
          Mock-only environment for comment rows, private bubbles, and collapsed
          trade/deal details.
        </Text>
        <ModeSwitcher
          value={activeMode}
          onChange={(nextMode) => {
            setActiveMode(nextMode);
            setDetailsExpanded(false);
          }}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <ThreadSummaryStrip
          mode={activeMode}
          expanded={detailsExpanded}
          onToggle={() => setDetailsExpanded((current) => !current)}
        />
        {activeMode === "public" ? <PublicThread /> : <PrivateThread />}

        <View
          style={[
            styles.notesCard,
            {
              borderColor: palette.border,
              backgroundColor: palette.surfaceAlt,
            },
          ]}
        >
          <Text style={[styles.notesTitle, { color: palette.text }]}>
            THREAD-LAB1 scope
          </Text>
          <Text style={[styles.notesText, { color: palette.muted }]}>
            This route is isolated from the real app, uses local mock data, and
            does not call any API. Next patches can replace these shells with
            the final public row and private bubble designs.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

export default ThreadLabScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 18,
    paddingBottom: 14,
    paddingTop: Platform.select({ ios: 18, default: 16 }),
    gap: 8,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerButton: {
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerButtonText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  eyebrow: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.35,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.65,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  modeShell: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 22,
    padding: 4,
    gap: 4,
  },
  modeButton: {
    flex: 1,
    minHeight: 56,
    justifyContent: "center",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modeLabel: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: -0.1,
  },
  modeHelper: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "800",
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 16,
    gap: 14,
  },
  summaryShell: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 14,
    gap: 12,
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryTextBlock: {
    flex: 1,
    gap: 4,
  },
  summaryKicker: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.35,
    lineHeight: 24,
  },
  summaryMeta: {
    fontSize: 12,
    fontWeight: "800",
  },
  statusPill: {
    maxWidth: 130,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.25,
  },
  detailsToggle: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  detailsToggleText: {
    fontSize: 12,
    fontWeight: "900",
  },
  detailsToggleIcon: {
    fontSize: 13,
    fontWeight: "900",
  },
  detailsPanel: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    gap: 12,
  },
  detailsPanelHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  detailsPanelTitleWrap: {
    flex: 1,
    gap: 4,
  },
  detailsPanelKicker: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.05,
  },
  detailsPanelTitle: {
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: -0.3,
    lineHeight: 23,
  },
  detailsPanelText: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  detailsPanelClose: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 19,
  },
  detailsPanelCloseText: {
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 18,
  },
  dealSummaryCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 13,
    gap: 8,
  },
  dealSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  dealSummaryTitle: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.25,
    lineHeight: 23,
  },
  dealSummaryMeta: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  dealCollapsedSection: {
    borderWidth: 1,
    borderRadius: 20,
    overflow: "hidden",
  },
  dealCollapsedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 13,
  },
  dealCollapsedCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  dealCollapsedTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  dealCollapsedTitle: {
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  dealCollapsedBody: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  dealCollapsedBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dealCollapsedBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.25,
  },
  dealCollapsedIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 17,
  },
  dealCollapsedIconText: {
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 16,
  },
  dealCollapsedContent: {
    paddingHorizontal: 13,
    paddingBottom: 13,
    gap: 12,
  },
  detailZone: {
    gap: 5,
  },
  detailKicker: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.05,
  },
  detailTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  detailText: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  detailDivider: {
    height: StyleSheet.hairlineWidth,
  },
  safetyList: {
    gap: 5,
    paddingTop: 4,
  },
  safetyText: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  progressList: {
    gap: 10,
  },
  progressStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progressDot: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 14,
  },
  progressDotText: {
    fontSize: 11,
    fontWeight: "900",
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: "800",
  },
  actionRowWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  mockActionButton: {
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mockActionText: {
    fontSize: 12,
    fontWeight: "900",
  },
  summaryStatusBox: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 5,
  },
  summaryStatusText: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  summaryCollapsedHint: {
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
  },
  threadCard: {
    borderWidth: 1,
    borderRadius: 30,
    padding: 14,
    gap: 14,
  },
  threadIntro: {
    gap: 4,
  },
  threadIntroTitle: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  threadIntroText: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  fakeComposer: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 10,
  },
  fakeComposerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  publicList: {
    gap: 0,
  },
  publicRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    gap: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 17,
  },
  avatarText: {
    fontSize: 11,
    fontWeight: "900",
  },
  publicBody: {
    flex: 1,
    gap: 5,
  },
  messageMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  messageAuthor: {
    fontSize: 13,
    fontWeight: "900",
  },
  messageTime: {
    fontSize: 11,
    fontWeight: "800",
  },
  publicMessageText: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  moreText: {
    marginTop: -2,
    fontSize: 20,
    fontWeight: "900",
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 44,
  },
  privateStatusStrip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  privateStatusTitle: {
    fontSize: 13,
    fontWeight: "900",
  },
  privateStatusText: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  timelineShell: {
    paddingTop: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  timelineHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  timelineHeaderCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.25,
    lineHeight: 23,
  },
  timelineBody: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  systemEvent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 2,
  },
  systemLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  systemText: {
    maxWidth: "74%",
    textAlign: "center",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
  },
  privateList: {
    gap: 7,
  },
  privateBubbleRow: {
    width: "100%",
    flexDirection: "row",
  },
  privateBubbleRowMine: {
    justifyContent: "flex-end",
  },
  privateBubbleRowOther: {
    justifyContent: "flex-start",
  },
  privateBubble: {
    maxWidth: "84%",
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 7,
  },
  privateBubbleMine: {
    borderBottomRightRadius: 7,
  },
  privateBubbleOther: {
    borderBottomLeftRadius: 7,
  },
  privateAuthor: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  privateMessageText: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  privateTime: {
    alignSelf: "flex-end",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
  },
  sendButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sendButtonText: {
    fontSize: 12,
    fontWeight: "900",
  },
  notesCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 14,
    gap: 5,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  notesText: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
});

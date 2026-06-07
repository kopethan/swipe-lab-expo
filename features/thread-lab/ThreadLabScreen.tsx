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
import type { ThreadMessage, ThreadParticipant } from "./threadLab.types";

type ThreadKind = "public" | "private";
type ThreadLabView =
  | "home"
  | "public"
  | "private"
  | "public-menu"
  | "private-menu"
  | "details"
  | "guide";

function getParticipantName(participants: ThreadParticipant[], authorId: string) {
  return participants.find((participant) => participant.id === authorId)?.name ?? "User";
}

function getParticipantInitials(participants: ThreadParticipant[], authorId: string) {
  return participants.find((participant) => participant.id === authorId)?.initials ?? "?";
}

function ScreenHeader({
  title,
  eyebrow,
  onBack,
  onMenu,
}: {
  title: string;
  eyebrow?: string;
  onBack?: () => void;
  onMenu?: () => void;
}) {
  const { mode, palette, toggleMode } = useTheme();

  return (
    <View style={[styles.header, { borderBottomColor: palette.border }]}>
      <View style={styles.headerTopRow}>
        <Pressable
          onPress={onBack ?? (() => router.back())}
          accessibilityRole="button"
          style={({ pressed }) => [styles.textButton, pressed ? styles.pressed : null]}
        >
          <Text style={[styles.textButtonLabel, { color: palette.text }]}>{"< Labs"}</Text>
        </Pressable>

        {onMenu ? (
          <Pressable
            onPress={onMenu}
            accessibilityRole="button"
            accessibilityLabel="Thread options"
            style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}
          >
            <Text style={[styles.iconButtonText, { color: palette.text }]}>...</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={toggleMode}
            accessibilityRole="button"
            style={({ pressed }) => [styles.textButton, pressed ? styles.pressed : null]}
          >
            <Text style={[styles.textButtonLabel, { color: palette.text }]}>
              {mode === "dark" ? "Light" : "Dark"}
            </Text>
          </Pressable>
        )}
      </View>

      {eyebrow ? <Text style={[styles.eyebrow, { color: palette.muted }]}>{eyebrow}</Text> : null}
      <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
    </View>
  );
}

function FullBleedDivider() {
  const { palette } = useTheme();
  return <View style={[styles.fullBleedDivider, { backgroundColor: palette.border }]} />;
}

function RowButton({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  const { palette } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.rowButton, pressed ? styles.pressed : null]}
    >
      <View style={styles.rowButtonTextBlock}>
        <Text style={[styles.rowButtonTitle, { color: palette.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.rowButtonSubtitle, { color: palette.muted }]}>{subtitle}</Text>
        ) : null}
      </View>
      <Text style={[styles.chevron, { color: palette.muted }]}>{">"}</Text>
    </Pressable>
  );
}

function HomeScreen({ onOpen }: { onOpen: (view: ThreadKind) => void }) {
  const { palette } = useTheme();
  const scenario = threadLabScenario;

  return (
    <>
      <ScreenHeader title="Conversation lab" eyebrow="THREAD LAB" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.tradeIntro}>
          <Text style={[styles.homeTitle, { color: palette.text }]}>Public + private threads</Text>
          <Text style={[styles.homeTradeTitle, { color: palette.text }]}>{scenario.tradeTitle}</Text>
          <Text style={[styles.homeMeta, { color: palette.muted }]}>{scenario.tradeMeta}</Text>
        </View>

        <FullBleedDivider />

        <Text style={[styles.sectionTitle, { color: palette.text }]}>Conversations</Text>
        <RowButton
          title="Public thread"
          subtitle={`${scenario.publicMessages.length} comments - ask openly`}
          onPress={() => onOpen("public")}
        />
        <FullBleedDivider />
        <RowButton
          title="Private thread"
          subtitle="Proposal and deal conversation"
          onPress={() => onOpen("private")}
        />
        <FullBleedDivider />
      </ScrollView>
    </>
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
      <View style={[styles.avatar, { backgroundColor: palette.surfaceAlt }]}>
        <Text style={[styles.avatarText, { color: palette.text }]}>{initials}</Text>
      </View>
      <View style={styles.publicBody}>
        <View style={styles.messageMetaRow}>
          <Text style={[styles.messageAuthor, { color: palette.text }]}>{name}</Text>
          <Text style={[styles.messageTime, { color: palette.muted }]}>{message.createdAtLabel}</Text>
          {message.edited ? <Text style={[styles.messageTime, { color: palette.muted }]}>Edited</Text> : null}
        </View>
        <Text style={[styles.publicMessageText, { color: palette.text }]}>{message.body}</Text>
      </View>
      <Text style={[styles.moreText, { color: palette.muted }]}>...</Text>
    </View>
  );
}

function PublicThreadScreen({ onBack, onMenu }: { onBack: () => void; onMenu: () => void }) {
  const { palette } = useTheme();
  const scenario = threadLabScenario;
  const participants = useMemo(
    () => [scenario.owner, scenario.applicant],
    [scenario.applicant, scenario.owner],
  );

  return (
    <>
      <ScreenHeader title="Public thread" onBack={onBack} onMenu={onMenu} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.threadContent}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Conversation</Text>
        <View style={styles.plainComposer}>
          <Text style={[styles.plainComposerText, { color: palette.muted }]}>Write a public comment...</Text>
          <Text style={[styles.sendText, { color: palette.text }]}>Send</Text>
        </View>
        <FullBleedDivider />

        {scenario.publicMessages.map((message) => (
          <React.Fragment key={message.id}>
            <PublicMessageRow message={message} participants={participants} />
            <FullBleedDivider />
          </React.Fragment>
        ))}
      </ScrollView>
    </>
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
    <View style={[styles.privateBubbleRow, mine ? styles.privateBubbleRowMine : styles.privateBubbleRowOther]}>
      <View
        style={[
          styles.privateBubble,
          mine ? styles.privateBubbleMine : styles.privateBubbleOther,
          { backgroundColor: mine ? palette.text : palette.surfaceAlt },
        ]}
      >
        <Text style={[styles.privateAuthor, { color: mine ? palette.background : palette.muted }]}>
          {mine ? "You" : name}
        </Text>
        <Text style={[styles.privateMessageText, { color: mine ? palette.background : palette.text }]}>
          {message.body}
        </Text>
        <Text style={[styles.privateTime, { color: mine ? palette.background : palette.muted }]}>
          {message.createdAtLabel}
          {message.edited ? " - edited" : ""}
        </Text>
      </View>
    </View>
  );
}

function PrivateThreadScreen({ onBack, onMenu }: { onBack: () => void; onMenu: () => void }) {
  const { palette } = useTheme();
  const scenario = threadLabScenario;
  const participants = useMemo(
    () => [scenario.owner, scenario.applicant],
    [scenario.applicant, scenario.owner],
  );

  return (
    <>
      <ScreenHeader title="Private thread" onBack={onBack} onMenu={onMenu} />
      <View style={styles.privateScreenBody}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.privateMessagesContent}>
          <Text style={[styles.dayLabel, { color: palette.muted }]}>Today</Text>
          {scenario.privateMessages.map((message) => (
            <PrivateMessageBubble key={message.id} message={message} participants={participants} />
          ))}
        </ScrollView>
        <View style={[styles.bottomComposer, { borderTopColor: palette.border }]}>
          <Text style={[styles.bottomComposerText, { color: palette.muted }]}>Message...</Text>
          <Text style={[styles.sendText, { color: palette.text }]}>Send</Text>
        </View>
      </View>
    </>
  );
}

function ThreadMenuScreen({
  kind,
  onBack,
  onOpenDetails,
  onOpenGuide,
}: {
  kind: ThreadKind;
  onBack: () => void;
  onOpenDetails: () => void;
  onOpenGuide: () => void;
}) {
  const { palette } = useTheme();

  return (
    <>
      <ScreenHeader title="Thread options" onBack={onBack} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>What do you want to see?</Text>
        <RowButton title="See details" subtitle="Trade, proposal, or deal context" onPress={onOpenDetails} />
        <FullBleedDivider />
        <RowButton title="See guide" subtitle="How this thread type works" onPress={onOpenGuide} />
        <FullBleedDivider />
        <RowButton
          title={kind === "public" ? "Report thread" : "Report problem"}
          subtitle="Placeholder action for moderation/support"
          onPress={onOpenGuide}
        />
        <FullBleedDivider />
      </ScrollView>
    </>
  );
}

function DetailsScreen({ onBack }: { onBack: () => void }) {
  const { palette } = useTheme();
  const scenario = threadLabScenario;

  return (
    <>
      <ScreenHeader title="Details" onBack={onBack} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={[styles.detailPageKicker, { color: palette.muted }]}>OPEN - TRADE</Text>
        <Text style={[styles.detailPageTitle, { color: palette.text }]}>{scenario.tradeTitle}</Text>
        <Text style={[styles.detailPageMeta, { color: palette.muted }]}>{scenario.tradeMeta}</Text>

        <FullBleedDivider />

        <View style={styles.detailBlock}>
          <Text style={[styles.detailPageKicker, { color: palette.muted }]}>I NEED</Text>
          <Text style={[styles.detailBlockTitle, { color: palette.text }]}>{scenario.needTitle}</Text>
          <Text style={[styles.detailText, { color: palette.text }]}>{scenario.needDescription}</Text>
        </View>

        <FullBleedDivider />

        <View style={styles.detailBlock}>
          <Text style={[styles.detailPageKicker, { color: palette.muted }]}>I OFFER</Text>
          <Text style={[styles.detailBlockTitle, { color: palette.text }]}>{scenario.offerTitle}</Text>
          <Text style={[styles.detailText, { color: palette.text }]}>{scenario.offerDescription}</Text>
        </View>

        <FullBleedDivider />

        <View style={styles.detailBlock}>
          <Text style={[styles.detailPageKicker, { color: palette.muted }]}>PRIVATE CONTEXT</Text>
          <Text style={[styles.detailText, { color: palette.text }]}>{scenario.proposalSummary}</Text>
          <Text style={[styles.detailText, { color: palette.muted }]}>{scenario.acceptedDealSummary}</Text>
        </View>
      </ScrollView>
    </>
  );
}

function GuideScreen({ onBack }: { onBack: () => void }) {
  const { palette } = useTheme();

  return (
    <>
      <ScreenHeader title="Thread guide" onBack={onBack} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Public thread</Text>
        <Text style={[styles.guideText, { color: palette.muted }]}>
          Public comments are visible to people viewing the trade. Use them for simple questions and clarifications.
        </Text>
        <FullBleedDivider />
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Private thread</Text>
        <Text style={[styles.guideText, { color: palette.muted }]}>
          Private messages are for proposal and deal discussion between the two users. Details stay outside the chat by default.
        </Text>
        <FullBleedDivider />
      </ScrollView>
    </>
  );
}

export function ThreadLabScreen() {
  const { palette } = useTheme();
  const [view, setView] = useState<ThreadLabView>("home");
  const [threadKind, setThreadKind] = useState<ThreadKind>("public");

  const openThread = (kind: ThreadKind) => {
    setThreadKind(kind);
    setView(kind);
  };

  const openMenu = (kind: ThreadKind) => {
    setThreadKind(kind);
    setView(kind === "public" ? "public-menu" : "private-menu");
  };

  const backToThread = () => setView(threadKind);

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <Stack.Screen options={{ title: "Thread Lab", headerShown: false }} />
      {view === "home" ? <HomeScreen onOpen={openThread} /> : null}
      {view === "public" ? <PublicThreadScreen onBack={() => setView("home")} onMenu={() => openMenu("public")} /> : null}
      {view === "private" ? <PrivateThreadScreen onBack={() => setView("home")} onMenu={() => openMenu("private")} /> : null}
      {view === "public-menu" ? (
        <ThreadMenuScreen
          kind="public"
          onBack={backToThread}
          onOpenDetails={() => setView("details")}
          onOpenGuide={() => setView("guide")}
        />
      ) : null}
      {view === "private-menu" ? (
        <ThreadMenuScreen
          kind="private"
          onBack={backToThread}
          onOpenDetails={() => setView("details")}
          onOpenGuide={() => setView("guide")}
        />
      ) : null}
      {view === "details" ? <DetailsScreen onBack={backToThread} /> : null}
      {view === "guide" ? <GuideScreen onBack={backToThread} /> : null}
    </View>
  );
}

export default ThreadLabScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingBottom: 16,
    paddingTop: Platform.select({ ios: 18, default: 16 }),
    gap: 7,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  textButton: {
    minHeight: 36,
    justifyContent: "center",
    paddingVertical: 8,
  },
  textButtonLabel: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  iconButton: {
    width: 40,
    height: 36,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  iconButtonText: {
    marginTop: -8,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  pressed: {
    opacity: 0.66,
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
  content: {
    paddingHorizontal: 18,
    paddingBottom: 44,
    paddingTop: 18,
    gap: 18,
  },
  threadContent: {
    paddingHorizontal: 18,
    paddingBottom: 44,
    paddingTop: 18,
    gap: 0,
  },
  tradeIntro: {
    gap: 6,
  },
  homeTitle: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.45,
    lineHeight: 29,
  },
  homeTradeTitle: {
    marginTop: 8,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 22,
  },
  homeMeta: {
    fontSize: 12,
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  fullBleedDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: -18,
  },
  rowButton: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 12,
  },
  rowButtonTextBlock: {
    flex: 1,
    gap: 4,
  },
  rowButtonTitle: {
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  rowButtonSubtitle: {
    fontSize: 12,
    fontWeight: "800",
  },
  chevron: {
    fontSize: 20,
    fontWeight: "700",
  },
  plainComposer: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
  },
  plainComposerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
  },
  sendText: {
    fontSize: 13,
    fontWeight: "900",
  },
  publicRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 14,
    gap: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
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
    fontSize: 16,
    fontWeight: "900",
  },
  privateScreenBody: {
    flex: 1,
  },
  privateMessagesContent: {
    paddingHorizontal: 18,
    paddingBottom: 20,
    paddingTop: 18,
    gap: 12,
  },
  dayLabel: {
    alignSelf: "center",
    fontSize: 11,
    fontWeight: "900",
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
    maxWidth: "82%",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  privateBubbleMine: {
    borderBottomRightRadius: 8,
  },
  privateBubbleOther: {
    borderBottomLeftRadius: 8,
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
    fontSize: 10,
    fontWeight: "800",
  },
  bottomComposer: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 14,
  },
  bottomComposerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
  },
  detailPageKicker: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.05,
  },
  detailPageTitle: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.4,
    lineHeight: 29,
  },
  detailPageMeta: {
    fontSize: 12,
    fontWeight: "800",
  },
  detailBlock: {
    gap: 7,
  },
  detailBlockTitle: {
    fontSize: 17,
    fontWeight: "900",
  },
  detailText: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  guideText: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
});

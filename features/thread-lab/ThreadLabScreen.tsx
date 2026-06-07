import { Stack, router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  | "guide"
  | "message-actions"
  | "edit-message"
  | "report-message"
  | "report-sent";

type MessageKind = ThreadKind;

type MessageActionTarget = {
  kind: MessageKind;
  messageId: string;
};

const currentUserId = threadLabScenario.owner.id;
const reportReasons = ["Spam", "Scam", "Harassment", "Unsafe content", "Other"];

function buildLocalMessage(body: string, authorId = currentUserId): ThreadMessage {
  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    authorId,
    body: body.trim(),
    createdAtLabel: "now",
  };
}

function getParticipantName(participants: ThreadParticipant[], authorId: string) {
  return participants.find((participant) => participant.id === authorId)?.name ?? "User";
}

function getParticipantInitials(participants: ThreadParticipant[], authorId: string) {
  return participants.find((participant) => participant.id === authorId)?.initials ?? "?";
}

function getMessageLabel(kind: MessageKind) {
  return kind === "public" ? "comment" : "message";
}

function getDeletedLabel(kind: MessageKind) {
  return kind === "public" ? "Comment deleted" : "Message deleted";
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
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        { borderBottomColor: palette.border, paddingTop: insets.top + 18 },
      ]}
    >
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

function MessageMoreButton({ color, onPress }: { color: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Message actions"
      hitSlop={10}
      style={({ pressed }) => [styles.moreButton, pressed ? styles.pressed : null]}
    >
      <Text style={[styles.moreText, { color }]}>...</Text>
    </Pressable>
  );
}

function PublicMessageRow({
  message,
  participants,
  onMore,
}: {
  message: ThreadMessage;
  participants: ThreadParticipant[];
  onMore: (message: ThreadMessage) => void;
}) {
  const { palette } = useTheme();
  const name = getParticipantName(participants, message.authorId);
  const initials = getParticipantInitials(participants, message.authorId);
  const deleted = Boolean(message.deleted);

  return (
    <View style={styles.publicRow}>
      <View style={[styles.avatar, { backgroundColor: palette.surfaceAlt }]}>
        <Text style={[styles.avatarText, { color: palette.text }]}>{initials}</Text>
      </View>
      <View style={styles.publicBody}>
        <View style={styles.messageMetaRow}>
          <Text style={[styles.messageAuthor, { color: palette.text }]}>{name}</Text>
          <Text style={[styles.messageTime, { color: palette.muted }]}>{message.createdAtLabel}</Text>
          {message.edited && !deleted ? <Text style={[styles.messageTime, { color: palette.muted }]}>Edited</Text> : null}
        </View>
        <Text
          style={[
            styles.publicMessageText,
            { color: deleted ? palette.muted : palette.text },
            deleted ? styles.deletedText : null,
          ]}
        >
          {deleted ? getDeletedLabel("public") : message.body}
        </Text>
      </View>
      {!deleted ? <MessageMoreButton color={palette.muted} onPress={() => onMore(message)} /> : null}
    </View>
  );
}

function ThreadComposer({
  value,
  placeholder,
  onChangeText,
  onSend,
}: {
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
}) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const canSend = value.trim().length > 0;

  return (
    <View
      style={[
        styles.bottomComposer,
        {
          borderTopColor: palette.border,
          paddingBottom: Math.max(insets.bottom, 10),
        },
      ]}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        multiline
        style={[styles.composerInput, { color: palette.text }]}
      />
      <Pressable
        onPress={onSend}
        disabled={!canSend}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.sendButton,
          pressed && canSend ? styles.pressed : null,
          !canSend ? styles.disabled : null,
        ]}
      >
        <Text style={[styles.sendText, { color: palette.text }]}>Send</Text>
      </Pressable>
    </View>
  );
}

function PublicThreadScreen({
  messages,
  draft,
  onBack,
  onChangeDraft,
  onMenu,
  onMessageAction,
  onSend,
}: {
  messages: ThreadMessage[];
  draft: string;
  onBack: () => void;
  onChangeDraft: (value: string) => void;
  onMenu: () => void;
  onMessageAction: (message: ThreadMessage) => void;
  onSend: () => void;
}) {
  const scenario = threadLabScenario;
  const scrollRef = useRef<ScrollView>(null);
  const participants = useMemo(
    () => [scenario.owner, scenario.applicant],
    [scenario.applicant, scenario.owner],
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 80);
    return () => clearTimeout(timeout);
  }, [messages.length]);

  return (
    <>
      <ScreenHeader title="Public thread" onBack={onBack} onMenu={onMenu} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.threadScreenBody}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.threadMessagesContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((message) => (
            <React.Fragment key={message.id}>
              <PublicMessageRow
                message={message}
                participants={participants}
                onMore={onMessageAction}
              />
              <FullBleedDivider />
            </React.Fragment>
          ))}
        </ScrollView>
        <ThreadComposer
          value={draft}
          onChangeText={onChangeDraft}
          onSend={onSend}
          placeholder="Write a public comment..."
        />
      </KeyboardAvoidingView>
    </>
  );
}

function PrivateMessageBubble({
  message,
  participants,
  onMore,
}: {
  message: ThreadMessage;
  participants: ThreadParticipant[];
  onMore: (message: ThreadMessage) => void;
}) {
  const { palette } = useTheme();
  const scenario = threadLabScenario;
  const mine = message.authorId === scenario.owner.id;
  const name = getParticipantName(participants, message.authorId);
  const deleted = Boolean(message.deleted);

  return (
    <View style={[styles.privateBubbleRow, mine ? styles.privateBubbleRowMine : styles.privateBubbleRowOther]}>
      <View
        style={[
          styles.privateBubble,
          mine ? styles.privateBubbleMine : styles.privateBubbleOther,
          { backgroundColor: mine ? palette.text : palette.surfaceAlt },
        ]}
      >
        <View style={styles.privateBubbleHeader}>
          <Text style={[styles.privateAuthor, { color: mine ? palette.background : palette.muted }]}>
            {mine ? "You" : name}
          </Text>
          {!deleted ? (
            <MessageMoreButton
              color={mine ? palette.background : palette.muted}
              onPress={() => onMore(message)}
            />
          ) : null}
        </View>
        <Text
          style={[
            styles.privateMessageText,
            { color: mine ? palette.background : palette.text },
            deleted ? styles.deletedText : null,
          ]}
        >
          {deleted ? getDeletedLabel("private") : message.body}
        </Text>
        <Text style={[styles.privateTime, { color: mine ? palette.background : palette.muted }]}>
          {message.createdAtLabel}
          {message.edited && !deleted ? " - edited" : ""}
        </Text>
      </View>
    </View>
  );
}

function PrivateThreadScreen({
  messages,
  draft,
  onBack,
  onChangeDraft,
  onMenu,
  onMessageAction,
  onSend,
}: {
  messages: ThreadMessage[];
  draft: string;
  onBack: () => void;
  onChangeDraft: (value: string) => void;
  onMenu: () => void;
  onMessageAction: (message: ThreadMessage) => void;
  onSend: () => void;
}) {
  const { palette } = useTheme();
  const scenario = threadLabScenario;
  const scrollRef = useRef<ScrollView>(null);
  const participants = useMemo(
    () => [scenario.owner, scenario.applicant],
    [scenario.applicant, scenario.owner],
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 80);
    return () => clearTimeout(timeout);
  }, [messages.length]);

  return (
    <>
      <ScreenHeader title="Private thread" onBack={onBack} onMenu={onMenu} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.threadScreenBody}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.privateMessagesContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.dayLabel, { color: palette.muted }]}>Today</Text>
          {messages.map((message) => (
            <PrivateMessageBubble
              key={message.id}
              message={message}
              participants={participants}
              onMore={onMessageAction}
            />
          ))}
        </ScrollView>
        <ThreadComposer
          value={draft}
          onChangeText={onChangeDraft}
          onSend={onSend}
          placeholder="Message..."
        />
      </KeyboardAvoidingView>
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

function DeleteConfirmDialog({
  kind,
  visible,
  onCancel,
  onConfirm,
}: {
  kind: MessageKind;
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { palette } = useTheme();
  const label = getMessageLabel(kind);

  return (
    <Modal
      animationType="fade"
      transparent
      statusBarTranslucent
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.confirmDialog,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Text style={[styles.confirmTitle, { color: palette.text }]}>
            Delete this {label}?
          </Text>
          <Text style={[styles.confirmText, { color: palette.muted }]}>
            This will hide the {label} from the conversation. This cannot be undone here.
          </Text>
          <View style={styles.confirmActions}>
            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              style={({ pressed }) => [styles.confirmButton, pressed ? styles.pressed : null]}
            >
              <Text style={[styles.confirmCancelText, { color: palette.muted }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              accessibilityRole="button"
              style={({ pressed }) => [styles.confirmButton, pressed ? styles.pressed : null]}
            >
              <Text style={[styles.confirmDeleteText, { color: palette.text }]}>Delete</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function MessagePreview({
  kind,
  message,
  participants,
}: {
  kind: MessageKind;
  message: ThreadMessage;
  participants: ThreadParticipant[];
}) {
  const { palette } = useTheme();
  const name = getParticipantName(participants, message.authorId);

  return (
    <View style={styles.actionPreview}>
      <Text style={[styles.actionKicker, { color: palette.muted }]}>
        {kind === "public" ? "PUBLIC COMMENT" : "PRIVATE MESSAGE"}
      </Text>
      <Text style={[styles.actionPreviewName, { color: palette.text }]}>{name}</Text>
      <Text style={[styles.actionPreviewText, { color: palette.text }]}>
        {message.deleted ? getDeletedLabel(kind) : message.body}
      </Text>
    </View>
  );
}

function MessageActionsScreen({
  kind,
  message,
  participants,
  onBack,
  onDelete,
  onEdit,
  onReport,
}: {
  kind: MessageKind;
  message: ThreadMessage;
  participants: ThreadParticipant[];
  onBack: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onReport: () => void;
}) {
  const mine = message.authorId === currentUserId;
  const label = getMessageLabel(kind);

  return (
    <>
      <ScreenHeader title={`${label[0].toUpperCase()}${label.slice(1)} actions`} onBack={onBack} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <MessagePreview kind={kind} message={message} participants={participants} />
        <FullBleedDivider />
        {mine ? (
          <>
            <RowButton title={`Edit ${label}`} onPress={onEdit} />
            <FullBleedDivider />
            <RowButton title={`Delete ${label}`} onPress={onDelete} />
            <FullBleedDivider />
          </>
        ) : (
          <>
            <RowButton title={`Report ${label}`} onPress={onReport} />
            <FullBleedDivider />
          </>
        )}
        <RowButton title="Cancel" onPress={onBack} />
        <FullBleedDivider />
      </ScrollView>
    </>
  );
}

function EditMessageScreen({
  kind,
  draft,
  onBack,
  onChangeDraft,
  onSave,
}: {
  kind: MessageKind;
  draft: string;
  onBack: () => void;
  onChangeDraft: (value: string) => void;
  onSave: () => void;
}) {
  const { palette } = useTheme();
  const canSave = draft.trim().length > 0;
  const label = getMessageLabel(kind);

  return (
    <>
      <ScreenHeader title={`Edit ${label}`} onBack={onBack} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.editScreenBody}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Editing {label}</Text>
          <TextInput
            value={draft}
            onChangeText={onChangeDraft}
            placeholder={`Write your ${label}...`}
            placeholderTextColor={palette.muted}
            multiline
            autoFocus
            style={[styles.editInput, { borderColor: palette.border, color: palette.text }]}
          />
        </ScrollView>
        <View style={[styles.editFooter, { borderTopColor: palette.border }]}>
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            style={({ pressed }) => [styles.footerButton, pressed ? styles.pressed : null]}
          >
            <Text style={[styles.footerButtonText, { color: palette.muted }]}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={onSave}
            disabled={!canSave}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.footerButton,
              pressed && canSave ? styles.pressed : null,
              !canSave ? styles.disabled : null,
            ]}
          >
            <Text style={[styles.footerButtonText, { color: palette.text }]}>Save</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

function ReportMessageScreen({
  kind,
  message,
  participants,
  reason,
  onBack,
  onSelectReason,
  onSubmit,
}: {
  kind: MessageKind;
  message: ThreadMessage;
  participants: ThreadParticipant[];
  reason: string;
  onBack: () => void;
  onSelectReason: (reason: string) => void;
  onSubmit: () => void;
}) {
  const { palette } = useTheme();
  const label = getMessageLabel(kind);
  const canSubmit = reason.length > 0;

  return (
    <>
      <ScreenHeader title={`Report ${label}`} onBack={onBack} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <MessagePreview kind={kind} message={message} participants={participants} />
        <FullBleedDivider />
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Why are you reporting this?</Text>
        {reportReasons.map((item) => (
          <React.Fragment key={item}>
            <Pressable
              onPress={() => onSelectReason(item)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.reasonRow, pressed ? styles.pressed : null]}
            >
              <Text style={[styles.rowButtonTitle, { color: palette.text }]}>{item}</Text>
              <Text style={[styles.checkmark, { color: palette.text }]}>{reason === item ? "x" : ""}</Text>
            </Pressable>
            <FullBleedDivider />
          </React.Fragment>
        ))}
        <Pressable
          onPress={onSubmit}
          disabled={!canSubmit}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.submitReportButton,
            { borderColor: palette.border },
            pressed && canSubmit ? styles.pressed : null,
            !canSubmit ? styles.disabled : null,
          ]}
        >
          <Text style={[styles.submitReportText, { color: palette.text }]}>Submit report</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

function ReportSentScreen({ onBack }: { onBack: () => void }) {
  const { palette } = useTheme();

  return (
    <>
      <ScreenHeader title="Report sent" onBack={onBack} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={[styles.detailPageTitle, { color: palette.text }]}>
          Thanks. This helps keep Hellowhen safe.
        </Text>
        <Text style={[styles.guideText, { color: palette.muted }]}>
          This is a mock-only lab confirmation. In the real app, this action would create a moderation report.
        </Text>
        <FullBleedDivider />
        <RowButton title="Back to thread" onPress={onBack} />
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
  const [threadKind, setThreadKind] = useState<MessageKind>("public");
  const [actionTarget, setActionTarget] = useState<MessageActionTarget | null>(null);
  const [publicMessages, setPublicMessages] = useState<ThreadMessage[]>(
    threadLabScenario.publicMessages,
  );
  const [privateMessages, setPrivateMessages] = useState<ThreadMessage[]>(
    threadLabScenario.privateMessages,
  );
  const [publicDraft, setPublicDraft] = useState("");
  const [privateDraft, setPrivateDraft] = useState("");
  const [editDraft, setEditDraft] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  const participants = useMemo(
    () => [threadLabScenario.owner, threadLabScenario.applicant],
    [],
  );

  const selectedMessage = actionTarget
    ? ((actionTarget.kind === "public" ? publicMessages : privateMessages).find(
        (message) => message.id === actionTarget.messageId,
      ) ?? null)
    : null;

  const openThread = (kind: MessageKind) => {
    setThreadKind(kind);
    setView(kind);
  };

  const openMenu = (kind: MessageKind) => {
    setThreadKind(kind);
    setView(kind === "public" ? "public-menu" : "private-menu");
  };

  const backToThread = () => setView(threadKind);

  const openMessageActions = (kind: MessageKind, message: ThreadMessage) => {
    setThreadKind(kind);
    setActionTarget({ kind, messageId: message.id });
    setView("message-actions");
  };

  const updateSelectedMessage = (update: (message: ThreadMessage) => ThreadMessage) => {
    if (!actionTarget) return;
    const setter = actionTarget.kind === "public" ? setPublicMessages : setPrivateMessages;
    setter((messages) =>
      messages.map((message) =>
        message.id === actionTarget.messageId ? update(message) : message,
      ),
    );
  };

  const requestDeleteSelectedMessage = () => {
    setDeleteConfirmVisible(true);
  };

  const confirmDeleteSelectedMessage = () => {
    if (!actionTarget) return;
    updateSelectedMessage((message) => ({
      ...message,
      body: "",
      deleted: true,
      edited: false,
    }));
    setDeleteConfirmVisible(false);
    setView(actionTarget.kind);
  };

  const cancelDeleteSelectedMessage = () => {
    setDeleteConfirmVisible(false);
  };

  const startEditingSelectedMessage = () => {
    if (!selectedMessage) return;
    setEditDraft(selectedMessage.body);
    setView("edit-message");
  };

  const saveEditedMessage = () => {
    const nextBody = editDraft.trim();
    if (!actionTarget || !nextBody) return;
    updateSelectedMessage((message) => ({
      ...message,
      body: nextBody,
      edited: true,
      deleted: false,
    }));
    setEditDraft("");
    setView(actionTarget.kind);
  };

  const startReportSelectedMessage = () => {
    setReportReason("");
    setView("report-message");
  };

  const submitReport = () => {
    if (!reportReason) return;
    setView("report-sent");
  };

  const sendPublicMessage = () => {
    const nextMessage = publicDraft.trim();
    if (!nextMessage) return;
    setPublicMessages((messages) => [...messages, buildLocalMessage(nextMessage)]);
    setPublicDraft("");
  };

  const sendPrivateMessage = () => {
    const nextMessage = privateDraft.trim();
    if (!nextMessage) return;
    setPrivateMessages((messages) => [...messages, buildLocalMessage(nextMessage)]);
    setPrivateDraft("");
  };

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <Stack.Screen options={{ title: "Thread Lab", headerShown: false }} />
      {view === "home" ? <HomeScreen onOpen={openThread} /> : null}
      {view === "public" ? (
        <PublicThreadScreen
          messages={publicMessages}
          draft={publicDraft}
          onBack={() => setView("home")}
          onChangeDraft={setPublicDraft}
          onMenu={() => openMenu("public")}
          onMessageAction={(message) => openMessageActions("public", message)}
          onSend={sendPublicMessage}
        />
      ) : null}
      {view === "private" ? (
        <PrivateThreadScreen
          messages={privateMessages}
          draft={privateDraft}
          onBack={() => setView("home")}
          onChangeDraft={setPrivateDraft}
          onMenu={() => openMenu("private")}
          onMessageAction={(message) => openMessageActions("private", message)}
          onSend={sendPrivateMessage}
        />
      ) : null}
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
      {view === "message-actions" && actionTarget && selectedMessage ? (
        <MessageActionsScreen
          kind={actionTarget.kind}
          message={selectedMessage}
          participants={participants}
          onBack={backToThread}
          onDelete={requestDeleteSelectedMessage}
          onEdit={startEditingSelectedMessage}
          onReport={startReportSelectedMessage}
        />
      ) : null}
      {view === "edit-message" && actionTarget ? (
        <EditMessageScreen
          kind={actionTarget.kind}
          draft={editDraft}
          onBack={() => setView("message-actions")}
          onChangeDraft={setEditDraft}
          onSave={saveEditedMessage}
        />
      ) : null}
      {view === "report-message" && actionTarget && selectedMessage ? (
        <ReportMessageScreen
          kind={actionTarget.kind}
          message={selectedMessage}
          participants={participants}
          reason={reportReason}
          onBack={() => setView("message-actions")}
          onSelectReason={setReportReason}
          onSubmit={submitReport}
        />
      ) : null}
      {view === "report-sent" ? <ReportSentScreen onBack={backToThread} /> : null}
      {view === "details" ? <DetailsScreen onBack={backToThread} /> : null}
      {view === "guide" ? <GuideScreen onBack={backToThread} /> : null}
      {actionTarget ? (
        <DeleteConfirmDialog
          kind={actionTarget.kind}
          visible={deleteConfirmVisible}
          onCancel={cancelDeleteSelectedMessage}
          onConfirm={confirmDeleteSelectedMessage}
        />
      ) : null}
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
  disabled: {
    opacity: 0.45,
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
  threadScreenBody: {
    flex: 1,
  },
  threadMessagesContent: {
    paddingHorizontal: 18,
    paddingBottom: 20,
    paddingTop: 6,
    gap: 0,
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
  deletedText: {
    fontStyle: "italic",
  },
  moreButton: {
    minHeight: 28,
    minWidth: 28,
    alignItems: "flex-end",
    justifyContent: "center",
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
  privateBubbleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
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
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingTop: 10,
    gap: 14,
  },
  bottomComposerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
  },
  composerInput: {
    flex: 1,
    maxHeight: 104,
    minHeight: 38,
    paddingTop: 9,
    paddingBottom: 8,
    fontSize: 13,
    fontWeight: "800",
  },
  sendButton: {
    minHeight: 38,
    justifyContent: "center",
    paddingLeft: 8,
  },
  actionPreview: {
    gap: 8,
  },
  actionKicker: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.05,
  },
  actionPreviewName: {
    fontSize: 15,
    fontWeight: "900",
  },
  actionPreviewText: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  editScreenBody: {
    flex: 1,
  },
  editInput: {
    minHeight: 180,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21,
    textAlignVertical: "top",
  },
  editFooter: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  footerButton: {
    minHeight: 40,
    justifyContent: "center",
  },
  footerButtonText: {
    fontSize: 14,
    fontWeight: "900",
  },
  reasonRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 12,
  },
  checkmark: {
    minWidth: 24,
    textAlign: "right",
    fontSize: 16,
    fontWeight: "900",
  },
  submitReportButton: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    marginTop: 4,
  },
  submitReportText: {
    fontSize: 14,
    fontWeight: "900",
  },
  modalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    paddingHorizontal: 24,
  },
  confirmDialog: {
    width: "100%",
    maxWidth: 340,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 10,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  confirmText: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  confirmActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 18,
    marginTop: 6,
  },
  confirmButton: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  confirmCancelText: {
    fontSize: 14,
    fontWeight: "900",
  },
  confirmDeleteText: {
    fontSize: 14,
    fontWeight: "900",
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

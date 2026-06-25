import { Stack, router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/providers/ThemeProvider";

import { meHubSections, myPlaceLibrary, navLabTabs, placeLibraryFilters, placeLibraryGroups, planPreviews, starterPlaceLibrary, tradeFilters, tradePreviews } from "./navLab.mockData";
import type { MeHubSection, MeHubSectionId, NavLabTabId, PlaceLibraryFilterId, PlaceLibraryItem, PlaceLibrarySource, PlanMode, PlanPlaceKind, PlanPlacePreview, PlanPreview, TradeFilterId, TradePreview } from "./navLab.types";

const desktopBreakpoint = 820;
const meOrderStorageKey = "hellowhen-nav-lab-me-section-order-v1";
const defaultMeSectionOrder: MeHubSectionId[] = ["activity", "plans", "tools", "account"];

function normalizeSectionOrder(order: string[] | null | undefined): MeHubSectionId[] {
  const validIds = new Set(defaultMeSectionOrder);
  const cleanOrder = (order ?? []).filter((id): id is MeHubSectionId => validIds.has(id as MeHubSectionId));
  return [...cleanOrder, ...defaultMeSectionOrder.filter((id) => !cleanOrder.includes(id))];
}

function readStoredSectionOrder() {
  if (Platform.OS !== "web") {
    return defaultMeSectionOrder;
  }

  try {
    const storage = (globalThis as any).localStorage as { getItem?: (key: string) => string | null } | undefined;
    const rawValue = storage?.getItem?.(meOrderStorageKey);

    if (!rawValue) {
      return defaultMeSectionOrder;
    }

    const parsedValue = JSON.parse(rawValue);
    return normalizeSectionOrder(Array.isArray(parsedValue) ? parsedValue : null);
  } catch {
    return defaultMeSectionOrder;
  }
}

function persistSectionOrder(order: MeHubSectionId[]) {
  if (Platform.OS !== "web") {
    return;
  }

  try {
    const storage = (globalThis as any).localStorage as { setItem?: (key: string, value: string) => void } | undefined;
    storage?.setItem?.(meOrderStorageKey, JSON.stringify(order));
  } catch {
    // Local persistence is best-effort for this isolated lab.
  }
}

function moveSectionOrder(order: MeHubSectionId[], sectionId: MeHubSectionId, direction: -1 | 1) {
  const nextOrder = [...order];
  const currentIndex = nextOrder.indexOf(sectionId);
  const targetIndex = currentIndex + direction;

  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= nextOrder.length) {
    return nextOrder;
  }

  [nextOrder[currentIndex], nextOrder[targetIndex]] = [nextOrder[targetIndex], nextOrder[currentIndex]];
  return nextOrder;
}

function getOrderedSections(order: MeHubSectionId[]) {
  return normalizeSectionOrder(order)
    .map((id) => meHubSections.find((section) => section.id === id))
    .filter((section): section is MeHubSection => Boolean(section));
}

function sectionOrderChanged(order: MeHubSectionId[]) {
  return order.some((id, index) => id !== defaultMeSectionOrder[index]);
}

function getTabTitle(tabId: NavLabTabId) {
  return navLabTabs.find((tab) => tab.id === tabId)?.label ?? "Me";
}

function getPlanModeLabel(plan: PlanPreview) {
  return plan.mode === "mixed" ? "Mixed" : plan.mode === "online" ? "Online" : "Local";
}

const planCurrentUserName = "Kopy";

type PlanFeedFilterId = "explore" | "joined" | "created";

const planFeedFilters: { id: PlanFeedFilterId; label: string; helper: string }[] = [
  { id: "explore", label: "Explore", helper: "All open, online, local, mixed, and draft plan examples." },
  { id: "joined", label: "Joined", helper: "Plans you joined freely in this local lab session." },
  { id: "created", label: "Created", helper: "Mock plans created by Kopy inside this prototype." },
];

function isCurrentUserPlan(plan: PlanPreview) {
  return plan.ownerName === planCurrentUserName;
}

function isPlanJoinable(plan: PlanPreview) {
  return plan.status === "open";
}

function canJoinPlan(plan: PlanPreview, joined: boolean) {
  return isPlanJoinable(plan) && !joined && !isCurrentUserPlan(plan);
}

function getPlanJoinActionLabel(plan: PlanPreview, joined: boolean) {
  if (isCurrentUserPlan(plan)) {
    return "Your plan";
  }

  if (joined) {
    return "Joined";
  }

  if (!isPlanJoinable(plan)) {
    return plan.status === "draft" ? "Preview only" : "Closed";
  }

  return plan.joinLabel;
}

function addCurrentUserToJoinedPreview(joinedPreview: string[]) {
  if (joinedPreview.includes(planCurrentUserName)) {
    return joinedPreview;
  }

  const compactCountItems = joinedPreview.filter((name) => name.startsWith("+"));
  const namedItems = joinedPreview.filter((name) => !name.startsWith("+"));
  return [...namedItems, planCurrentUserName, ...compactCountItems];
}

function isPlanCreatedByCurrentUser(plan: PlanPreview) {
  return plan.ownerName === planCurrentUserName;
}

function getPlanFeedFilterLabel(filterId: PlanFeedFilterId) {
  return planFeedFilters.find((filter) => filter.id === filterId)?.label ?? "Explore";
}

function getFilteredPlans(plans: PlanPreview[], filterId: PlanFeedFilterId, joinedPlanIds: string[]) {
  if (filterId === "created") {
    return plans.filter(isPlanCreatedByCurrentUser);
  }

  if (filterId === "joined") {
    return plans.filter((plan) => joinedPlanIds.includes(plan.id));
  }

  return plans;
}

function getPlanFeedCount(plans: PlanPreview[], filterId: PlanFeedFilterId, joinedPlanIds: string[]) {
  return getFilteredPlans(plans, filterId, joinedPlanIds).length;
}

function getPlanFeedEmptyTitle(filterId: PlanFeedFilterId) {
  if (filterId === "joined") {
    return "No joined plans yet";
  }

  if (filterId === "created") {
    return "No created plans yet";
  }

  return "No plans to explore";
}

function getPlanFeedEmptyCopy(filterId: PlanFeedFilterId) {
  if (filterId === "joined") {
    return "Join an open plan from Explore and it will appear here in this local prototype.";
  }

  if (filterId === "created") {
    return "Create a mock local, online, or mixed plan and it will appear in this view.";
  }

  return "The Plans feed is empty in this lab state. Create a mock plan to test the deck flow.";
}

type PlanCreateStepId = "mode" | "places" | "arrange" | "rules" | "preview";

type PlacePickerSourceId = PlaceLibrarySource | "create_new";

const placePickerSourceOptions: { id: PlacePickerSourceId; label: string; helper: string }[] = [
  ...placeLibraryGroups,
  {
    id: "create_new",
    label: "Create new",
    helper: "Create a reusable offline or online place, save it to My places, then add it to this plan.",
  },
];

type PlanCreateDraft = {
  title: string;
  summary: string;
  category: string;
  mode: PlanMode;
  ownerName: string;
  startLabel: string;
  finalEndLabel: string;
  joinDeadlineLabel: string;
  capacityLabel: string;
  places: PlanPlacePreview[];
};

type PlaceCreateDraft = {
  kind: PlanPlaceKind;
  title: string;
  categoryLabel: string;
  addressOrPlatform: string;
  areaLabel: string;
  description: string;
  imageLabelsText: string;
  tagsText: string;
  accessLabel: string;
  defaultTimeLabel: string;
  defaultDurationLabel: string;
  multilingualNote: string;
  safetyLabel: string;
  defaultNote: string;
};

const planCreateSteps: { id: PlanCreateStepId; label: string; helper: string }[] = [
  { id: "mode", label: "Mode", helper: "Offline, online, or mixed." },
  { id: "places", label: "Places", helper: "Search My places, Starter places, or create new." },
  { id: "arrange", label: "Arrange", helper: "Order places, route notes, and per-stop timing." },
  { id: "rules", label: "Rules", helper: "Join deadline, capacity, final end time, and optional title." },
  { id: "preview", label: "Preview", helper: "Review the generated deck before opening." },
];


function getPlanModeDisplay(mode: PlanMode) {
  return mode === "mixed" ? "Mixed" : mode === "online" ? "Online" : "Local";
}

function getDefaultPlaceKind(mode: PlanMode, index: number): PlanPlacePreview["kind"] {
  if (mode === "online") {
    return "online_place";
  }

  if (mode === "mixed" && index === 0) {
    return "online_place";
  }

  return "local_place";
}

function getDefaultAddressOrPlatform(mode: PlanMode, index: number) {
  const kind = getDefaultPlaceKind(mode, index);

  if (kind === "online_place") {
    return index === 0 ? "Discord" : "Google Meet";
  }

  return index === 0 ? "Paris" : "Add address";
}

function parseClockMinutes(label: string | undefined) {
  const match = (label ?? "").match(/(\d{1,2}):(\d{2})/);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours > 23 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

function formatDurationMinutes(totalMinutes: number) {
  if (totalMinutes <= 0) {
    return "Flexible";
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${minutes}m`;
}

function getDurationBetweenLabels(startLabel: string | undefined, endLabel: string | undefined) {
  const start = parseClockMinutes(startLabel);
  const end = parseClockMinutes(endLabel);

  if (start === null || end === null) {
    return null;
  }

  const normalizedEnd = end >= start ? end : end + 24 * 60;
  return formatDurationMinutes(normalizedEnd - start);
}

function getDerivedStopEndLabel(places: PlanPlacePreview[], index: number, finalEndLabel: string) {
  return places[index].endTimeLabel?.trim() || places[index + 1]?.timeLabel?.trim() || finalEndLabel.trim();
}

function getDerivedStopDurationLabel(places: PlanPlacePreview[], index: number, finalEndLabel: string) {
  const place = places[index];
  const explicitDuration = place.durationLabel?.trim();

  if (explicitDuration) {
    return explicitDuration;
  }

  const endLabel = getDerivedStopEndLabel(places, index, finalEndLabel);
  return getDurationBetweenLabels(place.timeLabel, endLabel) ?? (endLabel ? `Until ${endLabel}` : "Flexible");
}

function getPlanEstimatedDurationLabel(draft: PlanCreateDraft) {
  const firstStart = draft.places[0]?.timeLabel || draft.startLabel;
  const finalEnd = draft.finalEndLabel;
  const exactDuration = getDurationBetweenLabels(firstStart, finalEnd);

  if (exactDuration) {
    return exactDuration;
  }

  if (draft.places.length > 1) {
    const lastStart = draft.places[draft.places.length - 1]?.timeLabel;
    const knownSpan = getDurationBetweenLabels(firstStart, lastStart);
    return knownSpan ? `${knownSpan}+` : "Flexible route";
  }

  return "Flexible";
}

function getPlanTimingMeta(draft: PlanCreateDraft) {
  return `${draft.startLabel || "Flexible start"} · ${draft.finalEndLabel || "no final end yet"} · ${getPlanEstimatedDurationLabel(draft)}`;
}

function createDraftPlace(mode: PlanMode, index: number): PlanPlacePreview {
  const order = index + 1;
  const kind = getDefaultPlaceKind(mode, index);

  return {
    id: `draft-place-${Date.now()}-${order}-${Math.random().toString(16).slice(2, 7)}`,
    kind,
    order,
    title: kind === "online_place" ? `Online stop ${order}` : `Local place ${order}`,
    addressOrPlatform: getDefaultAddressOrPlatform(mode, index),
    timeLabel: order === 1 ? "15:00" : `${15 + index}:00`,
    endTimeLabel: "",
    durationLabel: "",
    note: order === 1 ? "Meet, say hello, and start the plan." : "Continue the plan in this ordered stop.",
    meetingInstruction: kind === "online_place" ? "Link/access can be shared after joining." : "Meet in a public, easy-to-find spot.",
    imageLabel: kind === "online_place" ? "Platform visual" : "Place image",
  };
}

function createDraftPlaceFromLibraryItem(place: PlaceLibraryItem, index: number): PlanPlacePreview {
  const order = index + 1;

  return {
    id: `library-place-${place.id}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
    libraryPlaceId: place.id,
    placeSource: place.source,
    kind: place.kind,
    order,
    title: place.title,
    addressOrPlatform: place.addressOrPlatform,
    timeLabel: place.defaultTimeLabel,
    endTimeLabel: "",
    durationLabel: place.defaultDurationLabel ?? "",
    note: place.defaultNote,
    meetingInstruction: place.kind === "online_place" ? "Verify the link and show the domain clearly before people open it." : "Confirm the exact meeting point after people join.",
    imageLabel: place.imageLabels[0] ?? (place.kind === "online_place" ? "Platform visual" : "Place image"),
  };
}

function getPlacePickerItems(sourceId: PlacePickerSourceId, filterId: PlaceLibraryFilterId, userPlaces: PlaceLibraryItem[], searchText = "") {
  const sourceItems = sourceId === "starter_place" ? starterPlaceLibrary : userPlaces;
  const normalizedSearch = searchText.trim().toLowerCase();

  return sourceItems.filter((place) => {
    if (filterId === "offline" && place.kind !== "local_place") {
      return false;
    }

    if (filterId === "online" && place.kind !== "online_place") {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return [place.title, place.categoryLabel, place.addressOrPlatform, place.areaLabel, place.description, place.accessLabel]
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch);
  });
}

function createInitialPlaceDraft(mode: PlanMode): PlaceCreateDraft {
  const kind: PlanPlaceKind = mode === "online" ? "online_place" : "local_place";

  return {
    kind,
    title: kind === "online_place" ? "New online place" : "New local place",
    categoryLabel: kind === "online_place" ? "Online · Custom" : "Offline · Custom",
    addressOrPlatform: kind === "online_place" ? "Google Meet / Discord / platform" : "Address or area",
    areaLabel: kind === "online_place" ? "Online" : "Local area",
    description: kind === "online_place"
      ? "A reusable online place for calls, group sessions, reviews, or remote plans."
      : "A reusable local place for public meetups, walks, cafes, or offline plans.",
    imageLabelsText: kind === "online_place" ? "Platform visual, Online room" : "Place image, Outside view",
    tagsText: kind === "online_place" ? "remote, group, link" : "public, local, meetup",
    accessLabel: kind === "online_place" ? "Private link shared later" : "Public place",
    defaultTimeLabel: kind === "online_place" ? "Evening" : "Afternoon",
    defaultDurationLabel: kind === "online_place" ? "45 min" : "1h",
    multilingualNote: kind === "online_place" ? "Optional translated access note later." : "Optional translated meeting note later.",
    safetyLabel: kind === "online_place" ? "HTTPS links only · show domain before opening" : "Google address search later · fallback map image",
    defaultNote: kind === "online_place" ? "Open the online room and welcome people." : "Meet in a public place and keep the plan simple.",
  };
}

function normalizePlaceImageLabels(rawValue: string, kind: PlanPlaceKind) {
  const labels = rawValue
    .split(",")
    .map((label) => label.trim())
    .filter(Boolean);

  if (labels.length > 0) {
    return labels.slice(0, 4);
  }

  return [kind === "online_place" ? "Platform visual" : "Place image"];
}

function createLibraryPlaceFromDraft(draft: PlaceCreateDraft): PlaceLibraryItem {
  const title = draft.title.trim() || (draft.kind === "online_place" ? "New online place" : "New local place");
  const slugBase = `${title}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return {
    id: `my-${slugBase}`,
    source: "my_place",
    kind: draft.kind,
    title,
    category: draft.kind === "online_place" ? "online-custom" : "offline-custom",
    categoryLabel: draft.categoryLabel.trim() || (draft.kind === "online_place" ? "Online · Custom" : "Offline · Custom"),
    addressOrPlatform: draft.addressOrPlatform.trim() || (draft.kind === "online_place" ? "Online platform" : "Local address"),
    areaLabel: draft.areaLabel.trim() || (draft.kind === "online_place" ? "Online" : "Local"),
    description: draft.description.trim() || "A reusable place created inside the lab prototype.",
    imageLabels: normalizePlaceImageLabels(draft.imageLabelsText, draft.kind),
    ownerName: planCurrentUserName,
    visibility: draft.kind === "online_place" ? "private" : "public",
    accessLabel: draft.accessLabel.trim() || (draft.kind === "online_place" ? "Private link shared later" : "Public place"),
    defaultTimeLabel: draft.defaultTimeLabel.trim() || "Flexible",
    defaultDurationLabel: draft.defaultDurationLabel.trim() || (draft.kind === "online_place" ? "45 min" : "1h"),
    defaultNote: draft.defaultNote.trim() || "Use this reusable place inside a plan.",
    tags: draft.tagsText.split(",").map((tag) => tag.trim()).filter(Boolean),
    multilingualNote: draft.multilingualNote.trim() || undefined,
    safetyLabel: draft.safetyLabel.trim() || undefined,
    useLabel: draft.kind === "online_place" ? "Use online place" : "Use this place",
  };
}

function canSavePlaceDraft(draft: PlaceCreateDraft) {
  return draft.title.trim().length > 0 && draft.addressOrPlatform.trim().length > 0;
}

function getPlacePickerSourceLabel(sourceId: PlacePickerSourceId) {
  return placePickerSourceOptions.find((source) => source.id === sourceId)?.label ?? "My places";
}

function getPlacePickerFilterLabel(filterId: PlaceLibraryFilterId) {
  return placeLibraryFilters.find((filter) => filter.id === filterId)?.label ?? "All places";
}

function getPlaceLibrarySourceTitle(sourceId: PlaceLibrarySource) {
  return sourceId === "starter_place" ? "Starter places" : "My places";
}

function getPlaceLibrarySourceHelper(sourceId: PlaceLibrarySource) {
  return sourceId === "starter_place"
    ? "Starter places are reusable templates for local and online plans. Later they can become verified official places."
    : "Your reusable offline and online places. Create them separately, then pick them inside the Create Plan wizard.";
}

function getPlaceLibraryVisibleItems(sourceId: PlaceLibrarySource, filterId: PlaceLibraryFilterId, userPlaces: PlaceLibraryItem[], searchText: string) {
  return getPlacePickerItems(sourceId, filterId, userPlaces, searchText);
}

function createPlaceDraftFromLibraryItem(place: PlaceLibraryItem): PlaceCreateDraft {
  return {
    kind: place.kind,
    title: place.title,
    categoryLabel: place.categoryLabel,
    addressOrPlatform: place.addressOrPlatform,
    areaLabel: place.areaLabel,
    description: place.description,
    imageLabelsText: place.imageLabels.join(", "),
    tagsText: place.tags?.join(", ") ?? "",
    accessLabel: place.accessLabel,
    defaultTimeLabel: place.defaultTimeLabel,
    defaultDurationLabel: place.defaultDurationLabel ?? "",
    multilingualNote: place.multilingualNote ?? "",
    safetyLabel: place.safetyLabel ?? "",
    defaultNote: place.defaultNote,
  };
}

function getGeneratedPlanTitleFromPlaces(places: PlanPlacePreview[], mode: PlanMode) {
  const placeNames = places.map((place) => place.title.trim()).filter(Boolean);

  if (placeNames.length === 0) {
    return `${getPlanModeDisplay(mode)} plan`;
  }

  if (placeNames.length <= 3) {
    return placeNames.join(" → ");
  }

  return `${placeNames.slice(0, 2).join(" → ")} + ${placeNames.length - 2} more`;
}

function getGeneratedPlanSummaryFromPlaces(places: PlanPlacePreview[], mode: PlanMode) {
  if (places.length === 0) {
    return `Choose ${getPlanModeDisplay(mode).toLowerCase()} places to build this open plan.`;
  }

  const firstNote = places[0]?.note?.trim();
  const routeLabel = getGeneratedPlanTitleFromPlaces(places, mode);
  const placeLabel = places.length === 1 ? "1 place" : `${places.length} places`;

  return firstNote ? `${routeLabel}. ${firstNote}` : `${routeLabel}. Open plan with ${placeLabel}.`;
}

function getDraftPlanTitle(draft: PlanCreateDraft) {
  return draft.title.trim() || getGeneratedPlanTitleFromPlaces(draft.places, draft.mode);
}

function getDraftPlanSummary(draft: PlanCreateDraft) {
  return draft.summary.trim() || getGeneratedPlanSummaryFromPlaces(draft.places, draft.mode);
}

function createInitialPlanDraft(): PlanCreateDraft {
  return {
    title: "",
    summary: "",
    category: "Local",
    mode: "local",
    ownerName: "Kopy",
    startLabel: "Sat 15:00",
    finalEndLabel: "18:00",
    joinDeadlineLabel: "Join until the plan starts",
    capacityLabel: "Open spots",
    places: [createDraftPlace("local", 0), createDraftPlace("local", 1)],
  };
}

function normalizeDraftPlacesForMode(places: PlanPlacePreview[], mode: PlanMode) {
  return places.map((place, index) => ({
    ...place,
    kind: getDefaultPlaceKind(mode, index),
    order: index + 1,
    addressOrPlatform: place.addressOrPlatform || getDefaultAddressOrPlatform(mode, index),
    imageLabel: place.imageLabel || (getDefaultPlaceKind(mode, index) === "online_place" ? "Platform visual" : "Place image"),
  }));
}

function getPlanPlaceSummary(places: PlanPlacePreview[]) {
  return places.map((place) => place.title).filter(Boolean).slice(0, 4).join(" → ") || "Add places";
}

function buildPlanPreviewFromDraft(draft: PlanCreateDraft): PlanPreview {
  const places = draft.places.map((place, index) => ({
    ...place,
    order: index + 1,
    title: place.title.trim() || `Place ${index + 1}`,
    addressOrPlatform: place.addressOrPlatform.trim() || getDefaultAddressOrPlatform(draft.mode, index),
    timeLabel: place.timeLabel.trim() || "Flexible",
    endTimeLabel: getDerivedStopEndLabel(draft.places, index, draft.finalEndLabel),
    durationLabel: getDerivedStopDurationLabel(draft.places, index, draft.finalEndLabel),
    note: place.note.trim() || "Plan stop note.",
    meetingInstruction: place.meetingInstruction?.trim() || (place.kind === "online_place" ? "Link/access can be shared after joining." : "Meet in a public, easy-to-find spot."),
    imageLabel: place.imageLabel.trim() || (place.kind === "online_place" ? "Platform visual" : "Place image"),
  }));
  const modeLabel = getPlanModeDisplay(draft.mode);
  const generatedTitle = getDraftPlanTitle({ ...draft, places });
  const generatedSummary = getDraftPlanSummary({ ...draft, places });
  const slugBase = `${generatedTitle || "plan"}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return {
    id: `created-${slugBase}`,
    category: draft.category.trim() || modeLabel,
    title: generatedTitle,
    status: "open",
    mode: draft.mode,
    summary: generatedSummary,
    ownerName: draft.ownerName.trim() || "Kopy",
    startLabel: draft.startLabel.trim() || "Flexible",
    finalEndLabel: draft.finalEndLabel.trim() || undefined,
    joinDeadlineLabel: draft.joinDeadlineLabel.trim() || undefined,
    durationLabel: getPlanEstimatedDurationLabel(draft),
    placeSummary: getPlanPlaceSummary(places),
    joinedCount: 1,
    joinedPreview: [draft.ownerName.trim() || "Kopy"],
    capacityLabel: draft.capacityLabel.trim() || "Open spots",
    joinLabel: draft.mode === "online" ? "Join online" : "Join plan",
    places,
  };
}

function getPlanCreateStepValidity(draft: PlanCreateDraft, stepId: PlanCreateStepId) {
  if (stepId === "places" || stepId === "arrange" || stepId === "rules" || stepId === "preview") {
    return draft.places.length > 0;
  }

  return true;
}

function getPlanCreateStepWarning(stepId: PlanCreateStepId) {
  if (stepId === "places" || stepId === "arrange" || stepId === "rules" || stepId === "preview") {
    return "Add at least one reusable place to continue.";
  }

  return "Complete this step before continuing.";
}

function getPlanCreateStepPolishCopy(stepId: PlanCreateStepId) {
  if (stepId === "mode") {
    return "Choose the plan world first. The title will be generated later from selected places.";
  }

  if (stepId === "places") {
    return "Pick reusable places from your library, starter templates, or create a new place on the spot.";
  }

  if (stepId === "arrange") {
    return "Put places in the right order, then translate/polish the note and instruction for each stop.";
  }

  if (stepId === "rules") {
    return "Set joining and timing rules. A custom title or plan note is optional, not required.";
  }

  return "Review the generated summary card and the visual place cards before opening the mock plan.";
}

function getPlanCreatePrimaryLabel(stepId: PlanCreateStepId) {
  if (stepId === "arrange") {
    return "Review deck";
  }

  if (stepId === "preview") {
    return "Open mock plan";
  }

  return "Continue";
}

function getCanOpenCreateStep(draft: PlanCreateDraft, targetStepId: PlanCreateStepId) {
  if (targetStepId === "mode" || targetStepId === "places") {
    return true;
  }

  return getPlanCreateStepValidity(draft, "places");
}

function getPlanCreateProgressPercent(stepIndex: number) {
  return `${Math.round(((stepIndex + 1) / planCreateSteps.length) * 100)}%`;
}

function movePlanPlace(places: PlanPlacePreview[], placeId: string, direction: -1 | 1) {
  const currentIndex = places.findIndex((place) => place.id === placeId);
  const targetIndex = currentIndex + direction;

  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= places.length) {
    return places;
  }

  const nextPlaces = [...places];
  [nextPlaces[currentIndex], nextPlaces[targetIndex]] = [nextPlaces[targetIndex], nextPlaces[currentIndex]];
  return nextPlaces.map((place, index) => ({ ...place, order: index + 1 }));
}

function LabHeader({ activeTab, isDesktop }: { activeTab: NavLabTabId; isDesktop: boolean }) {
  const { mode, palette, toggleMode } = useTheme();
  const insets = useSafeAreaInsets();
  const active = navLabTabs.find((tab) => tab.id === activeTab) ?? navLabTabs[1];

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top + (isDesktop ? 18 : 14),
          borderBottomColor: palette.border,
        },
      ]}
    >
      <View style={styles.headerTopRow}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          style={({ pressed }) => [styles.textButton, pressed ? styles.pressed : null]}
        >
          <Text style={[styles.textButtonLabel, { color: palette.text }]}>{"< Labs"}</Text>
        </Pressable>

        <View style={styles.headerPill}>
          <Text style={[styles.headerPillText, { color: palette.muted }]}>PLAN-LAB19</Text>
        </View>

        <Pressable
          onPress={toggleMode}
          accessibilityRole="button"
          style={({ pressed }) => [styles.textButton, pressed ? styles.pressed : null]}
        >
          <Text style={[styles.textButtonLabel, { color: palette.text }]}>Mode: {mode}</Text>
        </Pressable>
      </View>

      <View style={styles.headerTitleRow}>
        <View style={styles.headerTitleBlock}>
          <Text style={[styles.eyebrow, { color: palette.muted }]}>TITLELESS PLAN WIZARD</Text>
          <Text style={[styles.title, { color: palette.text }]}>{getTabTitle(activeTab)}</Text>
          <Text style={[styles.subtitle, { color: palette.muted }]}>{active.tagline}</Text>
        </View>
      </View>
    </View>
  );
}

function TopTabs({ activeTab, onChange }: { activeTab: NavLabTabId; onChange: (tab: NavLabTabId) => void }) {
  const { palette } = useTheme();

  return (
    <View style={[styles.topTabsWrap, { borderBottomColor: palette.border }]}>
      <View style={[styles.topTabs, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}>
        {navLabTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => onChange(tab.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              style={({ pressed }) => [
                styles.topTabButton,
                isActive ? { backgroundColor: palette.surface } : null,
                pressed ? styles.pressed : null,
                Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null,
              ]}
            >
              <Text style={[styles.topTabLabel, { color: isActive ? palette.text : palette.muted }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function BottomTabs({ activeTab, onChange }: { activeTab: NavLabTabId; onChange: (tab: NavLabTabId) => void }) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bottomTabs,
        {
          paddingBottom: Math.max(insets.bottom, 10),
          borderTopColor: palette.border,
          backgroundColor: palette.surface,
        },
      ]}
    >
      {navLabTabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            style={({ pressed }) => [
              styles.bottomTabButton,
              pressed ? styles.pressed : null,
              Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null,
            ]}
          >
            <View
              style={[
                styles.bottomTabIndicator,
                { backgroundColor: isActive ? palette.text : "transparent" },
              ]}
            />
            <Text
              style={[
                styles.bottomTabLabel,
                { color: isActive ? palette.text : palette.muted },
                isActive ? styles.bottomTabLabelActive : null,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SectionHeader({ label, title }: { label: string; title: string }) {
  const { palette } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionLabel, { color: palette.muted }]}>{label}</Text>
      <Text style={[styles.sectionTitle, { color: palette.text }]}>{title}</Text>
    </View>
  );
}

function getSectionCount(section: MeHubSection) {
  return section.items.reduce((sum, item) => sum + (item.count ?? 0), 0);
}

function SectionCountPill({ section }: { section: MeHubSection }) {
  const { palette } = useTheme();
  const count = getSectionCount(section);

  if (count <= 0) {
    return null;
  }

  return (
    <View style={[styles.sectionCountPill, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
      <Text style={[styles.sectionCountText, { color: palette.text }]}>{count}</Text>
    </View>
  );
}

function MeItemRows({ section }: { section: MeHubSection }) {
  const { palette } = useTheme();

  return (
    <View style={[styles.itemList, { borderTopColor: palette.border }]}>
      {section.items.map((item, index) => (
        <View
          key={item.id}
          style={[
            styles.meItemRow,
            index > 0 ? { borderTopColor: palette.border, borderTopWidth: StyleSheet.hairlineWidth } : null,
          ]}
        >
          <View style={styles.meItemTextBlock}>
            <Text style={[styles.meItemLabel, { color: palette.text }]}>{item.label}</Text>
            {item.subtitle ? (
              <Text style={[styles.meItemSubtitle, { color: palette.muted }]}>{item.subtitle}</Text>
            ) : null}
          </View>
          <View style={styles.meItemRight}>
            {typeof item.count === "number" ? (
              <View style={[styles.countPill, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
                <Text style={[styles.countPillText, { color: palette.text }]}>{item.count}</Text>
              </View>
            ) : null}
            <Text style={[styles.rowChevron, { color: palette.muted }]}>›</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function MobileMeAccordionCard({
  section,
  expanded,
  onToggle,
}: {
  section: MeHubSection;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { palette } = useTheme();

  return (
    <View style={[styles.meSection, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={({ pressed }) => [
          styles.meAccordionHeader,
          pressed ? styles.pressed : null,
          Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null,
        ]}
      >
        <View style={styles.meSectionTitleBlock}>
          <Text style={[styles.cardEyebrow, { color: palette.muted }]}>{section.eyebrow}</Text>
          <View style={styles.meAccordionTitleRow}>
            <Text style={[styles.meSectionTitle, { color: palette.text }]}>{section.title}</Text>
            <SectionCountPill section={section} />
          </View>
        </View>
        <Text style={[styles.mockChevron, { color: palette.muted }]}>{expanded ? "▾" : "▸"}</Text>
      </Pressable>

      <Text style={[styles.meSectionSummary, { color: palette.muted }]}>{section.summary}</Text>

      {expanded ? <MeItemRows section={section} /> : null}
    </View>
  );
}

function DesktopSectionTabs({
  activeSectionId,
  sections,
  onChange,
}: {
  activeSectionId: MeHubSectionId;
  sections: MeHubSection[];
  onChange: (sectionId: MeHubSectionId) => void;
}) {
  const { palette } = useTheme();

  return (
    <View style={[styles.desktopSectionTabs, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}>
      {sections.map((section) => {
        const isActive = activeSectionId === section.id;
        return (
          <Pressable
            key={section.id}
            onPress={() => onChange(section.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            style={({ pressed }) => [
              styles.desktopSectionTab,
              isActive ? { backgroundColor: palette.surface, borderColor: palette.border } : { borderColor: "transparent" },
              pressed ? styles.pressed : null,
              Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null,
            ]}
          >
            <Text style={[styles.desktopSectionTabEyebrow, { color: palette.muted }]}>{section.eyebrow}</Text>
            <View style={styles.desktopSectionTabTitleRow}>
              <Text style={[styles.desktopSectionTabTitle, { color: isActive ? palette.text : palette.muted }]}>
                {section.title}
              </Text>
              <SectionCountPill section={section} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function DesktopMePanel({ section }: { section: MeHubSection }) {
  const { palette } = useTheme();

  return (
    <View style={[styles.desktopMePanel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.desktopMePanelHeader}>
        <View style={styles.meSectionTitleBlock}>
          <Text style={[styles.cardEyebrow, { color: palette.muted }]}>{section.eyebrow}</Text>
          <Text style={[styles.desktopMePanelTitle, { color: palette.text }]}>{section.title}</Text>
          <Text style={[styles.desktopMePanelSummary, { color: palette.muted }]}>{section.summary}</Text>
        </View>
        <SectionCountPill section={section} />
      </View>
      <MeItemRows section={section} />
    </View>
  );
}

function ReorderControlButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { palette } = useTheme();

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [
        styles.reorderControlButton,
        {
          borderColor: palette.border,
          backgroundColor: disabled ? palette.surfaceAlt : palette.surface,
          opacity: disabled ? 0.42 : 1,
        },
        pressed && !disabled ? styles.pressed : null,
        Platform.OS === "web" && !disabled ? ({ cursor: "pointer" } as any) : null,
      ]}
    >
      <Text style={[styles.reorderControlText, { color: palette.text }]}>{label}</Text>
    </Pressable>
  );
}

function MobileMeOrderCard({
  section,
  index,
  totalSections,
  onMoveUp,
  onMoveDown,
}: {
  section: MeHubSection;
  index: number;
  totalSections: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { palette } = useTheme();

  return (
    <View style={[styles.reorderCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.reorderHandle}>
        <Text style={[styles.reorderHandleIcon, { color: palette.muted }]}>☰</Text>
        <Text style={[styles.reorderIndex, { color: palette.muted }]}>{index + 1}</Text>
      </View>
      <View style={styles.reorderTextBlock}>
        <Text style={[styles.cardEyebrow, { color: palette.muted }]}>{section.eyebrow}</Text>
        <View style={styles.meAccordionTitleRow}>
          <Text style={[styles.reorderTitle, { color: palette.text }]}>{section.title}</Text>
          <SectionCountPill section={section} />
        </View>
        <Text style={[styles.reorderSummary, { color: palette.muted }]}>{section.summary}</Text>
      </View>
      <View style={styles.reorderControls}>
        <ReorderControlButton label="↑" disabled={index === 0} onPress={onMoveUp} />
        <ReorderControlButton label="↓" disabled={index === totalSections - 1} onPress={onMoveDown} />
      </View>
    </View>
  );
}

function MobileMeHub({
  sections,
  expandedSectionIds,
  customizeMode,
  canResetOrder,
  onToggleSection,
  onToggleCustomizeMode,
  onMoveSection,
  onResetOrder,
}: {
  sections: MeHubSection[];
  expandedSectionIds: MeHubSectionId[];
  customizeMode: boolean;
  canResetOrder: boolean;
  onToggleSection: (sectionId: MeHubSectionId) => void;
  onToggleCustomizeMode: () => void;
  onMoveSection: (sectionId: MeHubSectionId, direction: -1 | 1) => void;
  onResetOrder: () => void;
}) {
  const { palette } = useTheme();

  if (customizeMode) {
    return (
      <>
        <View style={styles.mobileHubToolbar}>
          <SectionHeader label="CUSTOMIZE ME" title="Reorder sections for small screens" />
          <Text style={[styles.customizeHint, { color: palette.muted }]}>
            Section order is local to this lab prototype. Main navigation stays fixed.
          </Text>
          <View style={styles.customizeActions}>
            <Pressable
              onPress={onResetOrder}
              accessibilityRole="button"
              disabled={!canResetOrder}
              style={({ pressed }) => [
                styles.secondaryActionButton,
                { borderColor: palette.border, opacity: canResetOrder ? 1 : 0.45 },
                pressed && canResetOrder ? styles.pressed : null,
                Platform.OS === "web" && canResetOrder ? ({ cursor: "pointer" } as any) : null,
              ]}
            >
              <Text style={[styles.secondaryActionText, { color: palette.text }]}>Reset default</Text>
            </Pressable>
            <Pressable
              onPress={onToggleCustomizeMode}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.primaryActionButton,
                { backgroundColor: palette.text },
                pressed ? styles.pressed : null,
                Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null,
              ]}
            >
              <Text style={[styles.primaryActionText, { color: palette.background }]}>Done</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.meStack}>
          {sections.map((section, index) => (
            <MobileMeOrderCard
              key={section.id}
              section={section}
              index={index}
              totalSections={sections.length}
              onMoveUp={() => onMoveSection(section.id, -1)}
              onMoveDown={() => onMoveSection(section.id, 1)}
            />
          ))}
        </View>
      </>
    );
  }

  return (
    <>
      <View style={styles.mobileHubToolbar}>
        <SectionHeader label="MOBILE ME HUB" title="Tap sections to expand or collapse" />
        <Pressable
          onPress={onToggleCustomizeMode}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.customizeButton,
            { borderColor: palette.border, backgroundColor: palette.surfaceAlt },
            pressed ? styles.pressed : null,
            Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null,
          ]}
        >
          <Text style={[styles.customizeButtonText, { color: palette.text }]}>Customize order</Text>
        </Pressable>
      </View>

      <View style={styles.meStack}>
        {sections.map((section) => (
          <MobileMeAccordionCard
            key={section.id}
            section={section}
            expanded={expandedSectionIds.includes(section.id)}
            onToggle={() => onToggleSection(section.id)}
          />
        ))}
      </View>
    </>
  );
}

function DesktopMeHub({
  sections,
  activeSectionId,
  onChangeSection,
}: {
  sections: MeHubSection[];
  activeSectionId: MeHubSectionId;
  onChangeSection: (sectionId: MeHubSectionId) => void;
}) {
  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[0];

  return (
    <>
      <SectionHeader label="DESKTOP ME HUB" title="Tabs mirror the current section order" />
      <DesktopSectionTabs sections={sections} activeSectionId={activeSectionId} onChange={onChangeSection} />
      <DesktopMePanel section={activeSection} />
    </>
  );
}

function MeScreen({ isDesktop }: { isDesktop: boolean }) {
  const { palette } = useTheme();
  const [expandedSectionIds, setExpandedSectionIds] = useState<MeHubSectionId[]>(["activity"]);
  const [activeDesktopSectionId, setActiveDesktopSectionId] = useState<MeHubSectionId>("activity");
  const [sectionOrder, setSectionOrder] = useState<MeHubSectionId[]>(() => readStoredSectionOrder());
  const [customizeMode, setCustomizeMode] = useState(false);
  const orderedSections = useMemo(() => getOrderedSections(sectionOrder), [sectionOrder]);
  const totalCount = useMemo(
    () =>
      meHubSections.reduce(
        (sum, section) => sum + section.items.reduce((inner, item) => inner + (item.count ?? 0), 0),
        0
      ),
    []
  );

  useEffect(() => {
    persistSectionOrder(sectionOrder);
  }, [sectionOrder]);

  const toggleSection = (sectionId: MeHubSectionId) => {
    setExpandedSectionIds((current) =>
      current.includes(sectionId) ? current.filter((id) => id !== sectionId) : [...current, sectionId]
    );
  };

  const moveSection = (sectionId: MeHubSectionId, direction: -1 | 1) => {
    setSectionOrder((current) => moveSectionOrder(normalizeSectionOrder(current), sectionId, direction));
  };

  const resetSectionOrder = () => {
    setSectionOrder(defaultMeSectionOrder);
  };

  return (
    <View style={styles.tabContent}>
      <View style={[styles.profilePanel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={[styles.avatar, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}>
          <Text style={[styles.avatarText, { color: palette.text }]}>K</Text>
        </View>
        <View style={styles.profileTextBlock}>
          <Text style={[styles.profileTitle, { color: palette.text }]}>Kopy</Text>
          <Text style={[styles.profileSubtitle, { color: palette.muted }]}>Paris · Hellowhen member</Text>
        </View>
        <View style={[styles.profileStatPill, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
          <Text style={[styles.profileStatValue, { color: palette.text }]}>{totalCount}</Text>
          <Text style={[styles.profileStatLabel, { color: palette.muted }]}>mock items</Text>
        </View>
      </View>

      {isDesktop ? (
        <DesktopMeHub
          sections={orderedSections}
          activeSectionId={activeDesktopSectionId}
          onChangeSection={setActiveDesktopSectionId}
        />
      ) : (
        <MobileMeHub
          sections={orderedSections}
          expandedSectionIds={expandedSectionIds}
          customizeMode={customizeMode}
          canResetOrder={sectionOrderChanged(sectionOrder)}
          onToggleSection={toggleSection}
          onToggleCustomizeMode={() => setCustomizeMode((current) => !current)}
          onMoveSection={moveSection}
          onResetOrder={resetSectionOrder}
        />
      )}
    </View>
  );
}

function PlanActionButton({
  label,
  primary,
  disabled,
  onPress,
}: {
  label: string;
  primary?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const { palette } = useTheme();

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.planActionButton,
        {
          borderColor: palette.border,
          backgroundColor: primary ? palette.text : palette.surfaceAlt,
          opacity: disabled ? 0.48 : 1,
        },
        pressed && !disabled ? styles.pressed : null,
        Platform.OS === "web" && !disabled ? ({ cursor: "pointer" } as any) : null,
      ]}
    >
      <Text style={[styles.planActionText, { color: primary ? palette.background : palette.text }]}>{label}</Text>
    </Pressable>
  );
}

function PlanMiniStat({ label, value }: { label: string; value: string | number }) {
  const { palette } = useTheme();

  return (
    <View style={[styles.planMiniStat, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
      <Text style={[styles.planMiniStatValue, { color: palette.text }]}>{value}</Text>
      <Text style={[styles.planMiniStatLabel, { color: palette.muted }]}>{label}</Text>
    </View>
  );
}

function PlanModeBadge({ label }: { label: string }) {
  const { palette } = useTheme();

  return (
    <View style={[styles.planModeBadge, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
      <Text style={[styles.planModeBadgeText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

function getPlaceMediaFallbackLabel(kind: PlanPlaceKind) {
  return kind === "online_place" ? "PLATFORM VISUAL" : "MAP / PHOTO FALLBACK";
}

function getPlaceMediaFallbackHelper(kind: PlanPlaceKind) {
  return kind === "online_place" ? "Online platform-style fallback" : "Map-style offline fallback";
}

function getPlaceMediaChipLabel(kind: PlanPlaceKind) {
  return kind === "online_place" ? "Platform" : "Map fallback";
}

function PlanPlaceRoute({ places }: { places: PlanPlacePreview[] }) {
  const { palette } = useTheme();

  return (
    <View style={styles.planDeckRouteRow}>
      {places.map((place, index) => (
        <React.Fragment key={place.id}>
          <View style={[styles.planDeckRouteStep, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
            <Text style={[styles.planDeckRouteOrder, { color: palette.text }]}>{place.order}</Text>
            <Text numberOfLines={1} style={[styles.planDeckRouteTitle, { color: palette.muted }]}>{place.title}</Text>
          </View>
          {index < places.length - 1 ? <Text style={[styles.planDeckRouteArrow, { color: palette.muted }]}>→</Text> : null}
        </React.Fragment>
      ))}
    </View>
  );
}

function PlanSummaryDeckBody({
  plan,
  eyebrow,
  rightLabels,
}: {
  plan: PlanPreview;
  eyebrow: string;
  rightLabels: string[];
}) {
  const { mode, palette } = useTheme();
  const modeLabel = getPlanModeLabel(plan);
  const routeLabel = plan.places.map((place) => place.title).join(" → ");
  const totalCards = plan.places.length + 1;
  const summarySurface = mode === "dark" ? palette.surfaceAlt : palette.surface;

  return (
    <View style={[styles.planSummarySurface, { borderColor: palette.border, backgroundColor: summarySurface }]}>
      <View style={styles.cardTopLine}>
        <Text style={[styles.cardEyebrow, { color: palette.muted }]}>{eyebrow}</Text>
        <View style={styles.planTopTags}>
          {rightLabels.map((label) => (
            <View key={label} style={[styles.smallTag, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
              <Text style={[styles.smallTagText, { color: palette.text }]}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.planSummaryCenterBlock}>
        <Text style={[styles.planSummaryModeLabel, { color: palette.muted }]}>{plan.category} · {modeLabel} plan</Text>
        <Text style={[styles.planSummaryDeckTitle, { color: palette.text }]} numberOfLines={2}>{plan.title}</Text>
        <Text style={[styles.planSummaryDeckCopy, { color: palette.muted }]} numberOfLines={3}>{plan.summary}</Text>
        <Text style={[styles.planSummaryRouteLine, { color: palette.text }]} numberOfLines={2}>{routeLabel}</Text>
      </View>

      <PlanPlaceRoute places={plan.places} />

      <View style={[styles.planSummaryMetaRow, { borderTopColor: palette.border }]}>
        <Text style={[styles.planSummaryMetaText, { color: palette.muted }]}>{plan.startLabel}{plan.finalEndLabel ? ` → ${plan.finalEndLabel}` : ""} · {plan.durationLabel ?? "Flexible"} · {plan.places.length} places · {plan.joinedCount} joined</Text>
        <Text style={[styles.planSummaryCardCount, { color: palette.text }]}>01/{String(totalCards).padStart(2, "0")}</Text>
      </View>
    </View>
  );
}

function PlanPlacePosterBackdrop({ place }: { place: PlanPlacePreview }) {
  const { palette } = useTheme();
  const isOnline = place.kind === "online_place";
  const mapLines = Array.from({ length: 5 }, (_, index) => index);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.planPosterBackdrop, { backgroundColor: isOnline ? palette.deckSurface2 : palette.deckSurface1 }]}>
      <View style={[styles.planPosterGlow, { backgroundColor: isOnline ? palette.deckSurface1 : palette.deckSurface2 }]} />

      {isOnline ? (
        <View style={styles.planPosterPlatformMockup}>
          <View style={styles.planPosterPlatformHeader}>
            <View style={styles.planPosterPlatformDot} />
            <View style={styles.planPosterPlatformDot} />
            <View style={styles.planPosterPlatformDot} />
          </View>
          <View style={styles.planPosterPlatformBody}>
            <View style={styles.planPosterPlatformSidebar} />
            <View style={styles.planPosterPlatformMain}>
              <View style={styles.planPosterPlatformLineWide} />
              <View style={styles.planPosterPlatformLine} />
              <View style={styles.planPosterPlatformGridRow}>
                <View style={styles.planPosterPlatformTile} />
                <View style={styles.planPosterPlatformTile} />
              </View>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.planPosterMapMockup}>
          {mapLines.map((line) => (
            <View
              key={`map-road-${place.id}-${line}`}
              style={[
                styles.planPosterMapRoad,
                {
                  top: 34 + line * 44,
                  left: line % 2 === 0 ? -28 : 28,
                  right: line % 2 === 0 ? 24 : -20,
                  transform: [{ rotate: line % 2 === 0 ? "-8deg" : "10deg" }],
                },
              ]}
            />
          ))}
          <View style={[styles.planPosterMapPin, styles.planPosterMapPinPrimary]} />
          <View style={[styles.planPosterMapPin, styles.planPosterMapPinSecondary]} />
          <View style={[styles.planPosterMapPin, styles.planPosterMapPinTertiary]} />
        </View>
      )}

      <View style={styles.planPosterMediaLabelPanel}>
        <Text style={styles.planPosterFallbackKicker}>{getPlaceMediaFallbackHelper(place.kind)}</Text>
        <Text style={styles.planPosterVisualLabel}>{place.imageLabel || (isOnline ? "Platform visual" : "Place image")}</Text>
      </View>
    </View>
  );
}

function PlanCard({
  plan,
  expanded,
  joined,
  onToggle,
  onOpenDetail,
  onJoinPress,
  onCreateSimilar,
}: {
  plan: PlanPreview;
  expanded: boolean;
  joined: boolean;
  onToggle: () => void;
  onOpenDetail: () => void;
  onJoinPress?: () => void;
  onCreateSimilar?: () => void;
}) {
  const { palette } = useTheme();
  const modeLabel = getPlanModeLabel(plan);
  const joinActionLabel = getPlanJoinActionLabel(plan, joined);
  const joinDisabled = !canJoinPlan(plan, joined);
  return (
    <View style={[styles.tradeCard, styles.planDeckCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={({ pressed }) => [
          styles.planDeckPressable,
          pressed ? styles.pressed : null,
          Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null,
        ]}
      >
        <PlanSummaryDeckBody
          plan={plan}
          eyebrow={`PLAN · ${modeLabel.toUpperCase()}`}
          rightLabels={[...(joined ? [isCurrentUserPlan(plan) ? "YOURS" : "JOINED"] : []), plan.status.toUpperCase()]}
        />
      </Pressable>

      {expanded ? (
        <>
          <View style={styles.planStatsRow}>
            <PlanMiniStat label="places" value={plan.places.length} />
            <PlanMiniStat label="joined" value={plan.joinedCount} />
            <PlanMiniStat label="mode" value={modeLabel} />
            <PlanMiniStat label="status" value={plan.status} />
          </View>

          <View style={styles.planPlaceCardStack}>
            {plan.places.map((place) => (
              <PlanDeckPlacePreviewCard key={place.id} place={place} totalPlaces={plan.places.length} />
            ))}
          </View>

          <View style={[styles.nextStepPanel, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
            <Text style={[styles.nextStepLabel, { color: palette.muted }]}>Plan route</Text>
            <Text style={[styles.nextStepText, { color: palette.text }]}>{plan.placeSummary}</Text>
            <Text style={[styles.nextStepMeta, { color: palette.muted }]}>Opened by {plan.ownerName} · {plan.capacityLabel}{plan.joinDeadlineLabel ? ` · ${plan.joinDeadlineLabel}` : ""}</Text>
          </View>
        </>
      ) : null}

      <View style={[styles.cardFooter, { borderTopColor: palette.border }]}>
        <Text style={[styles.footerMeta, { color: palette.muted }]}>{expanded ? "Deck expanded" : "Tap to preview visual place cards"}</Text>
        <Text style={[styles.footerAction, { color: palette.text }]}>{expanded ? "Collapse" : joinActionLabel}</Text>
      </View>

      {expanded ? (
        <View style={styles.planActions}>
          <PlanActionButton label="View plan" primary onPress={onOpenDetail} />
          <PlanActionButton label={joinActionLabel} disabled={joinDisabled} onPress={onJoinPress} />
          <PlanActionButton label="Create similar" onPress={onCreateSimilar} />
        </View>
      ) : null}
    </View>
  );
}

function PlanParticipantChips({ plan }: { plan: PlanPreview }) {
  const { palette } = useTheme();

  return (
    <View style={styles.detailParticipantRow}>
      {plan.joinedPreview.map((name) => (
        <View key={name} style={[styles.participantChip, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
          <Text style={[styles.participantChipText, { color: palette.text }]}>{name}</Text>
        </View>
      ))}
    </View>
  );
}

function PlanDetailPlaceTimeline({ places }: { places: PlanPlacePreview[] }) {
  const { palette } = useTheme();

  return (
    <View style={styles.detailVisualPlaceStack}>
      {places.map((place, index) => (
        <View key={place.id} style={styles.detailVisualPlaceItem}>
          <View style={styles.detailVisualPlaceHeader}>
            <View style={[styles.detailPlaceNumberPill, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
              <Text style={[styles.detailPlaceMarkerText, { color: palette.text }]}>{place.order}</Text>
            </View>
            <View style={styles.planPlaceTextBlock}>
              <Text style={[styles.cardEyebrow, { color: palette.muted }]}>ROUTE STOP {place.order}</Text>
              <Text style={[styles.detailPlaceTitle, { color: palette.text }]}>{place.title}</Text>
              <Text style={[styles.detailPlaceMeta, { color: palette.muted }]}>
                {place.timeLabel}{place.endTimeLabel ? ` → ${place.endTimeLabel}` : ""} · {place.durationLabel ?? "Flexible"} · {place.kind === "online_place" ? "Online platform" : "Local place"} · {place.addressOrPlatform}
              </Text>
            </View>
          </View>

          <PlanDeckPlacePreviewCard place={place} totalPlaces={places.length} />

          {index < places.length - 1 ? <View style={[styles.detailPlaceConnectorLine, { backgroundColor: palette.border }]} /> : null}
        </View>
      ))}
    </View>
  );
}

function PlanDetailPage({
  plan,
  joined,
  onBack,
  onJoinPress,
}: {
  plan: PlanPreview;
  joined: boolean;
  onBack: () => void;
  onJoinPress: () => void;
}) {
  const { palette } = useTheme();
  const modeLabel = getPlanModeLabel(plan);
  const joinActionLabel = getPlanJoinActionLabel(plan, joined);
  const joinDisabled = !canJoinPlan(plan, joined);

  return (
    <View style={styles.tabContent}>
      <View style={[styles.detailHeaderPanel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={styles.detailTopBar}>
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.detailBackButton,
              { borderColor: palette.border, backgroundColor: palette.surfaceAlt },
              pressed ? styles.pressed : null,
              Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null,
            ]}
          >
            <Text style={[styles.detailBackText, { color: palette.text }]}>‹ Plans</Text>
          </Pressable>
          <View style={styles.detailStatusRow}>
            {joined ? <PlanModeBadge label={isCurrentUserPlan(plan) ? "Your plan" : "Joined"} /> : null}
            <PlanModeBadge label={modeLabel} />
            <PlanModeBadge label={plan.status} />
          </View>
        </View>

        <View style={styles.detailSummaryStack}>
          <PlanSummaryDeckBody
            plan={plan}
            eyebrow="PLAN DETAIL · OPEN ACTIVITY"
            rightLabels={[...(joined ? [isCurrentUserPlan(plan) ? "YOURS" : "JOINED"] : []), modeLabel.toUpperCase(), plan.status.toUpperCase()]}
          />

          <View style={[styles.detailQuickActionPanel, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
            <View style={styles.heroTextBlock}>
              <Text style={[styles.cardEyebrow, { color: palette.muted }]}>OPEN PLAN</Text>
              <Text style={[styles.detailActionTitle, { color: palette.text }]}>
                {joined ? (isCurrentUserPlan(plan) ? "This is your open plan." : "You joined this open plan.") : "Join freely without owner approval."}
              </Text>
              <Text style={[styles.detailMetaLine, { color: palette.muted }]}>
                Opened by {plan.ownerName} · {plan.startLabel}{plan.finalEndLabel ? ` → ${plan.finalEndLabel}` : ""} · {plan.capacityLabel}
              </Text>
            </View>
            <View style={styles.planActionsInline}>
              <PlanActionButton label={joinActionLabel} primary disabled={joinDisabled} onPress={onJoinPress} />
              <PlanActionButton label="Back to feed" onPress={onBack} />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.planStatsRow}>
        <PlanMiniStat label="places" value={plan.places.length} />
        <PlanMiniStat label="joined" value={plan.joinedCount} />
        <PlanMiniStat label="mode" value={modeLabel} />
        <PlanMiniStat label="status" value={plan.status} />
      </View>

      <View style={[styles.detailSectionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={styles.detailSectionHeader}>
          <View>
            <Text style={[styles.cardEyebrow, { color: palette.muted }]}>VISUAL ROUTE</Text>
            <Text style={[styles.detailSectionTitle, { color: palette.text }]}>Place cards</Text>
          </View>
          <Text style={[styles.detailSectionMeta, { color: palette.muted }]}>Feed-style place cards · {plan.placeSummary}</Text>
        </View>
        <PlanDetailPlaceTimeline places={plan.places} />
      </View>

      <View style={[styles.detailSectionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={styles.detailSectionHeader}>
          <View>
            <Text style={[styles.cardEyebrow, { color: palette.muted }]}>PEOPLE</Text>
            <Text style={[styles.detailSectionTitle, { color: palette.text }]}>{joined ? "You are in" : "Joined freely"}</Text>
          </View>
          <Text style={[styles.detailSectionMeta, { color: palette.muted }]}>{plan.joinedCount} joined</Text>
        </View>
        <PlanParticipantChips plan={plan} />
        <Text style={[styles.detailHelpText, { color: palette.muted }]}>
          This lab keeps Plans separate from Trade, Needs, Offers, and Agenda. Joining is an open-plan prototype that only changes local mock state.
        </Text>
      </View>

      <View style={[styles.detailActionPanel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={styles.heroTextBlock}>
          <Text style={[styles.cardEyebrow, { color: palette.muted }]}>LAB RULES</Text>
          <Text style={[styles.detailActionTitle, { color: palette.text }]}>Independent open-plan prototype.</Text>
          <Text style={[styles.detailHelpText, { color: palette.muted }]}>PLAN-LAB19 keeps Plans independent while separating reusable Place data from Plan-specific timing, joining, and route-stop instructions.</Text>
        </View>
      </View>
    </View>
  );
}

function JoinPlanSheet({
  plan,
  onCancel,
  onConfirm,
}: {
  plan: PlanPreview;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { palette } = useTheme();
  const modeLabel = getPlanModeLabel(plan);

  return (
    <View style={[styles.joinSheetPanel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.joinSheetTopRow}>
        <View style={styles.joinSheetTitleBlock}>
          <Text style={[styles.cardEyebrow, { color: palette.muted }]}>JOIN PLAN · OPEN PROTOTYPE</Text>
          <Text style={[styles.joinSheetTitle, { color: palette.text }]}>Join {plan.title}</Text>
          <Text style={[styles.joinSheetCopy, { color: palette.muted }]}>
            This plan is open. Joining only updates this lab screen: no owner approval, no notification, no backend, and no Trade connection.
          </Text>
        </View>
        <View style={[styles.joinSheetModePill, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
          <Text style={[styles.smallTagText, { color: palette.text }]}>{modeLabel.toUpperCase()}</Text>
        </View>
      </View>

      <View style={[styles.joinSheetRouteCard, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
        <Text style={[styles.nextStepLabel, { color: palette.muted }]}>PLAN ROUTE</Text>
        <Text style={[styles.nextStepText, { color: palette.text }]}>{plan.placeSummary}</Text>
        <Text style={[styles.nextStepMeta, { color: palette.muted }]}>
          {plan.startLabel} · {plan.places.length} places · {plan.joinedCount} joined now
        </Text>
      </View>

      <View style={styles.joinSheetActions}>
        <PlanActionButton label="Cancel" onPress={onCancel} />
        <PlanActionButton label="Join freely" primary onPress={onConfirm} />
      </View>
    </View>
  );
}

function DraftTextField({
  label,
  value,
  onChangeText,
  multiline,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  const { palette } = useTheme();

  return (
    <View style={styles.draftFieldBlock}>
      <Text style={[styles.draftFieldLabel, { color: palette.muted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        multiline={multiline}
        style={[
          styles.draftTextInput,
          multiline ? styles.draftTextInputMultiline : null,
          { color: palette.text, borderColor: palette.border, backgroundColor: palette.surfaceAlt },
        ]}
      />
    </View>
  );
}

function CreateStepIndicator({
  activeStepIndex,
  draft,
  onSelect,
}: {
  activeStepIndex: number;
  draft: PlanCreateDraft;
  onSelect: (stepId: PlanCreateStepId) => void;
}) {
  const { palette } = useTheme();
  const activeStepId = planCreateSteps[activeStepIndex]?.id ?? planCreateSteps[0].id;

  return (
    <View style={styles.createStepStack}>
      <View style={[styles.createProgressTrack, { backgroundColor: palette.surfaceAlt }]}>
        <View style={[styles.createProgressFill, { width: getPlanCreateProgressPercent(activeStepIndex), backgroundColor: palette.text }]} />
      </View>
      <View style={styles.createStepRow}>
        {planCreateSteps.map((step, index) => {
          const isActive = activeStepId === step.id;
          const isDone = index < activeStepIndex && getPlanCreateStepValidity(draft, step.id);
          const canOpen = getCanOpenCreateStep(draft, step.id);
          return (
            <Pressable
              key={step.id}
              onPress={canOpen ? () => onSelect(step.id) : undefined}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive, disabled: !canOpen }}
              disabled={!canOpen}
              style={({ pressed }) => [
                styles.createStepChip,
                {
                  borderColor: isActive ? palette.text : palette.border,
                  backgroundColor: isActive ? palette.text : palette.surfaceAlt,
                  opacity: canOpen ? 1 : 0.46,
                },
                pressed && canOpen ? styles.pressed : null,
                Platform.OS === "web" && canOpen ? ({ cursor: "pointer" } as any) : null,
              ]}
            >
              <Text style={[styles.createStepNumber, { color: isActive ? palette.background : palette.muted }]}>{isDone ? "✓" : index + 1}</Text>
              <Text style={[styles.createStepLabel, { color: isActive ? palette.background : palette.text }]}>{step.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function CreateWizardStepNote({
  activeStep,
  stepIndex,
  valid,
  placeCount,
}: {
  activeStep: (typeof planCreateSteps)[number];
  stepIndex: number;
  valid: boolean;
  placeCount: number;
}) {
  const { palette } = useTheme();
  const nextStep = planCreateSteps[stepIndex + 1];

  return (
    <View style={[styles.createWizardNoteCard, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
      <View style={styles.createWizardNoteTopRow}>
        <View style={styles.heroTextBlock}>
          <Text style={[styles.nextStepLabel, { color: palette.muted }]}>WIZARD CHECKPOINT</Text>
          <Text style={[styles.createWizardNoteTitle, { color: palette.text }]}>{activeStep.label}</Text>
          <Text style={[styles.createWizardNoteCopy, { color: palette.muted }]}>{getPlanCreateStepPolishCopy(activeStep.id)}</Text>
        </View>
        <View style={[styles.createWizardStatusPill, { borderColor: palette.border, backgroundColor: valid ? palette.text : palette.surface }]}>
          <Text style={[styles.createWizardStatusText, { color: valid ? palette.background : palette.muted }]}>{valid ? "READY" : "TODO"}</Text>
        </View>
      </View>
      <View style={styles.createWizardMetaRow}>
        <Text style={[styles.createWizardMetaText, { color: palette.muted }]}>Step {stepIndex + 1} of {planCreateSteps.length}</Text>
        <Text style={[styles.createWizardMetaText, { color: palette.muted }]}>{placeCount} selected places</Text>
        <Text style={[styles.createWizardMetaText, { color: palette.muted }]}>{nextStep ? `Next: ${nextStep.label}` : "Final review"}</Text>
      </View>
      {!valid ? (
        <View style={[styles.createWizardWarningCard, { borderColor: palette.border, backgroundColor: palette.surface }]}>
          <Text style={[styles.createWizardWarningText, { color: palette.danger }]}>{getPlanCreateStepWarning(activeStep.id)}</Text>
        </View>
      ) : null}
    </View>
  );
}

function PlanModeChoice({
  mode,
  selected,
  title,
  helper,
  onPress,
}: {
  mode: PlanMode;
  selected: boolean;
  title: string;
  helper: string;
  onPress: () => void;
}) {
  const { palette } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.modeChoiceCard,
        {
          borderColor: selected ? palette.text : palette.border,
          backgroundColor: selected ? palette.deckSurface1 : palette.surface,
        },
        pressed ? styles.pressed : null,
        Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null,
      ]}
    >
      <View style={styles.modeChoiceTopRow}>
        <Text style={[styles.modeChoiceTitle, { color: palette.text }]}>{title}</Text>
        <View style={[styles.smallTag, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
          <Text style={[styles.smallTagText, { color: palette.text }]}>{mode.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={[styles.modeChoiceHelper, { color: palette.muted }]}>{helper}</Text>
    </Pressable>
  );
}

function PlacePickerSourceTabs({
  activeSourceId,
  onChange,
}: {
  activeSourceId: PlacePickerSourceId;
  onChange: (sourceId: PlacePickerSourceId) => void;
}) {
  const { palette } = useTheme();

  return (
    <View style={styles.placePickerSourceRow}>
      {placePickerSourceOptions.map((source) => {
        const isActive = source.id === activeSourceId;
        return (
          <Pressable
            key={source.id}
            onPress={() => onChange(source.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            style={({ pressed }) => [
              styles.placePickerSourceChip,
              {
                borderColor: palette.border,
                backgroundColor: isActive ? palette.text : palette.surfaceAlt,
              },
              pressed ? styles.pressed : null,
              Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null,
            ]}
          >
            <Text style={[styles.placePickerSourceLabel, { color: isActive ? palette.background : palette.text }]}>{source.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function PlacePickerFilterTabs({
  activeFilterId,
  onChange,
}: {
  activeFilterId: PlaceLibraryFilterId;
  onChange: (filterId: PlaceLibraryFilterId) => void;
}) {
  const { palette } = useTheme();

  return (
    <View style={styles.placePickerFilterRow}>
      {placeLibraryFilters.map((filter) => {
        const isActive = filter.id === activeFilterId;
        return (
          <Pressable
            key={filter.id}
            onPress={() => onChange(filter.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            style={({ pressed }) => [
              styles.placePickerFilterChip,
              {
                borderColor: palette.border,
                backgroundColor: isActive ? palette.deckSurface1 : palette.surface,
              },
              pressed ? styles.pressed : null,
              Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null,
            ]}
          >
            <Text style={[styles.placePickerFilterText, { color: palette.text }]}>{filter.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function PlaceLibraryMediaThumb({ place, sourceLabel }: { place: PlaceLibraryItem; sourceLabel: string }) {
  const { palette } = useTheme();
  const isOnline = place.kind === "online_place";
  const lines = Array.from({ length: 3 }, (_, index) => index);

  return (
    <View style={[styles.placeLibraryImage, styles.placeLibraryMediaThumb, { borderColor: palette.border, backgroundColor: isOnline ? palette.deckSurface2 : palette.deckSurface1 }]}>
      <View pointerEvents="none" style={styles.placeLibraryMediaBackdrop}>
        {isOnline ? (
          <View style={styles.placeLibraryPlatformMini}>
            <View style={styles.placeLibraryPlatformMiniHeader} />
            <View style={styles.placeLibraryPlatformMiniBody}>
              <View style={styles.placeLibraryPlatformMiniSidebar} />
              <View style={styles.placeLibraryPlatformMiniContent} />
            </View>
          </View>
        ) : (
          <View style={styles.placeLibraryMapMini}>
            {lines.map((line) => (
              <View
                key={`library-map-line-${place.id}-${line}`}
                style={[
                  styles.placeLibraryMapMiniRoad,
                  {
                    top: 18 + line * 28,
                    left: line % 2 === 0 ? -18 : 22,
                    right: line % 2 === 0 ? 20 : -16,
                    transform: [{ rotate: line % 2 === 0 ? "-9deg" : "10deg" }],
                  },
                ]}
              />
            ))}
            <View style={styles.placeLibraryMapMiniPin} />
          </View>
        )}
      </View>

      <View style={styles.planThumbTopRow}>
        <Text style={[styles.planDeckThumbKind, { color: "rgba(255,255,255,0.86)" }]}>{isOnline ? "ONLINE" : "OFFLINE"}</Text>
        <Text style={[styles.planDeckThumbOrder, { color: "rgba(255,255,255,0.74)" }]}>{sourceLabel}</Text>
      </View>

      <View style={styles.placeLibraryMediaBottom}>
        <Text style={styles.placeLibraryMediaKicker}>{getPlaceMediaFallbackLabel(place.kind)}</Text>
        <Text numberOfLines={2} style={styles.placeLibraryMediaTitle}>{place.imageLabels[0] ?? (isOnline ? "Platform visual" : "Place image")}</Text>
      </View>
    </View>
  );
}

function PlaceLibraryPickerCard({ place, added, onAdd }: { place: PlaceLibraryItem; added: boolean; onAdd: () => void }) {
  const { palette } = useTheme();
  return (
    <View style={[styles.placeLibraryCard, { borderColor: added ? palette.text : palette.border, backgroundColor: palette.surface }]}>
      <PlaceLibraryMediaThumb place={place} sourceLabel={place.source === "starter_place" ? "STARTER" : "MINE"} />
      <View style={styles.placeLibraryBody}>
        <View style={styles.placeLibraryHeaderRow}>
          <View style={styles.heroTextBlock}>
            <Text style={[styles.cardEyebrow, { color: palette.muted }]}>{place.categoryLabel}</Text>
            <Text style={[styles.placeLibraryTitle, { color: palette.text }]}>{place.title}</Text>
            <Text style={[styles.placeLibraryMeta, { color: palette.muted }]}>{place.addressOrPlatform} · {place.accessLabel}</Text>
          </View>
          <Pressable
            onPress={added ? undefined : onAdd}
            accessibilityRole="button"
            accessibilityState={{ disabled: added }}
            style={({ pressed }) => [
              styles.placeLibraryAddButton,
              { borderColor: palette.border, backgroundColor: added ? palette.surfaceAlt : palette.text, opacity: added ? 0.78 : 1 },
              pressed && !added ? styles.pressed : null,
              Platform.OS === "web" && !added ? ({ cursor: "pointer" } as any) : null,
            ]}
          >
            <Text style={[styles.placeLibraryAddText, { color: added ? palette.muted : palette.background }]}>{added ? "Added" : "Add"}</Text>
          </Pressable>
        </View>
        <Text numberOfLines={3} style={[styles.placeLibraryDescription, { color: palette.muted }]}>{place.description}</Text>
        <Text numberOfLines={2} style={[styles.placeLibraryMeta, { color: palette.muted }]}>{place.defaultTimeLabel} · {place.defaultDurationLabel ?? "flexible duration"}{place.safetyLabel ? ` · ${place.safetyLabel}` : ""}</Text>
      </View>
    </View>
  );
}

function PlaceKindChoice({
  kind,
  selected,
  title,
  helper,
  onPress,
}: {
  kind: PlanPlaceKind;
  selected: boolean;
  title: string;
  helper: string;
  onPress: () => void;
}) {
  const { palette } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.modeChoiceCard,
        {
          borderColor: selected ? palette.text : palette.border,
          backgroundColor: selected ? palette.deckSurface1 : palette.surface,
        },
        pressed ? styles.pressed : null,
        Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null,
      ]}
    >
      <View style={styles.modeChoiceTopRow}>
        <Text style={[styles.modeChoiceTitle, { color: palette.text }]}>{title}</Text>
        <View style={[styles.smallTag, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
          <Text style={[styles.smallTagText, { color: palette.text }]}>{kind === "online_place" ? "ONLINE" : "OFFLINE"}</Text>
        </View>
      </View>
      <Text style={[styles.modeChoiceHelper, { color: palette.muted }]}>{helper}</Text>
    </Pressable>
  );
}

function CreatePlaceFormPrototype({
  draft,
  onChangeDraft,
  onSave,
  saveLabel = "Save to My places + add",
  helperText = "Prototype only: this saves to local My places state, not the real database or upload system.",
}: {
  draft: PlaceCreateDraft;
  onChangeDraft: (draft: PlaceCreateDraft) => void;
  onSave: () => void;
  saveLabel?: string;
  helperText?: string;
}) {
  const { palette } = useTheme();
  const saveDisabled = !canSavePlaceDraft(draft);

  const changeKind = (kind: PlanPlaceKind) => {
    const seed = createInitialPlaceDraft(kind === "online_place" ? "online" : "local");
    onChangeDraft({
      ...draft,
      kind,
      categoryLabel: seed.categoryLabel,
      addressOrPlatform: seed.addressOrPlatform,
      areaLabel: seed.areaLabel,
      accessLabel: seed.accessLabel,
      defaultTimeLabel: seed.defaultTimeLabel,
      defaultDurationLabel: seed.defaultDurationLabel,
      multilingualNote: seed.multilingualNote,
      safetyLabel: seed.safetyLabel,
      defaultNote: seed.defaultNote,
      imageLabelsText: seed.imageLabelsText,
      tagsText: seed.tagsText,
    });
  };

  return (
    <View style={[styles.placePickerCreateCard, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      <View style={styles.heroTextBlock}>
        <Text style={[styles.cardEyebrow, { color: palette.muted }]}>CREATE REUSABLE PLACE</Text>
        <Text style={[styles.placeLibraryTitle, { color: palette.text }]}>Save a new place to My places</Text>
        <Text style={[styles.placeLibraryDescription, { color: palette.muted }]}>Create offline places like cafes, parks, and routes, or online places like Discord, Figma, and Google Meet. Saving adds the place to My places and adds it to the current plan route.</Text>
      </View>

      <View style={styles.modeChoiceGrid}>
        <PlaceKindChoice
          kind="local_place"
          selected={draft.kind === "local_place"}
          title="Offline place"
          helper="Address, public meeting point, cafe, park, route, or local venue."
          onPress={() => changeKind("local_place")}
        />
        <PlaceKindChoice
          kind="online_place"
          selected={draft.kind === "online_place"}
          title="Online place"
          helper="Platform, call room, community space, shared file, or online session."
          onPress={() => changeKind("online_place")}
        />
      </View>

      <View style={styles.draftFieldGrid}>
        <DraftTextField label="Place title" value={draft.title} onChangeText={(title) => onChangeDraft({ ...draft, title })} />
        <DraftTextField label={draft.kind === "online_place" ? "HTTPS link / platform label" : "Google address search / manual address"} value={draft.addressOrPlatform} onChangeText={(addressOrPlatform) => onChangeDraft({ ...draft, addressOrPlatform })} />
        <DraftTextField label="Category label" value={draft.categoryLabel} onChangeText={(categoryLabel) => onChangeDraft({ ...draft, categoryLabel })} />
        <DraftTextField label="Area / domain label" value={draft.areaLabel} onChangeText={(areaLabel) => onChangeDraft({ ...draft, areaLabel })} />
        <DraftTextField label={draft.kind === "online_place" ? "Access / safety label" : "Access label"} value={draft.accessLabel} onChangeText={(accessLabel) => onChangeDraft({ ...draft, accessLabel })} />
        <DraftTextField label="Default start time" value={draft.defaultTimeLabel} onChangeText={(defaultTimeLabel) => onChangeDraft({ ...draft, defaultTimeLabel })} />
        <DraftTextField label="Default duration" value={draft.defaultDurationLabel} onChangeText={(defaultDurationLabel) => onChangeDraft({ ...draft, defaultDurationLabel })} />
        <DraftTextField label="Tags" value={draft.tagsText} onChangeText={(tagsText) => onChangeDraft({ ...draft, tagsText })} placeholder="public, cafe, meetup" />
        <View style={styles.fullWidthField}>
          <DraftTextField label="Image labels / uploaded media later" value={draft.imageLabelsText} onChangeText={(imageLabelsText) => onChangeDraft({ ...draft, imageLabelsText })} placeholder="Place image, Detail image" />
        </View>
        <View style={styles.fullWidthField}>
          <DraftTextField label="Description" value={draft.description} onChangeText={(description) => onChangeDraft({ ...draft, description })} multiline />
        </View>
        <View style={styles.fullWidthField}>
          <DraftTextField label="Manual translated note" value={draft.multilingualNote} onChangeText={(multilingualNote) => onChangeDraft({ ...draft, multilingualNote })} multiline />
        </View>
        <View style={styles.fullWidthField}>
          <DraftTextField label="Safety / fallback note" value={draft.safetyLabel} onChangeText={(safetyLabel) => onChangeDraft({ ...draft, safetyLabel })} multiline />
        </View>
        <View style={styles.fullWidthField}>
          <DraftTextField label="Default route note" value={draft.defaultNote} onChangeText={(defaultNote) => onChangeDraft({ ...draft, defaultNote })} multiline />
        </View>
      </View>

      <View style={styles.createPlaceFormFooter}>
        <Text style={[styles.detailHelpText, { color: palette.muted }]}>{helperText}</Text>
        <PlanActionButton label={saveLabel} primary disabled={saveDisabled} onPress={onSave} />
      </View>
    </View>
  );
}

function SelectedPlanPlacesSummary({ places }: { places: PlanPlacePreview[] }) {
  const { palette } = useTheme();

  return (
    <View style={[styles.selectedPlacesCard, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      <View style={styles.detailSectionHeader}>
        <View>
          <Text style={[styles.cardEyebrow, { color: palette.muted }]}>SELECTED PLACES</Text>
          <Text style={[styles.detailSectionTitle, { color: palette.text }]}>Route draft</Text>
        </View>
        <PlanModeBadge label={`${places.length} stops`} />
      </View>

      {places.length === 0 ? (
        <Text style={[styles.detailHelpText, { color: palette.muted }]}>Search My places, Starter places, or create a new reusable place to start the route.</Text>
      ) : (
        <View style={styles.selectedPlaceList}>
          {places.map((place) => (
            <View key={place.id} style={[styles.selectedPlaceRow, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
              <View style={[styles.selectedPlaceOrder, { borderColor: palette.border, backgroundColor: palette.surface }]}>
                <Text style={[styles.removePlaceText, { color: palette.text }]}>{place.order}</Text>
              </View>
              <View style={styles.heroTextBlock}>
                <Text style={[styles.selectedPlaceTitle, { color: palette.text }]}>{place.title}</Text>
                <Text style={[styles.selectedPlaceMeta, { color: palette.muted }]}>{place.timeLabel} · {place.endTimeLabel ? `until ${place.endTimeLabel}` : "end auto"} · {place.addressOrPlatform} · {place.kind === "online_place" ? "Online" : "Offline"}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function PlacePickerPanel({
  mode,
  sourceId,
  filterId,
  searchText,
  selectedCount,
  selectedLibraryPlaceIds,
  userPlaces,
  createPlaceDraft,
  onChangeSource,
  onChangeFilter,
  onChangeSearchText,
  onAddLibraryPlace,
  onChangeCreatePlaceDraft,
  onSaveCreatedPlace,
}: {
  mode: PlanMode;
  sourceId: PlacePickerSourceId;
  filterId: PlaceLibraryFilterId;
  searchText: string;
  selectedCount: number;
  selectedLibraryPlaceIds: string[];
  userPlaces: PlaceLibraryItem[];
  createPlaceDraft: PlaceCreateDraft;
  onChangeSource: (sourceId: PlacePickerSourceId) => void;
  onChangeFilter: (filterId: PlaceLibraryFilterId) => void;
  onChangeSearchText: (value: string) => void;
  onAddLibraryPlace: (place: PlaceLibraryItem) => void;
  onChangeCreatePlaceDraft: (draft: PlaceCreateDraft) => void;
  onSaveCreatedPlace: () => void;
}) {
  const { palette } = useTheme();
  const activeSource = placePickerSourceOptions.find((source) => source.id === sourceId) ?? placePickerSourceOptions[0];
  const activeFilter = placeLibraryFilters.find((filter) => filter.id === filterId) ?? placeLibraryFilters[0];
  const visibleItems = sourceId === "create_new" ? [] : getPlacePickerItems(sourceId, filterId, userPlaces, searchText);

  return (
    <View style={[styles.placePickerPanel, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
      <View style={styles.placePickerHeaderRow}>
        <View style={styles.heroTextBlock}>
          <Text style={[styles.cardEyebrow, { color: palette.muted }]}>PLACE PICKER</Text>
          <Text style={[styles.placePickerTitle, { color: palette.text }]}>Choose reusable places</Text>
          <Text style={[styles.placePickerHelper, { color: palette.muted }]}>Plan mode: {getPlanModeDisplay(mode)} · selected route stops: {selectedCount}</Text>
        </View>
        <View style={[styles.placePickerCountPill, { borderColor: palette.border, backgroundColor: palette.surface }]}>
          <Text style={[styles.planFeedFilterCountValue, { color: palette.text }]}>{visibleItems.length}</Text>
          <Text style={[styles.planFeedFilterCountLabel, { color: palette.muted }]}>{sourceId === "create_new" ? "custom" : "places"}</Text>
        </View>
      </View>

      <PlacePickerSourceTabs activeSourceId={sourceId} onChange={onChangeSource} />
      {sourceId !== "create_new" ? <PlacePickerFilterTabs activeFilterId={filterId} onChange={onChangeFilter} /> : null}

      {sourceId !== "create_new" ? (
        <TextInput
          value={searchText}
          onChangeText={onChangeSearchText}
          placeholder="Search places, platforms, areas, or categories"
          placeholderTextColor={palette.muted}
          style={[styles.placePickerSearchInput, { color: palette.text, borderColor: palette.border, backgroundColor: palette.surface }]}
        />
      ) : null}

      <View style={[styles.placePickerActiveNote, { borderColor: palette.border, backgroundColor: palette.surface }]}>
        <Text style={[styles.nextStepLabel, { color: palette.muted }]}>{getPlacePickerSourceLabel(sourceId).toUpperCase()} · {sourceId === "create_new" ? "SAVE TO MY PLACES" : getPlacePickerFilterLabel(filterId).toUpperCase()}</Text>
        <Text style={[styles.nextStepMeta, { color: palette.muted }]}>{activeSource.helper}{sourceId !== "create_new" ? ` ${activeFilter.helper}` : ""}</Text>
      </View>

      {sourceId === "create_new" ? (
        <CreatePlaceFormPrototype
          draft={createPlaceDraft}
          onChangeDraft={onChangeCreatePlaceDraft}
          onSave={onSaveCreatedPlace}
        />
      ) : (
        <View style={styles.placeLibraryList}>
          {visibleItems.length === 0 ? (
            <View style={[styles.placePickerEmptyCard, { borderColor: palette.border, backgroundColor: palette.surface }]}>
              <Text style={[styles.placeLibraryTitle, { color: palette.text }]}>No places found</Text>
              <Text style={[styles.placeLibraryDescription, { color: palette.muted }]}>Try another search, switch source, or create a reusable place for this plan.</Text>
            </View>
          ) : visibleItems.map((place) => {
            const added = selectedLibraryPlaceIds.includes(place.id);
            return (
              <PlaceLibraryPickerCard key={place.id} place={place} added={added} onAdd={() => onAddLibraryPlace(place)} />
            );
          })}
        </View>
      )}
    </View>
  );
}


function PlaceLibrarySourceFilterTabs({
  activeSourceId,
  onChange,
}: {
  activeSourceId: PlaceLibrarySource;
  onChange: (sourceId: PlaceLibrarySource) => void;
}) {
  const { palette } = useTheme();

  return (
    <View style={styles.placePickerSourceRow}>
      {placeLibraryGroups.map((source) => {
        const isActive = source.id === activeSourceId;
        return (
          <Pressable
            key={source.id}
            onPress={() => onChange(source.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            style={({ pressed }) => [
              styles.placePickerSourceChip,
              {
                borderColor: palette.border,
                backgroundColor: isActive ? palette.text : palette.surfaceAlt,
              },
              pressed ? styles.pressed : null,
              Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null,
            ]}
          >
            <Text style={[styles.placePickerSourceLabel, { color: isActive ? palette.background : palette.text }]}>{source.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function StandalonePlaceLibraryCard({
  place,
  sourceId,
  onEdit,
  onDelete,
  onCopyStarter,
}: {
  place: PlaceLibraryItem;
  sourceId: PlaceLibrarySource;
  onEdit: () => void;
  onDelete: () => void;
  onCopyStarter: () => void;
}) {
  const { palette } = useTheme();
  const isStarter = sourceId === "starter_place";

  return (
    <View style={[styles.placeLibraryCard, styles.standalonePlaceCard, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      <PlaceLibraryMediaThumb place={place} sourceLabel={isStarter ? "STARTER" : "MINE"} />

      <View style={styles.placeLibraryBody}>
        <View style={styles.placeLibraryHeaderRow}>
          <View style={styles.heroTextBlock}>
            <Text style={[styles.cardEyebrow, { color: palette.muted }]}>{place.categoryLabel}</Text>
            <Text style={[styles.placeLibraryTitle, { color: palette.text }]}>{place.title}</Text>
            <Text style={[styles.placeLibraryMeta, { color: palette.muted }]}>{place.addressOrPlatform} · {place.accessLabel}</Text>
          </View>
          <View style={[styles.smallTag, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
            <Text style={[styles.smallTagText, { color: palette.text }]}>{place.visibility.replace("_", " ").toUpperCase()}</Text>
          </View>
        </View>
        <Text numberOfLines={3} style={[styles.placeLibraryDescription, { color: palette.muted }]}>{place.description}</Text>
        <View style={styles.standalonePlaceMetaGrid}>
          <View style={[styles.standalonePlaceMetaPill, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
            <Text style={[styles.nextStepLabel, { color: palette.muted }]}>AREA</Text>
            <Text style={[styles.nextStepMeta, { color: palette.text }]}>{place.areaLabel}</Text>
          </View>
          <View style={[styles.standalonePlaceMetaPill, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
            <Text style={[styles.nextStepLabel, { color: palette.muted }]}>DEFAULT</Text>
            <Text style={[styles.nextStepMeta, { color: palette.text }]}>{place.defaultTimeLabel} · {place.defaultDurationLabel ?? "flexible"}</Text>
          </View>
          <View style={[styles.standalonePlaceMetaPill, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
            <Text style={[styles.nextStepLabel, { color: palette.muted }]}>SAFETY</Text>
            <Text style={[styles.nextStepMeta, { color: palette.text }]}>{place.safetyLabel ?? (place.kind === "online_place" ? "Check link" : "Map fallback")}</Text>
          </View>
        </View>
        <View style={styles.standalonePlaceActions}>
          {isStarter ? (
            <PlanActionButton label="Copy to My places" primary onPress={onCopyStarter} />
          ) : (
            <>
              <PlanActionButton label="Edit" onPress={onEdit} />
              <PlanActionButton label="Delete" onPress={onDelete} />
            </>
          )}
        </View>
      </View>
    </View>
  );
}

function PlaceLibraryScreen({
  userPlaces,
  isDesktop,
  onBack,
  onCreatePlace,
  onUpdatePlace,
  onDeletePlace,
}: {
  userPlaces: PlaceLibraryItem[];
  isDesktop: boolean;
  onBack: () => void;
  onCreatePlace: (place: PlaceLibraryItem) => void;
  onUpdatePlace: (place: PlaceLibraryItem) => void;
  onDeletePlace: (placeId: string) => void;
}) {
  const { palette } = useTheme();
  const [sourceId, setSourceId] = useState<PlaceLibrarySource>("my_place");
  const [filterId, setFilterId] = useState<PlaceLibraryFilterId>("all");
  const [searchText, setSearchText] = useState("");
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PlaceCreateDraft>(() => createInitialPlaceDraft("local"));
  const visibleItems = useMemo(
    () => getPlaceLibraryVisibleItems(sourceId, filterId, userPlaces, searchText),
    [sourceId, filterId, userPlaces, searchText]
  );
  const activeFilter = placeLibraryFilters.find((filter) => filter.id === filterId) ?? placeLibraryFilters[0];
  const myOfflineCount = userPlaces.filter((place) => place.kind === "local_place").length;
  const myOnlineCount = userPlaces.filter((place) => place.kind === "online_place").length;

  const resetForm = () => {
    setCreateFormOpen(false);
    setEditingPlaceId(null);
    setDraft(createInitialPlaceDraft("local"));
  };

  const startCreatePlace = (kind: PlanPlaceKind = "local_place") => {
    setSourceId("my_place");
    setCreateFormOpen(true);
    setEditingPlaceId(null);
    setDraft(createInitialPlaceDraft(kind === "online_place" ? "online" : "local"));
  };

  const startEditPlace = (place: PlaceLibraryItem) => {
    setSourceId("my_place");
    setCreateFormOpen(true);
    setEditingPlaceId(place.id);
    setDraft(createPlaceDraftFromLibraryItem(place));
  };

  const savePlace = () => {
    if (!canSavePlaceDraft(draft)) {
      return;
    }

    const nextPlace = createLibraryPlaceFromDraft(draft);
    const placeToSave = editingPlaceId ? { ...nextPlace, id: editingPlaceId, source: "my_place" as const } : nextPlace;

    if (editingPlaceId) {
      onUpdatePlace(placeToSave);
    } else {
      onCreatePlace(placeToSave);
    }

    setSourceId("my_place");
    resetForm();
  };

  const copyStarterPlace = (place: PlaceLibraryItem) => {
    const copiedDraft = createPlaceDraftFromLibraryItem(place);
    const copiedPlace = createLibraryPlaceFromDraft({
      ...copiedDraft,
      title: `${place.title} copy`,
      accessLabel: place.kind === "online_place" ? "Access note hidden" : "Public place",
    });
    onCreatePlace(copiedPlace);
    setSourceId("my_place");
  };

  return (
    <View style={styles.tabContent}>
      <View style={[styles.detailHeaderPanel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={styles.detailTopBar}>
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.detailBackButton,
              { borderColor: palette.border, backgroundColor: palette.surfaceAlt },
              pressed ? styles.pressed : null,
              Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null,
            ]}
          >
            <Text style={[styles.detailBackText, { color: palette.text }]}>‹ Plans</Text>
          </Pressable>
          <View style={styles.detailStatusRow}>
            <PlanModeBadge label={`${userPlaces.length} mine`} />
            <PlanModeBadge label={`${starterPlaceLibrary.length} starters`} />
          </View>
        </View>

        <View style={styles.plansHeroTopRow}>
          <View style={styles.heroTextBlock}>
            <Text style={[styles.heroEyebrow, { color: palette.muted }]}>PLACE LIBRARY</Text>
            <Text style={[styles.detailTitle, { color: palette.text }]}>Reusable places for open plans.</Text>
            <Text style={[styles.detailSummary, { color: palette.muted }]}>Create offline and online places separately, then choose them inside the Create Plan wizard. This stays local to the lab prototype.</Text>
          </View>
          <View style={styles.plansHeroActionRow}>
            <PlanActionButton label="Offline place" onPress={() => startCreatePlace("local_place")} />
            <PlanActionButton label="Online place" primary onPress={() => startCreatePlace("online_place")} />
          </View>
        </View>

        <View style={styles.standalonePlaceStatsRow}>
          <PlanMiniStat label="my offline" value={myOfflineCount} />
          <PlanMiniStat label="my online" value={myOnlineCount} />
          <PlanMiniStat label="starters" value={starterPlaceLibrary.length} />
          <PlanMiniStat label="filter" value={activeFilter.label} />
        </View>
      </View>

      {createFormOpen ? (
        <View style={[styles.createStepPanel, { borderColor: palette.border, backgroundColor: palette.surface }]}>
          <View style={styles.detailSectionHeader}>
            <View>
              <Text style={[styles.cardEyebrow, { color: palette.muted }]}>{editingPlaceId ? "EDIT MY PLACE" : "CREATE MY PLACE"}</Text>
              <Text style={[styles.detailSectionTitle, { color: palette.text }]}>{editingPlaceId ? "Update reusable place" : "Save a standalone place"}</Text>
            </View>
            <PlanActionButton label="Close form" onPress={resetForm} />
          </View>
          <CreatePlaceFormPrototype
            draft={draft}
            onChangeDraft={setDraft}
            onSave={savePlace}
            saveLabel={editingPlaceId ? "Update My place" : "Save to My places"}
            helperText="Standalone library prototype: this changes local My places only. Real uploads, map previews, verification, and database saving come later."
          />
        </View>
      ) : null}

      <View style={[styles.placePickerPanel, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
        <View style={styles.placePickerHeaderRow}>
          <View style={styles.heroTextBlock}>
            <Text style={[styles.cardEyebrow, { color: palette.muted }]}>{getPlaceLibrarySourceTitle(sourceId).toUpperCase()}</Text>
            <Text style={[styles.placePickerTitle, { color: palette.text }]}>{getPlaceLibrarySourceTitle(sourceId)}</Text>
            <Text style={[styles.placePickerHelper, { color: palette.muted }]}>{getPlaceLibrarySourceHelper(sourceId)}</Text>
          </View>
          <View style={[styles.placePickerCountPill, { borderColor: palette.border, backgroundColor: palette.surface }]}>
            <Text style={[styles.planFeedFilterCountValue, { color: palette.text }]}>{visibleItems.length}</Text>
            <Text style={[styles.planFeedFilterCountLabel, { color: palette.muted }]}>visible</Text>
          </View>
        </View>

        <PlaceLibrarySourceFilterTabs activeSourceId={sourceId} onChange={setSourceId} />
        <PlacePickerFilterTabs activeFilterId={filterId} onChange={setFilterId} />
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search saved places, starters, platforms, or areas"
          placeholderTextColor={palette.muted}
          style={[styles.placePickerSearchInput, { color: palette.text, borderColor: palette.border, backgroundColor: palette.surface }]}
        />

        <View style={[styles.placePickerActiveNote, { borderColor: palette.border, backgroundColor: palette.surface }]}>
          <Text style={[styles.nextStepLabel, { color: palette.muted }]}>{getPlacePickerFilterLabel(filterId).toUpperCase()}</Text>
          <Text style={[styles.nextStepMeta, { color: palette.muted }]}>{activeFilter.helper}</Text>
        </View>

        {visibleItems.length === 0 ? (
          <View style={[styles.placePickerEmptyCard, { borderColor: palette.border, backgroundColor: palette.surface }]}>
            <Text style={[styles.placeLibraryTitle, { color: palette.text }]}>No places in this view</Text>
            <Text style={[styles.placeLibraryDescription, { color: palette.muted }]}>Create a My place, change filters, or copy a Starter place into your library.</Text>
            <PlanActionButton label="Create place" primary onPress={() => startCreatePlace()} />
          </View>
        ) : (
          <View style={[styles.placeLibraryList, isDesktop ? styles.standalonePlaceGrid : null]}>
            {visibleItems.map((place) => (
              <View key={place.id} style={isDesktop ? styles.standalonePlaceGridItem : null}>
                <StandalonePlaceLibraryCard
                  place={place}
                  sourceId={sourceId}
                  onEdit={() => startEditPlace(place)}
                  onDelete={() => onDeletePlace(place.id)}
                  onCopyStarter={() => copyStarterPlace(place)}
                />
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function PlanSchedulePanel({ draft, onChangeDraft }: { draft: PlanCreateDraft; onChangeDraft: (draft: PlanCreateDraft) => void }) {
  const { palette } = useTheme();

  return (
    <View style={[styles.planScheduleCard, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
      <View style={styles.detailSectionHeader}>
        <View>
          <Text style={[styles.cardEyebrow, { color: palette.muted }]}>PLAN TIMING</Text>
          <Text style={[styles.detailSectionTitle, { color: palette.text }]}>Plan-level timing and joining</Text>
        </View>
        <PlanModeBadge label={getPlanEstimatedDurationLabel(draft)} />
      </View>
      <Text style={[styles.detailHelpText, { color: palette.muted }]}>Place start times define the route. A stop can end at its own end time, otherwise it ends when the next stop starts. The final end time closes the last stop.</Text>
      <View style={styles.draftFieldGrid}>
        <DraftTextField label="Plan starts" value={draft.startLabel} onChangeText={(startLabel) => onChangeDraft({ ...draft, startLabel })} />
        <DraftTextField label="Final end time" value={draft.finalEndLabel} onChangeText={(finalEndLabel) => onChangeDraft({ ...draft, finalEndLabel })} />
        <DraftTextField label="Join deadline" value={draft.joinDeadlineLabel} onChangeText={(joinDeadlineLabel) => onChangeDraft({ ...draft, joinDeadlineLabel })} />
        <DraftTextField label="Capacity" value={draft.capacityLabel} onChangeText={(capacityLabel) => onChangeDraft({ ...draft, capacityLabel })} />
      </View>
      <View style={[styles.placePickerActiveNote, { borderColor: palette.border, backgroundColor: palette.surface }]}>
        <Text style={[styles.nextStepLabel, { color: palette.muted }]}>AUTO DURATION</Text>
        <Text style={[styles.nextStepMeta, { color: palette.muted }]}>{getPlanTimingMeta(draft)}</Text>
      </View>
    </View>
  );
}

function DraftPlaceEditor({
  place,
  canRemove,
  canMoveUp,
  canMoveDown,
  compact,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  place: PlanPlacePreview;
  canRemove: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  compact?: boolean;
  onChange: (place: PlanPlacePreview) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const { palette } = useTheme();

  return (
    <View style={[styles.draftPlaceCard, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      <View style={styles.draftPlaceHeaderRow}>
        <View style={styles.draftPlaceTitleBlock}>
          <Text style={[styles.cardEyebrow, { color: palette.muted }]}>PLACE {place.order} · {place.kind === "online_place" ? "ONLINE" : "LOCAL"}</Text>
          <Text style={[styles.draftPlaceTitle, { color: palette.text }]}>{place.title || `Place ${place.order}`}</Text>
        </View>
        <View style={styles.draftPlaceActionRow}>
          <Pressable
            onPress={canMoveUp ? onMoveUp : undefined}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canMoveUp }}
            style={({ pressed }) => [
              styles.removePlaceButton,
              { borderColor: palette.border, opacity: canMoveUp ? 1 : 0.42 },
              pressed && canMoveUp ? styles.pressed : null,
              Platform.OS === "web" && canMoveUp ? ({ cursor: "pointer" } as any) : null,
            ]}
          >
            <Text style={[styles.removePlaceText, { color: palette.text }]}>Up</Text>
          </Pressable>
          <Pressable
            onPress={canMoveDown ? onMoveDown : undefined}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canMoveDown }}
            style={({ pressed }) => [
              styles.removePlaceButton,
              { borderColor: palette.border, opacity: canMoveDown ? 1 : 0.42 },
              pressed && canMoveDown ? styles.pressed : null,
              Platform.OS === "web" && canMoveDown ? ({ cursor: "pointer" } as any) : null,
            ]}
          >
            <Text style={[styles.removePlaceText, { color: palette.text }]}>Down</Text>
          </Pressable>
          <Pressable
            onPress={canRemove ? onRemove : undefined}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canRemove }}
            style={({ pressed }) => [
              styles.removePlaceButton,
              { borderColor: palette.border, opacity: canRemove ? 1 : 0.42 },
              pressed && canRemove ? styles.pressed : null,
              Platform.OS === "web" && canRemove ? ({ cursor: "pointer" } as any) : null,
            ]}
          >
            <Text style={[styles.removePlaceText, { color: palette.text }]}>Remove</Text>
          </Pressable>
        </View>
      </View>

      {compact ? (
        <View style={styles.draftFieldGrid}>
          <DraftTextField label="Image label" value={place.imageLabel} onChangeText={(imageLabel) => onChange({ ...place, imageLabel })} />
          <DraftTextField label="Start time" value={place.timeLabel} onChangeText={(timeLabel) => onChange({ ...place, timeLabel })} />
          <View style={styles.fullWidthField}>
            <DraftTextField label="Plan-specific note" value={place.note} onChangeText={(note) => onChange({ ...place, note })} multiline />
          </View>
        </View>
      ) : (
        <>
          <View style={styles.draftFieldGrid}>
            <DraftTextField label="Place / platform" value={place.title} onChangeText={(title) => onChange({ ...place, title })} />
            <DraftTextField label="Address / platform" value={place.addressOrPlatform} onChangeText={(addressOrPlatform) => onChange({ ...place, addressOrPlatform })} />
            <DraftTextField label="Start time" value={place.timeLabel} onChangeText={(timeLabel) => onChange({ ...place, timeLabel })} />
            <DraftTextField label="End time optional" value={place.endTimeLabel ?? ""} onChangeText={(endTimeLabel) => onChange({ ...place, endTimeLabel })} />
            <DraftTextField label="Manual duration optional" value={place.durationLabel ?? ""} onChangeText={(durationLabel) => onChange({ ...place, durationLabel })} />
            <DraftTextField label="Image label" value={place.imageLabel} onChangeText={(imageLabel) => onChange({ ...place, imageLabel })} />
          </View>
          <DraftTextField label="Plan-specific note" value={place.note} onChangeText={(note) => onChange({ ...place, note })} multiline />
          <DraftTextField label="Meeting / access instruction" value={place.meetingInstruction ?? ""} onChangeText={(meetingInstruction) => onChange({ ...place, meetingInstruction })} multiline />
        </>
      )}
    </View>
  );
}

function PlanDeckSummaryPreviewCard({ plan }: { plan: PlanPreview }) {
  const { palette } = useTheme();
  const modeLabel = getPlanModeLabel(plan);

  return (
    <View style={[styles.tradeCard, styles.planDeckCard, styles.planDeckPreviewCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <PlanSummaryDeckBody plan={plan} eyebrow="CARD 1 · PLAN SUMMARY" rightLabels={["PREVIEW", modeLabel.toUpperCase()]} />
      <View style={[styles.cardFooter, { borderTopColor: palette.border }]}>
        <Text style={[styles.footerMeta, { color: palette.muted }]}>Theme summary · no background image</Text>
        <Text style={[styles.footerAction, { color: palette.text }]}>Summary card</Text>
      </View>
    </View>
  );
}

function PlanDeckPlacePreviewCard({ place, totalPlaces }: { place: PlanPlacePreview; totalPlaces: number }) {
  const kindLabel = place.kind === "online_place" ? "ONLINE" : "LOCAL";
  const placeMeta = `${place.timeLabel || "Flexible"}${place.endTimeLabel ? ` → ${place.endTimeLabel}` : ""} · ${place.durationLabel || "flexible duration"} · ${place.addressOrPlatform}`;

  return (
    <View style={[styles.tradeCard, styles.planDeckCard, styles.planDeckPreviewCard, styles.planPosterPlaceCard]}>
      <PlanPlacePosterBackdrop place={place} />

      <View style={styles.planPosterTopBadges}>
        <View style={[styles.planPosterBadge, styles.planPosterPrimaryBadge]}>
          <Text style={styles.planPosterBadgeText}>PLACE {place.order}/{totalPlaces}</Text>
        </View>
        <View style={[styles.planPosterBadge, styles.planPosterKindBadge]}>
          <Text style={styles.planPosterBadgeText}>{kindLabel}</Text>
        </View>
      </View>

      <View pointerEvents="none" style={styles.planPosterBlurWash}>
        <View style={styles.planPosterBlurBandSoft} />
        <View style={styles.planPosterBlurBandStrong} />
        <View style={styles.planPosterBlurBandDeep} />
      </View>

      <View style={styles.planPosterBottomContent}>
        <Text style={styles.planPosterEyebrow}>{kindLabel.toLowerCase()} stop · {place.order}</Text>
        <Text style={styles.planPosterTitle}>{place.title}</Text>
        <Text style={styles.planPosterNote}>{place.note}</Text>
        {place.meetingInstruction ? <Text style={styles.planPosterNote}>{place.meetingInstruction}</Text> : null}
        <Text style={styles.planPosterMeta}>{placeMeta}</Text>
        <View style={styles.planPosterChipRow}>
          <View style={styles.planPosterChip}>
            <Text style={styles.planPosterChipText}>{getPlaceMediaChipLabel(place.kind)}</Text>
          </View>
          <View style={styles.planPosterChip}>
            <Text style={styles.planPosterChipText}>{place.timeLabel || "Flexible"}</Text>
          </View>
          <View style={styles.planPosterChip}>
            <Text style={styles.planPosterChipText}>{place.kind === "online_place" ? "Online" : "Offline"}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function PlanCreatePreview({ draft }: { draft: PlanCreateDraft }) {
  const { palette } = useTheme();
  const previewPlan = buildPlanPreviewFromDraft(draft);
  const totalCards = previewPlan.places.length + 1;

  return (
    <View style={styles.planDeckPreviewStack}>
      <View style={[styles.planDeckPreviewIntro, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
        <View style={styles.detailSectionHeader}>
          <View>
            <Text style={[styles.cardEyebrow, { color: palette.muted }]}>PREVIEW · FEED PARITY</Text>
            <Text style={[styles.detailSectionTitle, { color: palette.text }]}>Plan deck preview</Text>
          </View>
          <View style={styles.detailStatusRow}>
            <PlanModeBadge label={`${totalCards} cards`} />
            <PlanModeBadge label={getPlanEstimatedDurationLabel(draft)} />
          </View>
        </View>
        <Text style={[styles.detailHelpText, { color: palette.muted }]}>This preview generates the summary from the ordered places. Optional cover text can override it, but each place note remains the main translated content.</Text>
      </View>

      <PlanDeckSummaryPreviewCard plan={previewPlan} />

      {previewPlan.places.map((place) => (
        <PlanDeckPlacePreviewCard key={place.id} place={place} totalPlaces={previewPlan.places.length} />
      ))}
    </View>
  );
}

function PlanCreateFlow({
  draft,
  stepIndex,
  userPlaces,
  onBack,
  onChangeDraft,
  onChangeStepIndex,
  onCreatePlan,
  onCreateReusablePlace,
}: {
  draft: PlanCreateDraft;
  stepIndex: number;
  userPlaces: PlaceLibraryItem[];
  onBack: () => void;
  onChangeDraft: (draft: PlanCreateDraft) => void;
  onChangeStepIndex: (index: number) => void;
  onCreatePlan: () => void;
  onCreateReusablePlace: (place: PlaceLibraryItem) => void;
}) {
  const { palette } = useTheme();
  const activeStep = planCreateSteps[stepIndex] ?? planCreateSteps[0];
  const canGoBack = stepIndex > 0;
  const canGoNext = stepIndex < planCreateSteps.length - 1;
  const currentStepIsValid = getPlanCreateStepValidity(draft, activeStep.id);
  const selectedLibraryPlaceIds = draft.places.map((place) => place.libraryPlaceId).filter((id): id is string => Boolean(id));
  const [placePickerSourceId, setPlacePickerSourceId] = useState<PlacePickerSourceId>("my_place");
  const [placePickerFilterId, setPlacePickerFilterId] = useState<PlaceLibraryFilterId>("all");
  const [placePickerSearchText, setPlacePickerSearchText] = useState("");
  const [placeCreateDraft, setPlaceCreateDraft] = useState<PlaceCreateDraft>(() => createInitialPlaceDraft(draft.mode));

  const updatePlace = (placeId: string, nextPlace: PlanPlacePreview) => {
    onChangeDraft({
      ...draft,
      places: draft.places.map((place) => (place.id === placeId ? nextPlace : place)).map((place, index) => ({ ...place, order: index + 1 })),
    });
  };

  const removePlace = (placeId: string) => {
    onChangeDraft({
      ...draft,
      places: draft.places.filter((place) => place.id !== placeId).map((place, index) => ({ ...place, order: index + 1 })),
    });
  };

  const movePlace = (placeId: string, direction: -1 | 1) => {
    onChangeDraft({
      ...draft,
      places: movePlanPlace(draft.places, placeId, direction),
    });
  };

  const addLibraryPlace = (place: PlaceLibraryItem) => {
    if (selectedLibraryPlaceIds.includes(place.id)) {
      return;
    }

    onChangeDraft({
      ...draft,
      places: [...draft.places, createDraftPlaceFromLibraryItem(place, draft.places.length)],
    });
  };

  const saveCreatedPlace = () => {
    if (!canSavePlaceDraft(placeCreateDraft)) {
      return;
    }

    const createdPlace = createLibraryPlaceFromDraft(placeCreateDraft);
    onCreateReusablePlace(createdPlace);
    addLibraryPlace(createdPlace);
    setPlaceCreateDraft(createInitialPlaceDraft(draft.mode));
    setPlacePickerSourceId("my_place");
    setPlacePickerFilterId("all");
    setPlacePickerSearchText("");
  };

  const changeMode = (mode: PlanMode) => {
    onChangeDraft({
      ...draft,
      mode,
      category: getPlanModeDisplay(mode),
      capacityLabel: mode === "online" ? "Open online" : "Open spots",
      places: normalizeDraftPlacesForMode(draft.places, mode),
    });
    setPlaceCreateDraft(createInitialPlaceDraft(mode));
  };

  return (
    <View style={styles.tabContent}>
      <View style={[styles.detailHeaderPanel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={styles.detailTopBar}>
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.detailBackButton,
              { borderColor: palette.border, backgroundColor: palette.surfaceAlt },
              pressed ? styles.pressed : null,
              Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null,
            ]}
          >
            <Text style={[styles.detailBackText, { color: palette.text }]}>‹ Plans</Text>
          </Pressable>
          <View style={styles.detailStatusRow}>
            <PlanModeBadge label="Mock create" />
            <PlanModeBadge label={`Step ${stepIndex + 1}/5`} />
          </View>
        </View>
        <View style={styles.heroTextBlock}>
          <Text style={[styles.heroEyebrow, { color: palette.muted }]}>PLAN-LAB19 · TITLELESS PLAN WIZARD</Text>
          <Text style={[styles.detailTitle, { color: palette.text }]}>Create an open plan.</Text>
          <Text style={[styles.detailSummary, { color: palette.muted }]}>This is local lab state only. The wizard is now titleless by default: places carry the real content, and the summary card is generated from the ordered route.</Text>
        </View>
        <CreateStepIndicator
          activeStepIndex={stepIndex}
          draft={draft}
          onSelect={(stepId) => {
            const nextIndex = planCreateSteps.findIndex((step) => step.id === stepId);
            if (nextIndex >= 0 && getCanOpenCreateStep(draft, stepId)) {
              onChangeStepIndex(nextIndex);
            }
          }}
        />
      </View>

      <View style={[styles.createStepPanel, { borderColor: palette.border, backgroundColor: palette.surface }]}>
        <View style={styles.detailSectionHeader}>
          <View>
            <Text style={[styles.cardEyebrow, { color: palette.muted }]}>STEP {stepIndex + 1}</Text>
            <Text style={[styles.detailSectionTitle, { color: palette.text }]}>{activeStep.label}</Text>
          </View>
          <Text style={[styles.detailSectionMeta, { color: palette.muted }]}>{activeStep.helper}</Text>
        </View>

        <CreateWizardStepNote activeStep={activeStep} stepIndex={stepIndex} valid={currentStepIsValid} placeCount={draft.places.length} />


        {activeStep.id === "mode" ? (
          <View style={styles.modeChoiceGrid}>
            <PlanModeChoice mode="local" selected={draft.mode === "local"} title="Offline places" helper="Cafes, parks, museums, coworking spots, walks, or real addresses." onPress={() => changeMode("local")} />
            <PlanModeChoice mode="online" selected={draft.mode === "online"} title="Online places" helper="Discord, WhatsApp, Figma, Google Meet, Zoom, or other online stops." onPress={() => changeMode("online")} />
            <PlanModeChoice mode="mixed" selected={draft.mode === "mixed"} title="Mixed plan" helper="Start offline or online, then continue with another ordered stop." onPress={() => changeMode("mixed")} />
          </View>
        ) : null}

        {activeStep.id === "places" ? (
          <View style={styles.draftPlacesStack}>
            <PlacePickerPanel
              mode={draft.mode}
              sourceId={placePickerSourceId}
              filterId={placePickerFilterId}
              searchText={placePickerSearchText}
              selectedCount={draft.places.length}
              selectedLibraryPlaceIds={selectedLibraryPlaceIds}
              userPlaces={userPlaces}
              createPlaceDraft={placeCreateDraft}
              onChangeSource={(sourceId) => {
                setPlacePickerSourceId(sourceId);
                setPlacePickerSearchText("");
              }}
              onChangeFilter={setPlacePickerFilterId}
              onChangeSearchText={setPlacePickerSearchText}
              onAddLibraryPlace={addLibraryPlace}
              onChangeCreatePlaceDraft={setPlaceCreateDraft}
              onSaveCreatedPlace={saveCreatedPlace}
            />
            <SelectedPlanPlacesSummary places={draft.places} />
          </View>
        ) : null}

        {activeStep.id === "arrange" ? (
          <View style={styles.draftPlacesStack}>
            <View style={styles.draftPlacesHeaderRow}>
              <View style={styles.heroTextBlock}>
                <Text style={[styles.cardEyebrow, { color: palette.muted }]}>ARRANGE ROUTE</Text>
                <Text style={[styles.draftPlaceTitle, { color: palette.text }]}>Order places, times, images, and notes</Text>
                <Text style={[styles.detailHelpText, { color: palette.muted }]}>This is where the Plan becomes an ordered activity. Use Up / Down to change the sequence, then polish each stop.</Text>
              </View>
              <PlanModeBadge label={`${draft.places.length} stops`} />
            </View>

            {draft.places.length === 0 ? (
              <View style={[styles.createWizardEmptyState, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
                <Text style={[styles.placeLibraryTitle, { color: palette.text }]}>No places selected yet</Text>
                <Text style={[styles.detailHelpText, { color: palette.muted }]}>Go back to Places and add at least one reusable place before arranging the route.</Text>
              </View>
            ) : draft.places.map((place, index) => (
              <DraftPlaceEditor
                key={place.id}
                place={place}
                canRemove={draft.places.length > 1}
                canMoveUp={index > 0}
                canMoveDown={index < draft.places.length - 1}
                onChange={(nextPlace) => updatePlace(place.id, nextPlace)}
                onRemove={() => removePlace(place.id)}
                onMoveUp={() => movePlace(place.id, -1)}
                onMoveDown={() => movePlace(place.id, 1)}
              />
            ))}
          </View>
        ) : null}

        {activeStep.id === "rules" ? (
          <View style={styles.draftPlacesStack}>
            <PlanSchedulePanel draft={draft} onChangeDraft={onChangeDraft} />
            <View style={[styles.planScheduleCard, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
              <View style={styles.detailSectionHeader}>
                <View>
                  <Text style={[styles.cardEyebrow, { color: palette.muted }]}>OPTIONAL COVER TEXT</Text>
                  <Text style={[styles.detailSectionTitle, { color: palette.text }]}>Auto-generated unless you override it</Text>
                </View>
                <PlanModeBadge label="Optional" />
              </View>
              <Text style={[styles.detailHelpText, { color: palette.muted }]}>Leave these empty to use the generated route label. The real details stay inside each place note, so places can be translated one by one.</Text>
              <View style={styles.draftFieldGrid}>
                <DraftTextField label="Custom plan title optional" value={draft.title} placeholder={getGeneratedPlanTitleFromPlaces(draft.places, draft.mode)} onChangeText={(title) => onChangeDraft({ ...draft, title })} />
                <DraftTextField label="Plan category label optional" value={draft.category} onChangeText={(category) => onChangeDraft({ ...draft, category })} />
                <View style={styles.fullWidthField}>
                  <DraftTextField label="Short plan note optional" value={draft.summary} placeholder={getGeneratedPlanSummaryFromPlaces(draft.places, draft.mode)} onChangeText={(summary) => onChangeDraft({ ...draft, summary })} multiline />
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {activeStep.id === "preview" ? <PlanCreatePreview draft={draft} /> : null}
      </View>

      <View style={[styles.createFooterPanel, { borderColor: palette.border, backgroundColor: palette.surface }]}>
        <View style={styles.createFooterLeft}>
          <PlanActionButton label={canGoBack ? "Back" : "Cancel"} onPress={canGoBack ? () => onChangeStepIndex(stepIndex - 1) : onBack} />
          <Text style={[styles.createFooterStepText, { color: palette.muted }]}>Step {stepIndex + 1}/{planCreateSteps.length} · {activeStep.label}</Text>
        </View>
        <View style={styles.createFooterRight}>
          {!currentStepIsValid ? (
            <View style={[styles.createStepWarningPill, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
              <Text style={[styles.createStepWarning, { color: palette.danger }]}>{getPlanCreateStepWarning(activeStep.id)}</Text>
            </View>
          ) : null}
          {canGoNext ? (
            <PlanActionButton label={getPlanCreatePrimaryLabel(activeStep.id)} primary disabled={!currentStepIsValid} onPress={() => onChangeStepIndex(stepIndex + 1)} />
          ) : (
            <PlanActionButton label={getPlanCreatePrimaryLabel(activeStep.id)} primary disabled={!currentStepIsValid} onPress={onCreatePlan} />
          )}
        </View>
      </View>
    </View>
  );
}

function createDraftFromPlan(plan: PlanPreview): PlanCreateDraft {
  return {
    title: "",
    summary: "",
    category: plan.category,
    mode: plan.mode,
    ownerName: "Kopy",
    startLabel: plan.startLabel,
    finalEndLabel: "18:00",
    joinDeadlineLabel: "Join until the plan starts",
    capacityLabel: plan.capacityLabel,
    places: plan.places.map((place, index) => ({
      ...place,
      id: `similar-${place.id}-${Date.now()}-${index}`,
      order: index + 1,
    })),
  };
}

function PlanFeedFilters({
  plans,
  activeFilterId,
  joinedPlanIds,
  onChange,
}: {
  plans: PlanPreview[];
  activeFilterId: PlanFeedFilterId;
  joinedPlanIds: string[];
  onChange: (filterId: PlanFeedFilterId) => void;
}) {
  const { palette } = useTheme();
  const activeFilter = planFeedFilters.find((filter) => filter.id === activeFilterId) ?? planFeedFilters[0];

  return (
    <View style={[styles.planFeedFilterPanel, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      <View style={styles.planFeedFilterHeader}>
        <View style={styles.heroTextBlock}>
          <Text style={[styles.cardEyebrow, { color: palette.muted }]}>PLAN FEED VIEWS</Text>
          <Text style={[styles.planFeedFilterTitle, { color: palette.text }]}>{activeFilter.label}</Text>
          <Text style={[styles.planFeedFilterHelper, { color: palette.muted }]}>{activeFilter.helper}</Text>
        </View>
        <View style={[styles.planFeedFilterCount, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
          <Text style={[styles.planFeedFilterCountValue, { color: palette.text }]}>
            {getPlanFeedCount(plans, activeFilterId, joinedPlanIds)}
          </Text>
          <Text style={[styles.planFeedFilterCountLabel, { color: palette.muted }]}>visible</Text>
        </View>
      </View>

      <View style={styles.planFeedFilterTabs}>
        {planFeedFilters.map((filter) => {
          const isActive = filter.id === activeFilterId;
          return (
            <Pressable
              key={filter.id}
              onPress={() => onChange(filter.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              style={({ pressed }) => [
                styles.planFeedFilterTab,
                {
                  borderColor: palette.border,
                  backgroundColor: isActive ? palette.text : palette.surfaceAlt,
                },
                pressed ? styles.pressed : null,
                Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null,
              ]}
            >
              <Text style={[styles.planFeedFilterTabText, { color: isActive ? palette.background : palette.text }]}>
                {filter.label} · {getPlanFeedCount(plans, filter.id, joinedPlanIds)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function PlanFeedEmptyState({ filterId, onCreatePlan }: { filterId: PlanFeedFilterId; onCreatePlan: () => void }) {
  const { palette } = useTheme();

  return (
    <View style={[styles.planFeedEmptyCard, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
      <View style={[styles.planFeedEmptyIcon, { borderColor: palette.border, backgroundColor: palette.surface }]}>
        <Text style={[styles.planFeedEmptyIconText, { color: palette.text }]}>⌁</Text>
      </View>
      <View style={styles.heroTextBlock}>
        <Text style={[styles.cardEyebrow, { color: palette.muted }]}>{getPlanFeedFilterLabel(filterId).toUpperCase()}</Text>
        <Text style={[styles.planFeedEmptyTitle, { color: palette.text }]}>{getPlanFeedEmptyTitle(filterId)}</Text>
        <Text style={[styles.planFeedEmptyCopy, { color: palette.muted }]}>{getPlanFeedEmptyCopy(filterId)}</Text>
      </View>
      <PlanActionButton label="Create mock plan" primary onPress={onCreatePlan} />
    </View>
  );
}

function PlansScreen({ isDesktop }: { isDesktop: boolean }) {
  const { palette } = useTheme();
  const [plans, setPlans] = useState<PlanPreview[]>(planPreviews);
  const [userPlaces, setUserPlaces] = useState<PlaceLibraryItem[]>(myPlaceLibrary);
  const [expandedPlanIds, setExpandedPlanIds] = useState<string[]>([planPreviews[0]?.id ?? ""]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [createModeOpen, setCreateModeOpen] = useState(false);
  const [placeLibraryOpen, setPlaceLibraryOpen] = useState(false);
  const [createStepIndex, setCreateStepIndex] = useState(0);
  const [createDraft, setCreateDraft] = useState<PlanCreateDraft>(() => createInitialPlanDraft());
  const [joinedPlanIds, setJoinedPlanIds] = useState<string[]>([]);
  const [activePlanFeedFilterId, setActivePlanFeedFilterId] = useState<PlanFeedFilterId>("explore");
  const [joinCandidateId, setJoinCandidateId] = useState<string | null>(null);
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? null;
  const joinCandidate = plans.find((plan) => plan.id === joinCandidateId) ?? null;
  const visiblePlans = useMemo(
    () => getFilteredPlans(plans, activePlanFeedFilterId, joinedPlanIds),
    [plans, activePlanFeedFilterId, joinedPlanIds]
  );

  const togglePlan = (planId: string) => {
    setExpandedPlanIds((current) =>
      current.includes(planId) ? current.filter((id) => id !== planId) : [...current, planId]
    );
  };

  const planIsJoined = (plan: PlanPreview) => isCurrentUserPlan(plan) || joinedPlanIds.includes(plan.id);

  const openCreateFlow = (draft?: PlanCreateDraft) => {
    setJoinCandidateId(null);
    setCreateDraft(draft ?? createInitialPlanDraft());
    setCreateStepIndex(0);
    setSelectedPlanId(null);
    setPlaceLibraryOpen(false);
    setCreateModeOpen(true);
  };

  const openPlaceLibrary = () => {
    setJoinCandidateId(null);
    setSelectedPlanId(null);
    setCreateModeOpen(false);
    setPlaceLibraryOpen(true);
  };

  const closeCreateFlow = () => {
    setCreateModeOpen(false);
  };

  const openPlanDetail = (planId: string) => {
    setJoinCandidateId(null);
    setSelectedPlanId(planId);
  };

  const openJoinFlow = (plan: PlanPreview) => {
    if (!canJoinPlan(plan, planIsJoined(plan))) {
      return;
    }

    setJoinCandidateId(plan.id);
  };

  const cancelJoinFlow = () => {
    setJoinCandidateId(null);
  };

  const confirmJoinPlan = () => {
    if (!joinCandidate || !canJoinPlan(joinCandidate, planIsJoined(joinCandidate))) {
      setJoinCandidateId(null);
      return;
    }

    setPlans((current) =>
      current.map((plan) => {
        if (plan.id !== joinCandidate.id) {
          return plan;
        }

        return {
          ...plan,
          joinedCount: plan.joinedCount + 1,
          joinedPreview: addCurrentUserToJoinedPreview(plan.joinedPreview),
        };
      })
    );
    setJoinedPlanIds((current) => (current.includes(joinCandidate.id) ? current : [...current, joinCandidate.id]));
    setActivePlanFeedFilterId("joined");
    setJoinCandidateId(null);
  };

  const createReusablePlace = (place: PlaceLibraryItem) => {
    setUserPlaces((current) => [place, ...current.filter((item) => item.id !== place.id)]);
  };

  const updateReusablePlace = (place: PlaceLibraryItem) => {
    setUserPlaces((current) => current.map((item) => (item.id === place.id ? place : item)));
  };

  const deleteReusablePlace = (placeId: string) => {
    setUserPlaces((current) => current.filter((item) => item.id !== placeId));
  };

  const createPlan = () => {
    const createdPlan = buildPlanPreviewFromDraft(createDraft);
    setPlans((current) => [createdPlan, ...current]);
    setExpandedPlanIds((current) => [createdPlan.id, ...current.filter((id) => id !== createdPlan.id)]);
    setActivePlanFeedFilterId("created");
    setCreateModeOpen(false);
    setJoinCandidateId(null);
    setSelectedPlanId(createdPlan.id);
  };

  if (placeLibraryOpen) {
    return (
      <PlaceLibraryScreen
        userPlaces={userPlaces}
        isDesktop={isDesktop}
        onBack={() => setPlaceLibraryOpen(false)}
        onCreatePlace={createReusablePlace}
        onUpdatePlace={updateReusablePlace}
        onDeletePlace={deleteReusablePlace}
      />
    );
  }

  if (createModeOpen) {
    return (
      <PlanCreateFlow
        draft={createDraft}
        stepIndex={createStepIndex}
        userPlaces={userPlaces}
        onBack={closeCreateFlow}
        onChangeDraft={setCreateDraft}
        onChangeStepIndex={setCreateStepIndex}
        onCreatePlan={createPlan}
        onCreateReusablePlace={createReusablePlace}
      />
    );
  }

  if (selectedPlan) {
    return (
      <>
        <PlanDetailPage
          plan={selectedPlan}
          joined={planIsJoined(selectedPlan)}
          onBack={() => {
            setJoinCandidateId(null);
            setSelectedPlanId(null);
          }}
          onJoinPress={() => openJoinFlow(selectedPlan)}
        />
        {joinCandidate ? (
          <JoinPlanSheet plan={joinCandidate} onCancel={cancelJoinFlow} onConfirm={confirmJoinPlan} />
        ) : null}
      </>
    );
  }

  return (
    <View style={styles.tabContent}>
      <View style={[styles.heroPanel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={styles.plansHeroTopRow}>
          <View style={styles.heroTextBlock}>
            <Text style={[styles.heroEyebrow, { color: palette.muted }]}>FUTURE MAIN AREA</Text>
            <Text style={[styles.heroTitle, { color: palette.text }]}>Plans are open activities.</Text>
            <Text style={[styles.heroCopy, { color: palette.muted }]}>
              A plan is separate from trades: choose local places or online platform places, order them,
              publish the plan, manage reusable places, filter the feed, open detail pages, and let people join freely with local mock state.
            </Text>
          </View>
          <View style={styles.plansHeroActionRow}>
            <Pressable
              onPress={openPlaceLibrary}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.createPlanButton,
                { borderColor: palette.border, backgroundColor: palette.surfaceAlt },
                pressed ? styles.pressed : null,
                Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null,
              ]}
            >
              <Text style={[styles.createPlanButtonText, { color: palette.text }]}>My places</Text>
            </Pressable>
            <Pressable
              onPress={() => openCreateFlow()}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.createPlanButton,
                { borderColor: palette.border, backgroundColor: palette.text },
                pressed ? styles.pressed : null,
                Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null,
              ]}
            >
              <Text style={[styles.createPlanButtonText, { color: palette.background }]}>+ Create</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <PlanFeedFilters
        plans={plans}
        activeFilterId={activePlanFeedFilterId}
        joinedPlanIds={joinedPlanIds}
        onChange={setActivePlanFeedFilterId}
      />

      <SectionHeader
        label="MOCK PLAN FEED"
        title={`${getPlanFeedFilterLabel(activePlanFeedFilterId)} Plans · ${visiblePlans.length} visible`}
      />
      {visiblePlans.length > 0 ? (
        <View style={[styles.cardStack, isDesktop ? styles.planFeedDesktopGrid : null]}>
          {visiblePlans.map((plan) => (
            <View key={plan.id} style={isDesktop ? styles.planFeedDesktopItem : null}>
              <PlanCard
                plan={plan}
                expanded={expandedPlanIds.includes(plan.id)}
                joined={planIsJoined(plan)}
                onToggle={() => togglePlan(plan.id)}
                onOpenDetail={() => openPlanDetail(plan.id)}
                onJoinPress={() => openJoinFlow(plan)}
                onCreateSimilar={() => openCreateFlow(createDraftFromPlan(plan))}
              />
            </View>
          ))}
        </View>
      ) : (
        <PlanFeedEmptyState filterId={activePlanFeedFilterId} onCreatePlan={() => openCreateFlow()} />
      )}
      {joinCandidate ? (
        <JoinPlanSheet plan={joinCandidate} onCancel={cancelJoinFlow} onConfirm={confirmJoinPlan} />
      ) : null}
    </View>
  );
}

function getFilteredTradeItems(activeFilterId: TradeFilterId) {
  if (activeFilterId === "trades") {
    return tradePreviews.filter((item) => item.type === "trade");
  }

  if (activeFilterId === "needs") {
    return tradePreviews.filter((item) => item.type === "open_need");
  }

  if (activeFilterId === "offers") {
    return tradePreviews.filter((item) => item.type === "open_offer");
  }

  return tradePreviews;
}

function getFilterCount(filterId: TradeFilterId) {
  return getFilteredTradeItems(filterId).length;
}

function TradeFilterShell({
  expanded,
  activeFilterId,
  onToggleExpanded,
  onChangeFilter,
}: {
  expanded: boolean;
  activeFilterId: TradeFilterId;
  onToggleExpanded: () => void;
  onChangeFilter: (filterId: TradeFilterId) => void;
}) {
  const { palette } = useTheme();
  const activeFilter = tradeFilters.find((filter) => filter.id === activeFilterId) ?? tradeFilters[0];

  return (
    <View style={[styles.filterPanel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Pressable
        onPress={onToggleExpanded}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={({ pressed }) => [
          styles.filterHeaderButton,
          pressed ? styles.pressed : null,
          Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null,
        ]}
      >
        <View style={styles.filterHeaderTextBlock}>
          <Text style={[styles.cardEyebrow, { color: palette.muted }]}>COLLAPSIBLE FILTERS</Text>
          <Text style={[styles.filterTitle, { color: palette.text }]}>{activeFilter.label}</Text>
          <Text style={[styles.filterHelper, { color: palette.muted }]}>{activeFilter.helper}</Text>
        </View>
        <View style={styles.filterHeaderRight}>
          <View style={[styles.filterCountPill, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
            <Text style={[styles.filterCountText, { color: palette.text }]}>{getFilterCount(activeFilterId)}</Text>
          </View>
          <Text style={[styles.mockChevron, { color: palette.muted }]}>{expanded ? "▾" : "▸"}</Text>
        </View>
      </Pressable>

      {expanded ? (
        <>
          <View style={[styles.filterDivider, { backgroundColor: palette.border }]} />
          <View style={styles.filterRow}>
            {tradeFilters.map((filter) => {
              const isActive = activeFilterId === filter.id;
              return (
                <Pressable
                  key={filter.id}
                  onPress={() => onChangeFilter(filter.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  style={({ pressed }) => [
                    styles.filterChip,
                    {
                      borderColor: palette.border,
                      backgroundColor: isActive ? palette.text : palette.surfaceAlt,
                    },
                    pressed ? styles.pressed : null,
                    Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null,
                  ]}
                >
                  <Text style={[styles.filterChipText, { color: isActive ? palette.background : palette.text }]}>
                    {filter.label} · {getFilterCount(filter.id)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.filterFootnote, { color: palette.muted }]}>
            Main navigation stays fixed. Needs and offers are explored from this Trade area instead of separate root tabs.
          </Text>
        </>
      ) : null}
    </View>
  );
}

function StarterPlacementPreview() {
  const { palette } = useTheme();

  return (
    <View style={[styles.starterPlacementPanel, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
      <View style={styles.cardTopLine}>
        <Text style={[styles.cardEyebrow, { color: palette.muted }]}>STARTER PLACEMENT PREVIEW</Text>
        <View style={[styles.smallTag, { borderColor: palette.border, backgroundColor: palette.surface }]}>
          <Text style={[styles.smallTagText, { color: palette.text }]}>IDEAS</Text>
        </View>
      </View>
      <Text style={[styles.starterPlacementTitle, { color: palette.text }]}>Starter cards appear only as honest ideas.</Text>
      <Text style={[styles.starterPlacementCopy, { color: palette.muted }]}>
        In this lab, the All feed shows a starter card after real/mock feed items. Filtered views hide starter ideas so search-style browsing feels clean.
      </Text>
    </View>
  );
}

function OpenItemCard({ item }: { item: TradePreview }) {
  const { palette } = useTheme();
  const isNeed = item.type === "open_need";

  return (
    <View style={[styles.openItemCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.cardTopLine}>
        <Text style={[styles.cardEyebrow, { color: palette.muted }]}>{isNeed ? "OPEN NEED" : "OPEN OFFER"}</Text>
        <View style={[styles.smallTag, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
          <Text style={[styles.smallTagText, { color: palette.text }]}>{isNeed ? "NEED" : "OFFER"}</Text>
        </View>
      </View>

      <Text style={[styles.openItemTitle, { color: palette.text }]}>{item.title}</Text>
      <Text style={[styles.tradeMeta, { color: palette.muted }]}>{item.meta}</Text>

      <View style={[styles.cardFooter, { borderTopColor: palette.border }]}>
        <Text style={[styles.footerMeta, { color: palette.muted }]}>Real open {isNeed ? "need" : "offer"} preview</Text>
        <Text style={[styles.footerAction, { color: palette.text }]}>{item.footerLabel}</Text>
      </View>
    </View>
  );
}

function TradeCard({ trade }: { trade: TradePreview }) {
  const { palette } = useTheme();
  const isStarter = trade.type === "starter";

  if (trade.type === "open_need" || trade.type === "open_offer") {
    return <OpenItemCard item={trade} />;
  }

  return (
    <View style={[styles.tradeCard, isStarter ? styles.starterTradeCard : null, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.cardTopLine}>
        <Text style={[styles.cardEyebrow, { color: palette.muted }]}>
          {isStarter ? "TRADE IDEA" : "OPEN TRADE"}
        </Text>
        <View style={[styles.smallTag, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
          <Text style={[styles.smallTagText, { color: palette.text }]}>{isStarter ? "IDEA" : "LIVE"}</Text>
        </View>
      </View>

      {isStarter && trade.placementNote ? (
        <Text style={[styles.starterPlacementNote, { color: palette.muted }]}>{trade.placementNote}</Text>
      ) : null}

      <View style={styles.exchangeBlock}>
        <View style={styles.exchangeSide}>
          <Text style={[styles.exchangeLabel, { color: palette.muted }]}>I need</Text>
          <Text style={[styles.exchangeTitle, { color: palette.text }]}>{trade.needTitle}</Text>
        </View>
        <View style={[styles.exchangeDivider, { backgroundColor: palette.border }]} />
        <Text style={[styles.exchangeIcon, { color: palette.muted }]}>↔</Text>
        <View style={[styles.exchangeDivider, { backgroundColor: palette.border }]} />
        <View style={styles.exchangeSide}>
          <Text style={[styles.exchangeLabel, { color: palette.muted }]}>I offer</Text>
          <Text style={[styles.exchangeTitle, { color: palette.text }]}>{trade.offerTitle}</Text>
        </View>
      </View>

      <Text style={[styles.tradeMeta, { color: palette.muted }]}>{trade.meta}</Text>
      <View style={[styles.cardFooter, { borderTopColor: palette.border }]}>
        <Text style={[styles.footerMeta, { color: palette.muted }]}>{isStarter ? "Starter idea card" : "Real trade preview"}</Text>
        <Text style={[styles.footerAction, { color: palette.text }]}>{trade.footerLabel}</Text>
      </View>
    </View>
  );
}

function TradeScreen() {
  const { palette } = useTheme();
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [activeFilterId, setActiveFilterId] = useState<TradeFilterId>("all");
  const visibleItems = useMemo(() => getFilteredTradeItems(activeFilterId), [activeFilterId]);
  const showStarterPlacementPreview = activeFilterId === "all";

  return (
    <View style={styles.tabContent}>
      <View style={[styles.heroPanel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={styles.plansHeroTopRow}>
          <View style={styles.heroTextBlock}>
            <Text style={[styles.heroEyebrow, { color: palette.muted }]}>FUTURE TRADE AREA</Text>
            <Text style={[styles.heroTitle, { color: palette.text }]}>Trade keeps the deck identity.</Text>
            <Text style={[styles.heroCopy, { color: palette.muted }]}>
              Needs and offers move into collapsible filters, create menus, and Me instead of staying in the main nav.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.createPlanButton,
              { borderColor: palette.border, backgroundColor: palette.text },
              pressed ? styles.pressed : null,
              Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null,
            ]}
          >
            <Text style={[styles.createPlanButtonText, { color: palette.background }]}>+ Create</Text>
          </Pressable>
        </View>
      </View>

      <TradeFilterShell
        expanded={filtersExpanded}
        activeFilterId={activeFilterId}
        onToggleExpanded={() => setFiltersExpanded((current) => !current)}
        onChangeFilter={setActiveFilterId}
      />

      {showStarterPlacementPreview ? <StarterPlacementPreview /> : null}

      <SectionHeader
        label="MOCK TRADE FEED"
        title={activeFilterId === "all" ? "Real items plus starter ideas" : `${visibleItems.length} filtered items`}
      />
      <View style={styles.cardStack}>
        {visibleItems.map((trade) => (
          <TradeCard key={trade.id} trade={trade} />
        ))}
      </View>
    </View>
  );
}

function ActiveContent({ activeTab, isDesktop }: { activeTab: NavLabTabId; isDesktop: boolean }) {
  if (activeTab === "plans") {
    return <PlansScreen isDesktop={isDesktop} />;
  }
  if (activeTab === "trade") {
    return <TradeScreen />;
  }
  return <MeScreen isDesktop={isDesktop} />;
}

export function NavLabScreen() {
  const { palette } = useTheme();
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<NavLabTabId>("me");
  const isDesktop = Platform.OS === "web" && width >= desktopBreakpoint;

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <Stack.Screen options={{ title: "Navigation Lab", headerShown: false }} />
      <View style={[styles.shell, isDesktop ? styles.desktopShell : null]}>
        <LabHeader activeTab={activeTab} isDesktop={isDesktop} />
        {isDesktop ? <TopTabs activeTab={activeTab} onChange={setActiveTab} /> : null}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            isDesktop ? styles.scrollContentDesktop : null,
            !isDesktop ? styles.scrollContentMobile : null,
          ]}
        >
          <ActiveContent activeTab={activeTab} isDesktop={isDesktop} />
        </ScrollView>
        {!isDesktop ? <BottomTabs activeTab={activeTab} onChange={setActiveTab} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  shell: {
    flex: 1,
  },
  desktopShell: {
    width: "100%",
    maxWidth: 1120,
    alignSelf: "center",
  },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    paddingHorizontal: 2,
  },
  textButtonLabel: {
    fontSize: 13,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.68,
  },
  headerPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "rgba(128,128,128,0.12)",
  },
  headerPillText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  headerTitleRow: {
    marginTop: 16,
    flexDirection: "row",
  },
  headerTitleBlock: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  title: {
    marginTop: 6,
    fontSize: 31,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: 6,
    maxWidth: 680,
    fontSize: 14,
    lineHeight: 20,
  },
  topTabsWrap: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topTabs: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 520,
    flexDirection: "row",
    borderRadius: 999,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  topTabButton: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  topTabLabel: {
    fontSize: 14,
    fontWeight: "900",
  },
  bottomTabs: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingHorizontal: 10,
  },
  bottomTabButton: {
    flex: 1,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  bottomTabIndicator: {
    width: 26,
    height: 3,
    borderRadius: 999,
  },
  bottomTabLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  bottomTabLabelActive: {
    fontWeight: "900",
  },
  scrollContent: {
    padding: 18,
  },
  scrollContentDesktop: {
    paddingBottom: 48,
  },
  scrollContentMobile: {
    paddingBottom: 28,
  },
  tabContent: {
    gap: 16,
  },
  profilePanel: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "900",
  },
  profileTextBlock: {
    flex: 1,
  },
  profileTitle: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  profileSubtitle: {
    marginTop: 3,
    fontSize: 13,
  },
  profileStatPill: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
  },
  profileStatValue: {
    fontSize: 18,
    fontWeight: "900",
  },
  profileStatLabel: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: "800",
  },
  sectionHeader: {
    gap: 5,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  mobileHubToolbar: {
    gap: 10,
  },
  customizeButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  customizeButtonText: {
    fontSize: 12,
    fontWeight: "900",
  },
  customizeHint: {
    maxWidth: 520,
    fontSize: 13,
    lineHeight: 18,
  },
  customizeActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  secondaryActionButton: {
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: "900",
  },
  primaryActionButton: {
    minHeight: 40,
    borderRadius: 999,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryActionText: {
    fontSize: 12,
    fontWeight: "900",
  },
  reorderCard: {
    minHeight: 118,
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  reorderHandle: {
    width: 32,
    alignItems: "center",
    gap: 5,
  },
  reorderHandleIcon: {
    fontSize: 19,
    fontWeight: "900",
  },
  reorderIndex: {
    fontSize: 11,
    fontWeight: "900",
  },
  reorderTextBlock: {
    flex: 1,
  },
  reorderTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  reorderSummary: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
  },
  reorderControls: {
    gap: 8,
  },
  reorderControlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  reorderControlText: {
    fontSize: 17,
    fontWeight: "900",
  },
  nextPatchPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  nextPatchPillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  sectionCountPill: {
    minWidth: 28,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignItems: "center",
  },
  sectionCountText: {
    fontSize: 11,
    fontWeight: "900",
  },
  meAccordionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  meAccordionTitleRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  desktopSectionTabs: {
    flexDirection: "row",
    borderRadius: 26,
    borderWidth: 1,
    padding: 6,
    gap: 6,
  },
  desktopSectionTab: {
    flex: 1,
    minHeight: 82,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    justifyContent: "space-between",
  },
  desktopSectionTabEyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  desktopSectionTabTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  desktopSectionTabTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  desktopMePanel: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 18,
  },
  desktopMePanelHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  desktopMePanelTitle: {
    marginTop: 5,
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  desktopMePanelSummary: {
    marginTop: 8,
    maxWidth: 680,
    fontSize: 14,
    lineHeight: 20,
  },
  meStack: {
    gap: 12,
  },
  meGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  meSection: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
  },
  meSectionDesktop: {
    flexGrow: 1,
    flexBasis: "48%",
  },
  meSectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  meSectionTitleBlock: {
    flex: 1,
  },
  cardEyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  meSectionTitle: {
    marginTop: 4,
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  mockChevron: {
    fontSize: 18,
    fontWeight: "900",
  },
  meSectionSummary: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
  },
  itemList: {
    marginTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  meItemRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  meItemTextBlock: {
    flex: 1,
  },
  meItemLabel: {
    fontSize: 15,
    fontWeight: "900",
  },
  meItemSubtitle: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 16,
  },
  meItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  countPill: {
    minWidth: 30,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
  },
  countPillText: {
    fontSize: 12,
    fontWeight: "900",
  },
  rowChevron: {
    fontSize: 21,
    fontWeight: "900",
  },
  heroPanel: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 18,
  },
  plansHeroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },
  heroTextBlock: {
    flex: 1,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  heroTitle: {
    marginTop: 8,
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  heroCopy: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 680,
  },
  createPlanButton: {
    minHeight: 42,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  createPlanButtonText: {
    fontSize: 13,
    fontWeight: "900",
  },
  plansHeroActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 8,
  },
  standalonePlaceStatsRow: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  cardStack: {
    gap: 12,
  },
  planFeedDesktopGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "stretch",
  },
  planFeedDesktopItem: {
    flexGrow: 1,
    flexBasis: 360,
    maxWidth: "49%",
  },
  planFeedFilterPanel: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
    gap: 13,
  },
  planFeedFilterHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  planFeedFilterTitle: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  planFeedFilterHelper: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  planFeedFilterCount: {
    minWidth: 72,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
  },
  planFeedFilterCountValue: {
    fontSize: 18,
    fontWeight: "900",
  },
  planFeedFilterCountLabel: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: "900",
  },
  planFeedFilterTabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  planFeedFilterTab: {
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  planFeedFilterTabText: {
    fontSize: 12,
    fontWeight: "900",
  },
  planFeedEmptyCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 13,
  },
  planFeedEmptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  planFeedEmptyIconText: {
    fontSize: 23,
    fontWeight: "900",
  },
  planFeedEmptyTitle: {
    marginTop: 5,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  planFeedEmptyCopy: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },
  planDeckCard: {
    padding: 16,
  },
  planTopTags: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 7,
  },
  planDeckPressable: {
    gap: 0,
  },
  planDeckRouteRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 7,
  },
  planDeckRouteStep: {
    maxWidth: 132,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  planDeckRouteOrder: {
    fontSize: 11,
    fontWeight: "900",
  },
  planDeckRouteTitle: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "800",
  },
  planDeckRouteArrow: {
    fontSize: 14,
    fontWeight: "900",
  },
  cardTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  planModeBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  planModeBadgeText: {
    fontSize: 11,
    fontWeight: "900",
  },
  planStatsRow: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  planMiniStat: {
    minWidth: 72,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  planMiniStatValue: {
    fontSize: 16,
    fontWeight: "900",
  },
  planMiniStatLabel: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  planPlaceTextBlock: {
    flex: 1,
    gap: 4,
  },
  nextStepPanel: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 13,
  },
  nextStepLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  nextStepText: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: "900",
  },
  nextStepMeta: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 17,
  },
  planActions: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  planActionButton: {
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  planActionText: {
    fontSize: 12,
    fontWeight: "900",
  },
  detailHeaderPanel: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 16,
    gap: 18,
  },
  detailTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  detailBackButton: {
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  detailBackText: {
    fontSize: 13,
    fontWeight: "900",
  },
  detailStatusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 8,
  },
  detailSummaryStack: {
    gap: 14,
  },
  detailQuickActionPanel: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  detailTitle: {
    marginTop: 9,
    fontSize: 34,
    lineHeight: 39,
    fontWeight: "900",
    letterSpacing: -1,
  },
  detailSummary: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700",
  },
  detailMetaLine: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
  },
  detailSectionCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  detailSectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },
  detailSectionTitle: {
    marginTop: 4,
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  detailSectionMeta: {
    maxWidth: 280,
    textAlign: "right",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
  },
  detailVisualPlaceStack: {
    gap: 16,
  },
  detailVisualPlaceItem: {
    gap: 10,
  },
  detailVisualPlaceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  detailPlaceNumberPill: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  detailPlaceConnectorLine: {
    alignSelf: "center",
    width: StyleSheet.hairlineWidth,
    height: 18,
  },
  detailPlaceMarkerText: {
    fontSize: 13,
    fontWeight: "900",
  },
  detailPlaceTitle: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  detailPlaceMeta: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
  },
  detailParticipantRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  participantChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  participantChipText: {
    fontSize: 12,
    fontWeight: "900",
  },
  detailHelpText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },
  detailActionPanel: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 14,
  },
  joinSheetPanel: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  joinSheetTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  joinSheetTitleBlock: {
    flex: 1,
    gap: 7,
  },
  joinSheetTitle: {
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  joinSheetCopy: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },
  joinSheetModePill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  joinSheetRouteCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 13,
  },
  joinSheetActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 8,
  },
  detailActionTitle: {
    marginTop: 5,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  planActionsInline: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 8,
  },
  createStepStack: {
    gap: 10,
  },
  createProgressTrack: {
    height: 7,
    borderRadius: 999,
    overflow: "hidden",
  },
  createProgressFill: {
    height: "100%",
    borderRadius: 999,
  },
  createStepRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  createStepChip: {
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  createStepNumber: {
    fontSize: 11,
    fontWeight: "900",
  },
  createStepLabel: {
    fontSize: 12,
    fontWeight: "900",
  },
  createStepWarning: {
    maxWidth: 280,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "900",
    textAlign: "right",
  },
  createStepWarningPill: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  createWizardNoteCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 13,
    gap: 11,
  },
  createWizardNoteTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  createWizardNoteTitle: {
    marginTop: 5,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  createWizardNoteCopy: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
  },
  createWizardStatusPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  createWizardStatusText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  createWizardMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  createWizardMetaText: {
    borderRadius: 999,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "900",
  },
  createWizardWarningCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  createWizardWarningText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900",
  },
  createStepPanel: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  draftFieldGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  draftFieldBlock: {
    flexGrow: 1,
    flexBasis: 220,
    gap: 6,
  },
  fullWidthField: {
    width: "100%",
  },
  draftFieldLabel: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  draftTextInput: {
    minHeight: 44,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "800",
  },
  draftTextInputMultiline: {
    minHeight: 92,
    lineHeight: 20,
    textAlignVertical: "top",
  },
  modeChoiceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  modeChoiceCard: {
    flexGrow: 1,
    flexBasis: 220,
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  modeChoiceTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  modeChoiceTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  modeChoiceHelper: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },
  placePickerPanel: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  placePickerHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  placePickerTitle: {
    marginTop: 5,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  placePickerHelper: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  placePickerCountPill: {
    minWidth: 70,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
  },
  placePickerSourceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  placePickerSourceChip: {
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  placePickerSourceLabel: {
    fontSize: 12,
    fontWeight: "900",
  },
  placePickerFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  placePickerFilterChip: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  placePickerFilterText: {
    fontSize: 11,
    fontWeight: "900",
  },
  placePickerSearchInput: {
    minHeight: 44,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "800",
  },
  placePickerActiveNote: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
  },
  placeLibraryList: {
    gap: 10,
  },
  placePickerEmptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  placeLibraryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 10,
    flexDirection: "row",
    gap: 12,
    alignItems: "stretch",
  },
  standalonePlaceCard: {
    minHeight: 166,
  },
  standalonePlaceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "stretch",
  },
  standalonePlaceGridItem: {
    flexGrow: 1,
    flexBasis: 360,
    maxWidth: "49%",
  },
  standalonePlaceMetaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  standalonePlaceMetaPill: {
    flexGrow: 1,
    flexBasis: 120,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  standalonePlaceActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  placeLibraryImage: {
    width: 112,
    minHeight: 112,
    borderRadius: 18,
    borderWidth: 1,
    padding: 10,
    justifyContent: "space-between",
  },
  placeLibraryImageText: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "900",
  },
  placeLibraryMediaThumb: {
    position: "relative",
    overflow: "hidden",
    padding: 9,
    justifyContent: "space-between",
  },
  placeLibraryMediaBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  placeLibraryMapMini: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.86,
  },
  placeLibraryMapMiniRoad: {
    position: "absolute",
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.28)",
  },
  placeLibraryMapMiniPin: {
    position: "absolute",
    top: 50,
    left: 44,
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.76)",
    backgroundColor: "rgba(0,0,0,0.26)",
  },
  placeLibraryPlatformMini: {
    position: "absolute",
    top: 18,
    left: 13,
    right: 13,
    bottom: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.13)",
    overflow: "hidden",
  },
  placeLibraryPlatformMiniHeader: {
    height: 22,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  placeLibraryPlatformMiniBody: {
    flex: 1,
    padding: 9,
    flexDirection: "row",
    gap: 7,
  },
  placeLibraryPlatformMiniSidebar: {
    width: 18,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  placeLibraryPlatformMiniContent: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  placeLibraryMediaBottom: {
    zIndex: 2,
    gap: 2,
  },
  placeLibraryMediaKicker: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 8,
    lineHeight: 10,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  placeLibraryMediaTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "900",
  },
  placeLibraryBody: {
    flex: 1,
    gap: 8,
  },
  placeLibraryHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  placeLibraryTitle: {
    marginTop: 4,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  placeLibraryMeta: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
  },
  placeLibraryDescription: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  placeLibraryAddButton: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  placeLibraryAddText: {
    fontSize: 11,
    fontWeight: "900",
  },
  placePickerCreateCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  createPlaceFormFooter: {
    gap: 10,
  },
  selectedPlacesCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  selectedPlaceList: {
    gap: 8,
  },
  selectedPlaceRow: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  selectedPlaceOrder: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedPlaceTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  selectedPlaceMeta: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
  },
  draftPlacesHeaderRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  draftPlacesStack: {
    gap: 12,
  },
  createWizardEmptyState: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  planScheduleCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  draftPlaceCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  draftPlaceHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  planSummarySurface: {
    minHeight: 258,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  planSummaryCenterBlock: {
    flex: 1,
    minHeight: 126,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 7,
  },
  planSummaryModeLabel: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  planSummaryDeckTitle: {
    maxWidth: 560,
    textAlign: "center",
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "900",
    letterSpacing: -0.72,
  },
  planSummaryDeckCopy: {
    maxWidth: 560,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  planSummaryRouteLine: {
    maxWidth: 560,
    marginTop: 4,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
  },
  planSummaryMetaRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  planSummaryMetaText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
  },
  planSummaryCardCount: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  planPlaceCardStack: {
    marginTop: 14,
    gap: 12,
  },
  planPosterPlaceCard: {
    minHeight: 318,
    padding: 0,
    overflow: "hidden",
    borderWidth: 0,
  },
  planPosterBackdrop: {
    overflow: "hidden",
  },
  planPosterGlow: {
    position: "absolute",
    top: -42,
    right: -34,
    width: 184,
    height: 184,
    borderRadius: 92,
    opacity: 0.42,
  },
  planPosterLine: {
    position: "absolute",
    height: 14,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.46)",
  },
  planPosterMapMockup: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.78,
  },
  planPosterMapRoad: {
    position: "absolute",
    height: 18,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.26)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  planPosterMapPin: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.72)",
    backgroundColor: "rgba(0,0,0,0.24)",
  },
  planPosterMapPinPrimary: {
    top: 78,
    left: 54,
  },
  planPosterMapPinSecondary: {
    top: 138,
    right: 68,
    opacity: 0.76,
  },
  planPosterMapPinTertiary: {
    top: 202,
    left: "46%",
    opacity: 0.56,
  },
  planPosterPlatformMockup: {
    position: "absolute",
    top: 62,
    left: 34,
    right: 34,
    height: 178,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
    opacity: 0.82,
  },
  planPosterPlatformHeader: {
    height: 36,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  planPosterPlatformDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.54)",
  },
  planPosterPlatformBody: {
    flex: 1,
    flexDirection: "row",
    padding: 14,
    gap: 12,
  },
  planPosterPlatformSidebar: {
    width: 46,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  planPosterPlatformMain: {
    flex: 1,
    borderRadius: 18,
    padding: 12,
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.13)",
  },
  planPosterPlatformLineWide: {
    width: "72%",
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.38)",
  },
  planPosterPlatformLine: {
    width: "48%",
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.24)",
  },
  planPosterPlatformGridRow: {
    flexDirection: "row",
    gap: 9,
  },
  planPosterPlatformTile: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.17)",
  },
  planPosterMediaLabelPanel: {
    position: "absolute",
    top: 104,
    left: 22,
    right: 22,
    alignItems: "center",
    gap: 4,
  },
  planPosterFallbackKicker: {
    color: "rgba(255,255,255,0.48)",
    textAlign: "center",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  planPosterVisualLabel: {
    color: "rgba(255,255,255,0.58)",
    textAlign: "center",
    fontSize: 26,
    lineHeight: 31,
    fontWeight: "900",
    letterSpacing: -0.7,
  },
  planPosterTopBadges: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,
    zIndex: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  planPosterBadge: {
    minHeight: 30,
    borderRadius: 999,
    paddingHorizontal: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
  },
  planPosterPrimaryBadge: {
    backgroundColor: "rgba(0,0,0,0.32)",
  },
  planPosterKindBadge: {
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  planPosterBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  planPosterBlurWash: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "58%",
    zIndex: 1,
  },
  planPosterBlurBandSoft: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "44%",
    backgroundColor: "rgba(0,0,0,0.14)",
  },
  planPosterBlurBandStrong: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "28%",
    height: "44%",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  planPosterBlurBandDeep: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "48%",
    backgroundColor: "rgba(0,0,0,0.56)",
  },
  planPosterBottomContent: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    padding: 18,
    alignItems: "flex-start",
    gap: 5,
  },
  planPosterEyebrow: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  planPosterTitle: {
    color: "#FFFFFF",
    fontSize: 27,
    lineHeight: 31,
    fontWeight: "900",
    letterSpacing: -0.65,
  },
  planPosterNote: {
    maxWidth: 560,
    color: "rgba(255,255,255,0.86)",
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
  },
  planPosterMeta: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
  },
  planPosterChipRow: {
    marginTop: 5,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  planPosterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  planPosterChipText: {
    color: "rgba(255,255,255,0.86)",
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "900",
  },
  draftPlaceTitleBlock: {
    flex: 1,
  },
  draftPlaceTitle: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  draftPlaceActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 6,
  },
  removePlaceButton: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  removePlaceText: {
    fontSize: 11,
    fontWeight: "900",
  },
  createPreviewCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
  },
  planDeckPreviewStack: {
    gap: 14,
  },
  planDeckPreviewIntro: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  planDeckPreviewCard: {
    width: "100%",
  },
  planPreviewPlaceMedia: {
    marginTop: 16,
    minHeight: 168,
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  planPreviewPlaceMetaPanel: {
    marginTop: 14,
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  createFooterPanel: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
  },
  createFooterLeft: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  createFooterStepText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "900",
  },
  createFooterRight: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  cardFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  footerMeta: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
  },
  footerAction: {
    fontSize: 13,
    fontWeight: "900",
  },
  filterPanel: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  filterHeaderButton: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  filterHeaderTextBlock: {
    flex: 1,
  },
  filterTitle: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  filterHelper: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
  },
  filterHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterCountPill: {
    minWidth: 34,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
    alignItems: "center",
  },
  filterCountText: {
    fontSize: 12,
    fontWeight: "900",
  },
  filterDivider: {
    height: StyleSheet.hairlineWidth,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "900",
  },
  filterFootnote: {
    fontSize: 12,
    lineHeight: 17,
  },
  starterPlacementPanel: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  starterPlacementTitle: {
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  starterPlacementCopy: {
    fontSize: 13,
    lineHeight: 18,
  },
  openItemCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
  },
  openItemTitle: {
    marginTop: 16,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  starterTradeCard: {
    borderStyle: "dashed",
  },
  starterPlacementNote: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
  },
  tradeCard: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 16,
  },
  smallTag: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  smallTagText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  exchangeBlock: {
    marginTop: 18,
    alignItems: "center",
    gap: 12,
  },
  exchangeSide: {
    width: "100%",
    alignItems: "center",
    gap: 5,
  },
  exchangeLabel: {
    fontSize: 12,
    fontWeight: "900",
  },
  exchangeTitle: {
    textAlign: "center",
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  exchangeDivider: {
    width: "64%",
    height: StyleSheet.hairlineWidth,
  },
  exchangeIcon: {
    fontSize: 22,
    fontWeight: "900",
  },
  tradeMeta: {
    marginTop: 14,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
  },
});

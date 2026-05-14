import { Platform } from "react-native";

export const GRID_LIST_PROPS = {
  initialNumToRender: 6,
  maxToRenderPerBatch: 6,
  updateCellsBatchingPeriod: 50,
  windowSize: 7,
  removeClippedSubviews: Platform.OS === "android",
};

export const VERTICAL_LIST_PROPS = {
  initialNumToRender: 10,
  maxToRenderPerBatch: 8,
  updateCellsBatchingPeriod: 50,
  windowSize: 9,
  removeClippedSubviews: Platform.OS === "android",
};

export const CHAT_LIST_PROPS = {
  initialNumToRender: 16,
  maxToRenderPerBatch: 10,
  updateCellsBatchingPeriod: 40,
  windowSize: 11,
  removeClippedSubviews: Platform.OS === "android",
};

export const SMALL_LIST_PROPS = {
  initialNumToRender: 7,
  maxToRenderPerBatch: 7,
  updateCellsBatchingPeriod: 50,
  windowSize: 5,
  removeClippedSubviews: Platform.OS === "android",
};

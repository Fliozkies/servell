// lib/components/LocationPicker.tsx
//
// Location picker using OpenStreetMap Nominatim — free, no API key, no billing.
// Supports both typing to search and tapping a point on the map.

import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { MapPressEvent, Marker, Region } from "react-native-maps";
import { COLORS } from "../constants/theme";

export type SelectedLocation = {
  text: string; // e.g. "Digos City, Davao del Sur, Philippines"
  lat: number;
  lng: number;
};

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
};

// Nominatim place types that represent a city, town, or municipality.
// Anything not in this set (streets, buildings, POIs, etc.) is filtered out.
const VALID_PLACE_TYPES = new Set([
  "city",
  "town",
  "village",
  "municipality",
  "administrative",
  "suburb",
  "quarter",
  "neighbourhood",
]);

type LocationPickerProps = {
  onLocationSelect: (location: SelectedLocation) => void;
  onClear?: () => void;
  placeholder?: string;
  initialValue?: string;
  error?: boolean;
  errorMessage?: string;
};

const PHILIPPINES_REGION: Region = {
  latitude: 12.8797,
  longitude: 121.774,
  latitudeDelta: 14,
  longitudeDelta: 14,
};

const CLEAN_MAP_STYLE = [
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  {
    featureType: "poi.park",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
];

// Strips country suffix and long admin chains — keeps it readable
function formatPlaceName(displayName: string): string {
  const parts = displayName.split(", ");
  // Remove the last part if it's just "Philippines"
  const filtered =
    parts[parts.length - 1] === "Philippines" ? parts.slice(0, -1) : parts;
  // Cap at 4 parts to avoid overly long strings
  return filtered.slice(0, 4).join(", ");
}

export default function LocationPicker({
  onLocationSelect,
  onClear,
  placeholder = "Search your city or municipality...",
  initialValue,
  error = false,
  errorMessage,
}: LocationPickerProps) {
  const [query, setQuery] = useState(initialValue ?? "");
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  // True only when the user picked from the dropdown or confirmed a map pin.
  // Resets to false as soon as they edit the text manually.
  const [isValidSelection, setIsValidSelection] = useState(
    initialValue != null && initialValue.length > 0,
  );

  const [mapVisible, setMapVisible] = useState(false);
  const [pendingPin, setPendingPin] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<MapView>(null);

  // ── Search via Nominatim as user types ────────────────────────────────────
  const handleChangeText = (text: string) => {
    setQuery(text);
    setIsValidSelection(false); // user is typing freehand — no longer a confirmed pick
    setShowDropdown(false);
    setSuggestions([]);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (text.trim().length < 2) return;

    debounceTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const url =
          `https://nominatim.openstreetmap.org/search` +
          `?q=${encodeURIComponent(text)}` +
          `&countrycodes=ph` +
          `&format=json` +
          `&addressdetails=1` +
          `&featuretype=settlement` +
          `&limit=8`;

        const res = await fetch(url, {
          headers: {
            // Nominatim requires a descriptive User-Agent
            "User-Agent": "Servell/1.0 (servell@servell.ph)",
            "Accept-Language": "en",
          },
        });
        const raw: NominatimResult[] = await res.json();
        // Layer 2: filter out anything that isn't a settlement-level place
        const data = raw.filter(
          (r) => VALID_PLACE_TYPES.has(r.type) || r.class === "boundary",
        );
        setSuggestions(data);
        setShowDropdown(data.length > 0);
      } catch (e) {
        console.error("[LocationPicker] Nominatim search error:", e);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  // ── User taps a suggestion ────────────────────────────────────────────────
  const handleSelectSuggestion = (item: NominatimResult) => {
    const name = formatPlaceName(item.display_name);
    setQuery(name);
    setSuggestions([]);
    setShowDropdown(false);
    setIsValidSelection(true);
    onLocationSelect({
      text: name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    });
  };

  // ── Clear ─────────────────────────────────────────────────────────────────
  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setShowDropdown(false);
    setIsValidSelection(false);
    onClear?.();
  };

  // ── Open map modal ────────────────────────────────────────────────────────
  const handleOpenMap = async () => {
    setPendingPin(null);
    setMapVisible(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setTimeout(() => {
        mapRef.current?.animateToRegion(
          {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          },
          600,
        );
      }, 400);
    } catch {
      // Falls back to Philippines overview
    }
  };

  const handleMapPress = (e: MapPressEvent) => {
    setPendingPin(e.nativeEvent.coordinate);
  };

  // ── Confirm map pin → reverse geocode via Nominatim ───────────────────────
  const handleConfirmPin = async () => {
    if (!pendingPin) return;
    setGeocoding(true);
    try {
      const { latitude, longitude } = pendingPin;
      const url =
        `https://nominatim.openstreetmap.org/reverse` +
        `?lat=${latitude}&lon=${longitude}` +
        `&format=json`;

      const res = await fetch(url, {
        headers: {
          "User-Agent": "Servell/1.0 (servell@servell.ph)",
          "Accept-Language": "en",
        },
      });
      const data = await res.json();
      const name = data.display_name
        ? formatPlaceName(data.display_name)
        : `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

      setQuery(name);
      setIsValidSelection(true);
      onLocationSelect({ text: name, lat: latitude, lng: longitude });
    } catch {
      const fallback = `${pendingPin.latitude.toFixed(5)}, ${pendingPin.longitude.toFixed(5)}`;
      setQuery(fallback);
      setIsValidSelection(true);
      onLocationSelect({
        text: fallback,
        lat: pendingPin.latitude,
        lng: pendingPin.longitude,
      });
    } finally {
      setGeocoding(false);
      setMapVisible(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={{ zIndex: 10 }}>
      {/* ── Input row ── */}
      {/* Show invalid border when user has typed something but not picked from dropdown */}
      <View
        style={[
          styles.container,
          (error || (query.length > 0 && !isValidSelection)) && {
            borderColor: COLORS.danger,
            borderWidth: 1.5,
          },
        ]}
      >
        <Ionicons
          name="location-outline"
          size={18}
          color={error ? COLORS.danger : COLORS.slate400}
          style={styles.icon}
        />

        <TextInput
          style={styles.textInput}
          value={query}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.slate400}
          autoCorrect={false}
          autoCapitalize="words"
          onBlur={() => {
            // Small delay so tapping a suggestion registers before hiding
            setTimeout(() => setShowDropdown(false), 150);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setShowDropdown(true);
          }}
        />

        {searching && (
          <ActivityIndicator
            size="small"
            color={COLORS.slate400}
            style={{ marginRight: 4 }}
          />
        )}

        {/* Map pin button */}
        <TouchableOpacity onPress={handleOpenMap} style={styles.iconBtn}>
          <Ionicons name="map-outline" size={18} color={COLORS.primary} />
        </TouchableOpacity>

        {/* Clear button */}
        {query.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.iconBtn}>
            <Ionicons name="close-circle" size={16} color={COLORS.slate400} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Suggestions dropdown ── */}
      {showDropdown && suggestions.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => String(item.place_id)}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionRow}
                onPress={() => handleSelectSuggestion(item)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="location-outline"
                  size={14}
                  color={COLORS.slate400}
                  style={{ marginRight: 8, marginTop: 1 }}
                />
                <Text style={styles.suggestionText} numberOfLines={2}>
                  {formatPlaceName(item.display_name)}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {error && errorMessage && (
        <Text style={styles.errorText}>{errorMessage}</Text>
      )}
      {!error && query.length > 0 && !isValidSelection && (
        <Text style={styles.errorText}>
          Please select a location from the suggestions.
        </Text>
      )}

      {/* ── Map picker modal ── */}
      <Modal
        visible={mapVisible}
        animationType="slide"
        onRequestClose={() => setMapVisible(false)}
      >
        <View style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Pick Your Location</Text>
          </View>

          <View style={styles.hint}>
            <Text style={styles.hintText}>
              {pendingPin
                ? "Location pinned — confirm below or tap again to move"
                : "Tap anywhere on the map to place your pin"}
            </Text>
          </View>

          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            initialRegion={PHILIPPINES_REGION}
            customMapStyle={CLEAN_MAP_STYLE}
            showsPointsOfInterests={false}
            showsBuildings={false}
            onPress={handleMapPress}
          >
            {pendingPin && (
              <Marker coordinate={pendingPin} pinColor={COLORS.primary} />
            )}
          </MapView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setMapVisible(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                (!pendingPin || geocoding) && styles.confirmBtnDisabled,
              ]}
              onPress={handleConfirmPin}
              disabled={!pendingPin || geocoding}
            >
              {geocoding ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmBtnText}>
                  {pendingPin ? "Confirm Location" : "Tap map to place pin"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.slate100,
    borderRadius: 12,
    paddingLeft: 12,
    paddingRight: 6,
    borderWidth: 1,
    borderColor: "transparent",
  },
  icon: {
    marginRight: 6,
    flexShrink: 0,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: "#0f172a",
    paddingVertical: 12,
    backgroundColor: "transparent",
  },
  iconBtn: {
    padding: 8,
  },
  dropdown: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: COLORS.slate200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 999,
    overflow: "hidden",
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    color: "#0f172a",
    lineHeight: 18,
  },
  separator: {
    height: 0.5,
    backgroundColor: COLORS.slate100,
  },
  errorText: {
    marginTop: 4,
    marginLeft: 4,
    fontSize: 12,
    color: COLORS.danger,
  },
  // Modal
  modalHeader: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 64 : 36,
    paddingBottom: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
  },
  hint: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  hintText: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 32 : 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
  },
  confirmBtnDisabled: {
    backgroundColor: "#cbd5e1",
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});

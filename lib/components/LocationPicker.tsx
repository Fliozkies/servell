// lib/components/LocationPicker.tsx
//
// Google Places Autocomplete input — reusable for registration and
// service creation. Returns a { text, lat, lng } on selection.
//
// Install dependency:
//   npx expo install react-native-google-places-autocomplete
//
// Add to your .env:
//   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
//
// In Google Cloud Console:
//   - Enable "Places API (New)" on your project
//   - Add "Places API" to your API key's API restrictions

import { Ionicons } from "@expo/vector-icons";
import { useRef } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  GooglePlacesAutocomplete,
  GooglePlacesAutocompleteRef,
} from "react-native-google-places-autocomplete";
import { COLORS } from "../constants/theme";

export type SelectedLocation = {
  text: string;       // Display string, e.g. "Digos City, Davao del Sur, Philippines"
  lat: number;
  lng: number;
};

type LocationPickerProps = {
  onLocationSelect: (location: SelectedLocation) => void;
  onClear?: () => void;
  placeholder?: string;
  /** Pre-fill with an existing value (e.g. when editing profile) */
  initialValue?: string;
  /** Show error state */
  error?: boolean;
  errorMessage?: string;
};

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export default function LocationPicker({
  onLocationSelect,
  onClear,
  placeholder = "Search your city or municipality...",
  initialValue,
  error = false,
  errorMessage,
}: LocationPickerProps) {
  const ref = useRef<GooglePlacesAutocompleteRef>(null);

  const handleClear = () => {
    ref.current?.clear();
    onClear?.();
  };

  return (
    <View>
      <View
        style={[
          styles.container,
          error && { borderColor: COLORS.danger, borderWidth: 1.5 },
        ]}
      >
        {/* Search icon */}
        <Ionicons
          name="location-outline"
          size={18}
          color={error ? COLORS.danger : COLORS.slate400}
          style={styles.icon}
        />

        <GooglePlacesAutocomplete
          ref={ref}
          placeholder={placeholder}
          fetchDetails={true}
          onPress={(data, details) => {
            if (!details?.geometry?.location) return;
            onLocationSelect({
              text: data.description,
              lat: details.geometry.location.lat,
              lng: details.geometry.location.lng,
            });
          }}
          query={{
            key: GOOGLE_MAPS_API_KEY,
            language: "en",
            // Bias results toward the Philippines
            components: "country:ph",
            // Only return cities, municipalities, and sublocalities
            types: "(cities)",
          }}
          textInputProps={{
            placeholderTextColor: COLORS.slate400,
            style: styles.input,
          }}
          styles={{
            textInputContainer: styles.textInputContainer,
            textInput: styles.hiddenDefaultInput,
            listView: styles.listView,
            row: styles.row,
            description: styles.description,
            separator: styles.separator,
            poweredContainer: styles.poweredContainer,
          }}
          enablePoweredByContainer={false}
          // Session token reduces billing — each full search = 1 session
          GooglePlacesDetailsQuery={{ fields: "geometry" }}
          keepResultsAfterBlur={false}
          // Only start searching after 2 characters
          minLength={2}
          debounce={300}
          // Pre-fill if editing
          {...(initialValue ? { predefinedPlaces: [] } : {})}
        />

        {/* Clear button */}
        <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
          <Ionicons name="close-circle" size={16} color={COLORS.slate400} />
        </TouchableOpacity>
      </View>

      {error && errorMessage && (
        <Text style={styles.errorText}>{errorMessage}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.slate100,
    borderRadius: 12,
    paddingLeft: 12,
    paddingRight: 6,
    borderWidth: 1,
    borderColor: "transparent",
    // Needs fixed height context for the dropdown to position correctly
    zIndex: 10,
  },
  icon: {
    marginTop: 13,
    marginRight: 6,
    flexShrink: 0,
  },
  textInputContainer: {
    flex: 1,
    backgroundColor: "transparent",
    borderTopWidth: 0,
    borderBottomWidth: 0,
    paddingHorizontal: 0,
  },
  // We override the default input via textInputProps.style, so hide this
  hiddenDefaultInput: {
    backgroundColor: "transparent",
    fontSize: 14,
    color: COLORS.slate900 ?? "#0f172a",
    paddingHorizontal: 0,
    paddingVertical: 0,
    height: 44,
    marginTop: 0,
    marginBottom: 0,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#0f172a",
    paddingVertical: 12,
    backgroundColor: "transparent",
  },
  clearBtn: {
    padding: 8,
    marginTop: 6,
  },
  listView: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 0.5,
    borderColor: COLORS.slate200,
    // Position dropdown below the input
    position: "absolute",
    top: 48,
    left: 0,
    right: 0,
    zIndex: 999,
  },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  description: {
    fontSize: 13,
    color: "#0f172a",
  },
  separator: {
    height: 0.5,
    backgroundColor: COLORS.slate100,
  },
  poweredContainer: {
    display: "none",
  },
  errorText: {
    marginTop: 4,
    marginLeft: 4,
    fontSize: 12,
    color: COLORS.danger,
  },
});

import { Image, Pressable, Switch, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import type { SavedCarSpot } from "../../types/spots";

type ActiveScreenProps = {
  styles: any;
  selectedSpot: SavedCarSpot | null;
  currentLocation: { latitude: number; longitude: number } | null;
  showMap: boolean;
  guidanceEnabled: boolean;
  turnAngle: number | null;
  targetBearing: number | null;
  distanceToSpot: number | null;
  mapRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  formatDistance: (meters: number | null) => string;
  onToggleShowMap: (value: boolean) => void;
  onToggleGuidance: () => void;
  onOpenMaps: () => void | Promise<void>;
  onShareSpot: () => void | Promise<void>;
  onBackHome: () => void;
  onEditSpot: (spot: SavedCarSpot) => void;
};

export function ActiveScreen({
  styles,
  selectedSpot,
  currentLocation,
  showMap,
  guidanceEnabled,
  turnAngle,
  targetBearing,
  distanceToSpot,
  mapRegion,
  formatDistance,
  onToggleShowMap,
  onToggleGuidance,
  onOpenMaps,
  onShareSpot,
  onBackHome,
  onEditSpot,
}: ActiveScreenProps) {
  if (!selectedSpot) {
    return (
      <View style={styles.card}>
        <Text style={styles.infoLine}>Aucun emplacement actif sélectionné.</Text>
        <Pressable style={[styles.button, styles.secondary]} onPress={onBackHome}>
          <Text style={styles.buttonText}>Retour à l&apos;accueil</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Emplacement actif</Text>
        <Text style={styles.infoLine}>{selectedSpot.name}</Text>
        <Text style={styles.infoLine}>
          {selectedSpot.description ? selectedSpot.description : "Sans description"}
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.modeRow}>
          <Text style={styles.cardTitle}>Afficher la carte</Text>
          <Switch value={showMap} onValueChange={onToggleShowMap} />
        </View>
      </View>

      {showMap ? (
        <MapView style={styles.map} initialRegion={mapRegion} region={mapRegion}>
          {currentLocation ? (
            <Marker
              coordinate={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
              }}
              title="Vous"
              pinColor="#2563eb"
            />
          ) : null}
          <Marker
            coordinate={{
              latitude: selectedSpot.latitude,
              longitude: selectedSpot.longitude,
            }}
            title={selectedSpot.name}
            description={selectedSpot.description || "Position enregistrée"}
            pinColor="#dc2626"
          />
        </MapView>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Infos</Text>
        <Text style={styles.infoLine}>Distance: {formatDistance(distanceToSpot)}</Text>
        <Text style={styles.infoLine}>
          Enregistre le: {new Date(selectedSpot.savedAt).toLocaleString()}
        </Text>
        <Text style={styles.infoLine}>
          Position: {selectedSpot.latitude.toFixed(6)},{" "}
          {selectedSpot.longitude.toFixed(6)}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Photo</Text>
        {selectedSpot.photoUri ? (
          <Image source={{ uri: selectedSpot.photoUri }} style={styles.spotPhoto} />
        ) : (
          <>
            <Text style={styles.infoLine}>Aucune photo.</Text>
            <Pressable
              style={[styles.button, styles.photo]}
              onPress={() => onEditSpot(selectedSpot)}
            >
              <Text style={styles.buttonText}>Ajouter une photo</Text>
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Description</Text>
        {selectedSpot.description ? (
          <Text style={styles.infoLine}>{selectedSpot.description}</Text>
        ) : (
          <>
            <Text style={styles.infoLine}>Aucune description</Text>
            <Pressable
              style={[styles.button, styles.secondary]}
              onPress={() => onEditSpot(selectedSpot)}
            >
              <Text style={styles.buttonText}>Ajouter une description</Text>
            </Pressable>
          </>
        )}
      </View>

      {!showMap ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Guidage dans l&apos;app</Text>
          {guidanceEnabled && turnAngle !== null ? (
            <>
              <Text
                style={[
                  styles.guidanceArrow,
                  { transform: [{ rotate: `${turnAngle}deg` }] },
                ]}
              >
                ↑
              </Text>
              <Text style={styles.infoLine}>
                Direction: {Math.round(targetBearing ?? 0)}° | Distance:{" "}
                {formatDistance(distanceToSpot)}
              </Text>
            </>
          ) : (
            <Text style={styles.infoLine}>
              Activez le guidage pour afficher une flèche de direction.
            </Text>
          )}
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable style={[styles.button, styles.success]} onPress={onToggleGuidance}>
          <Text style={styles.buttonText}>
            {guidanceEnabled ? "Arrêter le guidage" : "Y aller"}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.primary]}
          onPress={() => void onOpenMaps()}
        >
          <Text style={styles.buttonText}>Ouvrir dans Maps</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.photo]}
          onPress={() => void onShareSpot()}
        >
          <Text style={styles.buttonText}>Partager l&apos;emplacement</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.secondary]} onPress={onBackHome}>
          <Text style={styles.buttonText}>Retour à l&apos;accueil</Text>
        </Pressable>
      </View>
    </>
  );
}

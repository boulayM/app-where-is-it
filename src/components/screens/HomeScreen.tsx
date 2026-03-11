import { Pressable, Text, View } from "react-native";
import type { SavedCarSpot } from "../../types/spots";

type HomeScreenProps = {
  styles: any;
  savedSpots: SavedCarSpot[];
  onSelectSpot: (spot: SavedCarSpot) => void;
  onEditSpot: (spot: SavedCarSpot) => void;
  onDeleteSpot: (spot: SavedCarSpot) => void | Promise<void>;
  onCreateSpot: () => void;
  onDeleteAll: () => void | Promise<void>;
};

export function HomeScreen({
  styles,
  savedSpots,
  onSelectSpot,
  onEditSpot,
  onDeleteSpot,
  onCreateSpot,
  onDeleteAll,
}: HomeScreenProps) {
  return (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Emplacements enregistres ({savedSpots.length})</Text>
        {savedSpots.length === 0 ? (
          <Text style={styles.infoLine}>Aucun emplacement enregistre.</Text>
        ) : (
          savedSpots.map((spot) => (
            <View key={spot.id} style={styles.spotRow}>
              <Pressable style={styles.spotMain} onPress={() => onSelectSpot(spot)}>
                <Text style={styles.spotTitle}>{spot.name}</Text>
                <Text style={styles.spotMeta}>
                  {spot.description ? spot.description : "Sans description"}
                </Text>
              </Pressable>
              <View style={styles.rowActions}>
                <Pressable style={styles.rowEdit} onPress={() => onEditSpot(spot)}>
                  <Text style={styles.rowEditText}>Editer</Text>
                </Pressable>
                <Pressable style={styles.rowDelete} onPress={() => void onDeleteSpot(spot)}>
                  <Text style={styles.rowDeleteText}>Supprimer</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.actions}>
        <Pressable style={[styles.button, styles.primary]} onPress={onCreateSpot}>
          <Text style={styles.buttonText}>Nouvel emplacement</Text>
        </Pressable>

        <Pressable
          style={[
            styles.button,
            styles.danger,
            savedSpots.length === 0 && styles.disabledButton,
          ]}
          onPress={() => void onDeleteAll()}
          disabled={savedSpots.length === 0}
        >
          <Text style={styles.buttonText}>Tout effacer</Text>
        </Pressable>
      </View>
    </>
  );
}

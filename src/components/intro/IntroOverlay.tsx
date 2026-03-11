import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { letterImages } from "../../introAssets";

const INTRO_MIN_DURATION_MS = 4200;
const INTRO_STAGE2_HOLD_MS = 500;
const INTRO_STAGE3_HOLD_MS = 1100;
const INTRO_STAGGER_MS = 70;

type IntroLetterLayout = {
  image: number;
  size: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  startRotate: number;
  targetRotate: number;
};

function buildIntroLayouts(width: number, height: number): IntroLetterLayout[] {
  const centerX = width / 2;
  const centerY = height / 2;
  const offscreenBase = Math.max(width, height) * 0.92;
  const margin = 18;
  const count = letterImages.length;
  const cols = Math.ceil(Math.sqrt(count * (width / height)));
  const rows = Math.ceil(count / cols);
  const cellW = (width - margin * 2) / cols;
  const cellH = (height - margin * 2) / rows;
  const logoClearW = 260;
  const logoClearH = 220;
  const logoClearRect = {
    left: centerX - logoClearW / 2,
    right: centerX + logoClearW / 2,
    top: centerY - logoClearH / 2,
    bottom: centerY + logoClearH / 2,
  };

  const seeded = (seed: number) => {
    const x = Math.sin(seed * 999.13) * 10000;
    return x - Math.floor(x);
  };

  const allSlots = Array.from({ length: rows * cols }, (_, i) => i);
  const slotsOutsideLogo = allSlots.filter((slot) => {
    const row = Math.floor(slot / cols);
    const col = slot % cols;
    const cellCenterX = margin + cellW * (col + 0.5);
    const cellCenterY = margin + cellH * (row + 0.5);
    return !(
      cellCenterX >= logoClearRect.left &&
      cellCenterX <= logoClearRect.right &&
      cellCenterY >= logoClearRect.top &&
      cellCenterY <= logoClearRect.bottom
    );
  });

  const baseSlots = slotsOutsideLogo.length >= count ? slotsOutsideLogo : allSlots;
  const shuffledIndices = [...baseSlots];
  for (let i = shuffledIndices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(seeded(i + 700) * (i + 1));
    [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
  }

  return letterImages.map((image, index) => {
    const p1 = seeded(index + 1);
    const p2 = seeded(index + 101);
    const p3 = seeded(index + 201);
    const p4 = seeded(index + 301);
    const p5 = seeded(index + 401);

    const slot = shuffledIndices[index % shuffledIndices.length];
    const row = Math.floor(slot / cols);
    const col = slot % cols;
    const jitterX = (p1 - 0.5) * cellW * 0.45;
    const jitterY = (p2 - 0.5) * cellH * 0.45;
    const targetCenterX = margin + cellW * (col + 0.5) + jitterX;
    const targetCenterY = margin + cellH * (row + 0.5) + jitterY;

    const angle = Math.atan2(targetCenterY - centerY, targetCenterX - centerX);
    const offscreenRadius = offscreenBase + p3 * 160;
    const size = 24 + Math.round(p4 * 30);
    const targetRotate = -25 + p5 * 50;
    const startRotate = targetRotate + (p1 - 0.5) * 220;

    const targetX = Math.max(
      margin,
      Math.min(width - margin - size, targetCenterX - size / 2),
    );
    const targetY = Math.max(
      margin,
      Math.min(height - margin - size, targetCenterY - size / 2),
    );
    const clearPadding = 10;
    const clearRect = {
      left: logoClearRect.left - clearPadding,
      right: logoClearRect.right + clearPadding,
      top: logoClearRect.top - clearPadding,
      bottom: logoClearRect.bottom + clearPadding,
    };
    let finalX = targetX;
    let finalY = targetY;
    const intersectsLogoArea = !(
      finalX + size < clearRect.left ||
      finalX > clearRect.right ||
      finalY + size < clearRect.top ||
      finalY > clearRect.bottom
    );
    if (intersectsLogoArea) {
      const currentCenterX = finalX + size / 2;
      const currentCenterY = finalY + size / 2;
      const dx = currentCenterX - centerX;
      const dy = currentCenterY - centerY;
      if (Math.abs(dx) >= Math.abs(dy)) {
        if (dx >= 0) {
          finalX = clearRect.right + 4;
        } else {
          finalX = clearRect.left - size - 4;
        }
      } else if (dy >= 0) {
        finalY = clearRect.bottom + 4;
      } else {
        finalY = clearRect.top - size - 4;
      }
      finalX = Math.max(margin, Math.min(width - margin - size, finalX));
      finalY = Math.max(margin, Math.min(height - margin - size, finalY));
    }
    const startX = centerX + Math.cos(angle) * offscreenRadius - size / 2;
    const startY = centerY + Math.sin(angle) * offscreenRadius - size / 2;

    return {
      image,
      size,
      startX,
      startY,
      targetX: finalX,
      targetY: finalY,
      startRotate,
      targetRotate,
    };
  });
}

type IntroOverlayProps = {
  onContinue: (disableForNextLaunches: boolean) => void;
};

export function IntroOverlay({ onContinue }: IntroOverlayProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const animationTopMargin = Math.max(insets.top, 12) + 10;
  const animationBottomMargin = Math.max(insets.bottom, 18) + 18;
  const areaWidth = screenWidth;
  const areaHeight = Math.max(
    screenHeight - animationTopMargin - animationBottomMargin,
    320,
  );
  const layouts = useMemo(
    () => buildIntroLayouts(areaWidth, areaHeight),
    [areaWidth, areaHeight],
  );
  const introStartedAt = useRef(Date.now());
  const [showLogo, setShowLogo] = useState(false);
  const [showPresentation, setShowPresentation] = useState(false);
  const letters = useRef(
    layouts.map((layout) => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      rotate: new Animated.Value(layout.startRotate),
    })),
  ).current;
  const lettersOpacity = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(1.12)).current;
  const logoTranslateY = useRef(new Animated.Value(0)).current;
  const presentationOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    introStartedAt.current = Date.now();
    setShowLogo(false);
    setShowPresentation(false);
    lettersOpacity.setValue(1);
    logoOpacity.setValue(0);
    logoScale.setValue(1.12);
    logoTranslateY.setValue(0);
    presentationOpacity.setValue(0);
    letters.forEach((anim, i) => {
      anim.x.setValue(0);
      anim.y.setValue(0);
      anim.opacity.setValue(0);
      anim.rotate.setValue(layouts[i].startRotate);
    });

    const letterDurations = letters.map((_, i) =>
      Math.max(
        980 + (i % 5) * 150,
        1020 + (i % 4) * 160,
        920 + (i % 5) * 130,
        520 + (i % 3) * 100,
      ),
    );
    const maxLetterDuration = Math.max(...letterDurations, 0);
    const fullLettersTimelineMs =
      INTRO_STAGGER_MS * Math.max(letters.length - 1, 0) + maxLetterDuration;

    const letterAnimations = letters.map((anim, i) =>
      Animated.parallel([
        Animated.timing(anim.x, {
          toValue: layouts[i].targetX - layouts[i].startX,
          duration: 980 + (i % 5) * 150,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(anim.y, {
          toValue: layouts[i].targetY - layouts[i].startY,
          duration: 1020 + (i % 4) * 160,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(anim.rotate, {
          toValue: layouts[i].targetRotate,
          duration: 920 + (i % 5) * 130,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(anim.opacity, {
          toValue: 1,
          duration: 520 + (i % 3) * 100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    );

    Animated.stagger(INTRO_STAGGER_MS, letterAnimations).start();

    let stage3HoldTimeout: ReturnType<typeof setTimeout> | null = null;
    let stage4Timeout: ReturnType<typeof setTimeout> | null = null;

    const stage3StartTimeout = setTimeout(() => {
      setShowLogo(true);
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.back(1.1)),
          useNativeDriver: true,
        }),
      ]).start(() => {
        const elapsed = Date.now() - introStartedAt.current;
        const minRemaining = Math.max(INTRO_MIN_DURATION_MS - elapsed, 0);
        const hold = Math.max(minRemaining, INTRO_STAGE3_HOLD_MS);
        stage3HoldTimeout = setTimeout(() => {
          Animated.parallel([
            Animated.timing(lettersOpacity, {
              toValue: 0,
              duration: 520,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(logoScale, {
              toValue: 0.44,
              duration: 760,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(logoTranslateY, {
              toValue: -(areaHeight * 0.34),
              duration: 760,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
          ]).start(() => {
            setShowPresentation(true);
            stage4Timeout = setTimeout(() => {
              Animated.timing(presentationOpacity, {
                toValue: 1,
                duration: 520,
                easing: Easing.inOut(Easing.cubic),
                useNativeDriver: true,
              }).start();
            }, 80);
          });
        }, hold);
      });
    }, fullLettersTimelineMs + INTRO_STAGE2_HOLD_MS);

    return () => {
      clearTimeout(stage3StartTimeout);
      if (stage3HoldTimeout) clearTimeout(stage3HoldTimeout);
      if (stage4Timeout) clearTimeout(stage4Timeout);
    };
  }, [
    areaHeight,
    layouts,
    letters,
    lettersOpacity,
    logoOpacity,
    logoScale,
    logoTranslateY,
    presentationOpacity,
  ]);

  return (
    <SafeAreaView style={styles.introOverlaySafe} edges={["left", "right"]}>
      <View
        style={[
          styles.animationViewport,
          {
            marginTop: animationTopMargin,
            marginBottom: animationBottomMargin,
          },
        ]}
      >
        <Animated.View style={styles.introOverlay}>
          <Animated.View style={styles.introLayer}>
            <Animated.View style={{ opacity: lettersOpacity }}>
              {layouts.map((layout, i) => {
                const rotation = letters[i].rotate.interpolate({
                  inputRange: [-180, 180],
                  outputRange: ["-180deg", "180deg"],
                });

                return (
                  <Animated.Image
                    key={`${i}-${layout.size}`}
                    source={layout.image}
                    resizeMode="contain"
                    style={{
                      position: "absolute",
                      width: layout.size,
                      height: layout.size,
                      left: layout.startX,
                      top: layout.startY,
                      opacity: letters[i].opacity,
                      transform: [
                        { translateX: letters[i].x },
                        { translateY: letters[i].y },
                        { rotate: rotation },
                      ],
                    }}
                  />
                );
              })}
            </Animated.View>

            {showLogo ? (
              <Animated.Image
                source={require("../../../assets/where-is-it-logo-center.png")}
                resizeMode="contain"
                style={[
                  styles.introLogo,
                  {
                    opacity: logoOpacity,
                    transform: [{ translateY: logoTranslateY }, { scale: logoScale }],
                  },
                ]}
              />
            ) : null}

            {showPresentation ? (
              <Animated.View
                style={[styles.introPresentation, { opacity: presentationOpacity }]}
              >
                <Text style={styles.introPresentationTitle}>WHERE IS IT ?</Text>
                <Text style={styles.introPresentationText}>
                  Enregistrez rapidement plusieurs emplacements avec note et photo de
                  référence, puis retrouvez-les facilement avec la distance en direct et
                  le guidage Maps.
                </Text>
                <View style={styles.introPresentationActions}>
                  <Pressable
                    style={[
                      styles.introButton,
                      styles.introPrimary,
                      styles.introActionButton,
                    ]}
                    onPress={() => onContinue(false)}
                  >
                    <Text style={styles.introButtonText}>Accéder à l&apos;appli</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.introButton,
                      styles.introSecondary,
                      styles.introActionButton,
                    ]}
                    onPress={() => onContinue(true)}
                  >
                    <Text style={styles.introButtonText}>Ne plus afficher</Text>
                  </Pressable>
                </View>
              </Animated.View>
            ) : null}
          </Animated.View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  introOverlaySafe: {
    flex: 1,
    backgroundColor: "#ececec",
  },
  introOverlay: {
    flex: 1,
    backgroundColor: "#ececec",
  },
  animationViewport: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#ececec",
  },
  introLayer: {
    flex: 1,
  },
  introLogo: {
    position: "absolute",
    width: 220,
    height: 220,
    left: "50%",
    top: "50%",
    marginLeft: -110,
    marginTop: -110,
  },
  introPresentation: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 26,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.96)",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 10,
  },
  introPresentationTitle: {
    color: "#0f172a",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  introPresentationText: {
    color: "#0f172a",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  introPresentationActions: {
    marginTop: 4,
    flexDirection: "row",
    gap: 8,
  },
  introActionButton: {
    flex: 1,
  },
  introButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  introPrimary: {
    backgroundColor: "#0d9488",
  },
  introSecondary: {
    backgroundColor: "#1d4ed8",
  },
  introButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});

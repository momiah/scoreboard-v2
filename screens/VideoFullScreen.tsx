import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  StatusBar,
  Animated,
  PanResponder,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEvent } from "expo";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import styled from "styled-components/native";

interface VideoFullscreenProps {
  videoUrl: string;
  startTime?: number;
  onClose: () => void;
}

const CONTROLS_HIDE_DELAY = 3000;

const VideoFullscreen: React.FC<VideoFullscreenProps> = ({
  videoUrl,
  startTime = 0,
  onClose,
}) => {
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [currentTime, setCurrentTime] = useState(startTime);
  const [scrubValue, setScrubValue] = useState(startTime);
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScrubbingRef = useRef(false);

  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = true;
    p.currentTime = startTime;
    p.play();
  });

  const { isPlaying } = useEvent(player, "playingChange", {
    isPlaying: player.playing,
  });

  const { status } = useEvent(player, "statusChange", {
    status: player.status,
    error: undefined,
  });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        gestureState.dy > 10 &&
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 80) {
          onClose();
        }
      },
    }),
  ).current;

  // ── Get duration when ready ───────────────────────────────────────────────
  useEffect(() => {
    if (status === "readyToPlay") {
      const d = player.duration;
      if (d && !isNaN(d) && isFinite(d) && d > 0) {
        setDuration(d);
      }
    }
  }, [status]);

  // ── Poll currentTime every 500ms ──────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isScrubbingRef.current) {
        setCurrentTime(player.currentTime);
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // ── Controls fade ─────────────────────────────────────────────────────────
  const showControls = useCallback(() => {
    Animated.timing(controlsOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      Animated.timing(controlsOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, CONTROLS_HIDE_DELAY);
  }, [controlsOpacity]);

  useEffect(() => {
    showControls();
    return () => {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    };
  }, []);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleScreenPress = () => {
    showControls();
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
    showControls();
  };

  const handleMutePress = () => {
    player.muted = !player.muted;
    setMuted(!muted);
    showControls();
  };

  const displayTime = isScrubbing ? scrubValue : currentTime;

  return (
    <View
      style={{ flex: 1, backgroundColor: "black" }}
      {...panResponder.panHandlers}
    >
      <StatusBar hidden />

      {/* ── Video ── */}
      <TouchableOpacity
        onPress={handleScreenPress}
        activeOpacity={1}
        style={{ flex: 1 }}
      >
        <VideoView
          player={player}
          nativeControls={false}
          contentFit="contain"
          style={{ flex: 1 }}
        />
      </TouchableOpacity>

      {/* ── Play/pause overlay ── */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: "center",
          alignItems: "center",
          opacity: controlsOpacity,
        }}
      >
        <Ionicons
          name={isPlaying ? "pause-circle" : "play-circle"}
          size={72}
          color="rgba(255,255,255,0.8)"
        />
      </Animated.View>

      {/* ── Bottom controls ── */}
      <Animated.View style={{ opacity: controlsOpacity }}>
        <ControlsContainer>
          <TimeRow>
            <TimeText>{formatTime(displayTime)}</TimeText>
            <TimeText>{formatTime(duration)}</TimeText>
          </TimeRow>
          <ControlsRow>
            <TouchableOpacity onPress={handleTogglePlay}>
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={28}
                color="white"
              />
            </TouchableOpacity>
            <Slider
              style={{ flex: 1, height: 40, marginHorizontal: 12 }}
              minimumValue={0}
              maximumValue={duration > 0 ? duration : 1}
              value={displayTime}
              minimumTrackTintColor="#00A2FF"
              maximumTrackTintColor="rgba(255,255,255,0.3)"
              thumbTintColor="#00A2FF"
              onSlidingStart={(value) => {
                isScrubbingRef.current = true;
                setIsScrubbing(true);
                setScrubValue(value);
                player.pause();
                showControls();
              }}
              onValueChange={(value) => setScrubValue(value)}
              onSlidingComplete={(value) => {
                player.currentTime = value;
                setCurrentTime(value);
                isScrubbingRef.current = false;
                setIsScrubbing(false);
                player.play();
              }}
            />
            <TouchableOpacity onPress={handleMutePress}>
              <Ionicons
                name={muted ? "volume-mute" : "volume-high"}
                size={24}
                color="white"
              />
            </TouchableOpacity>
          </ControlsRow>
        </ControlsContainer>
      </Animated.View>

      {/* ── Back button ── */}
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 10,
          opacity: controlsOpacity,
        }}
      >
        <SafeAreaView>
          <TouchableOpacity
            onPress={onClose}
            style={{
              padding: 12,
              backgroundColor: "rgba(0,0,0,0.4)",
              borderRadius: 20,
              margin: 12,
            }}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
};

// ─── Styled Components ────────────────────────────────────────────────────────

const ControlsContainer = styled.View({
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  paddingHorizontal: 16,
  paddingBottom: 40,
  backgroundColor: "rgba(0,0,0,0.5)",
});

const TimeRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: 12,
  marginBottom: 4,
});

const TimeText = styled.Text({
  color: "rgba(255,255,255,0.8)",
  fontSize: 12,
});

const ControlsRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  paddingBottom: 4,
});

export default VideoFullscreen;

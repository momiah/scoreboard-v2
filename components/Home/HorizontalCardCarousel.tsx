import React, { useState } from "react";
import { Dimensions, View, type ImageSourcePropType } from "react-native";
import styled from "styled-components/native";

import { SkeletonPulse, SkeletonBlock } from "../Skeletons/skeletonConfig";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
/** Full-width card with a peek of the next one. */
export const CAROUSEL_ITEM_WIDTH = SCREEN_WIDTH - 80;
export const CAROUSEL_ITEM_SPACING = 20;

/** A single card, already resolved to its image, tap handler and overlay. */
export interface CarouselCard {
  key: string;
  source: ImageSourcePropType;
  onPress: () => void;
  /** Overlay content rendered on top of the card (tags, name, location, …). */
  content: React.ReactNode;
}

interface HorizontalCardCarouselProps {
  cards: CarouselCard[];
}

/**
 * Content-agnostic horizontal carousel of image cards (scroll, snap, card
 * frame, image + dark overlay, and per-card image skeleton). Callers pre-map
 * their data into CarouselCard[], so leagues, clubs, etc. share the exact same
 * shell without any duplicated scroll/card plumbing.
 */
function HorizontalCardCarousel({ cards }: HorizontalCardCarouselProps) {
  return (
    <CarouselContainer
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      snapToInterval={CAROUSEL_ITEM_WIDTH + CAROUSEL_ITEM_SPACING}
      snapToAlignment="start"
      decelerationRate="fast"
    >
      {cards.map((card) => (
        <CarouselCardView
          key={card.key}
          source={card.source}
          onPress={card.onPress}
        >
          {card.content}
        </CarouselCardView>
      ))}
    </CarouselContainer>
  );
}

interface CarouselCardViewProps {
  source: ImageSourcePropType;
  onPress: () => void;
  children: React.ReactNode;
}

const CarouselCardView: React.FC<CarouselCardViewProps> = ({
  source,
  onPress,
  children,
}) => {
  const [imageLoading, setImageLoading] = useState(true);

  return (
    <CarouselItem
      onPress={onPress}
      style={{
        width: CAROUSEL_ITEM_WIDTH,
        marginRight: CAROUSEL_ITEM_SPACING,
      }}
    >
      <ImageWrapper>
        <CardImage source={source} onLoadEnd={() => setImageLoading(false)}>
          <Overlay />
          <DetailsContainer>{children}</DetailsContainer>
        </CardImage>

        {imageLoading && (
          <ImageSkeletonOverlay>
            <SkeletonPulse>
              <SkeletonBlock width="100%" height={200} />
            </SkeletonPulse>
          </ImageSkeletonOverlay>
        )}
      </ImageWrapper>
    </CarouselItem>
  );
};

export default HorizontalCardCarousel;

// ── Shared overlay atoms (used by each section's renderContent) ──────────────

export const CardTagContainer = styled.View({
  position: "absolute",
  top: 10,
  right: 10,
  zIndex: 2,
  flexDirection: "row",
  gap: 5,
});

export const CardTitle = styled.Text({
  fontSize: 18,
  fontWeight: "bold",
  color: "white",
});

export const CardSubtitle = styled.Text({
  fontSize: 13,
  color: "white",
  borderRadius: 5,
});

export const CardRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
});

// ── Shell styles (mirror the original horizontal league carousel) ───────────

const CarouselContainer = styled.ScrollView({
  height: 200,
  marginBottom: 20,
});

const CarouselItem = styled.TouchableOpacity({
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "#fff",
  borderRadius: 10,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.8,
  shadowRadius: 2,
  elevation: 5,
});

const ImageWrapper = styled.View({
  width: "100%",
  height: "100%",
  borderRadius: 10,
  overflow: "hidden",
});

const CardImage = styled.ImageBackground.attrs({
  imageStyle: {
    resizeMode: "cover",
  },
})({
  width: "100%",
  height: "100%",
  justifyContent: "flex-end",
  alignItems: "center",
});

const DetailsContainer = styled.View({
  width: "100%",
  height: "100%",
  borderRadius: 10,
  overflow: "hidden",
  justifyContent: "flex-end",
  padding: 10,
  borderWidth: 1,
  borderColor: "#192336",
});

const Overlay = styled(View)({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.2)",
  borderRadius: 10,
});

const ImageSkeletonOverlay = styled.View({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1,
});

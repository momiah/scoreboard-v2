import React from "react";
import { ScrollView } from "react-native";
import type { ImageSourcePropType } from "react-native";
import styled from "styled-components/native";

type ImageEntry = ImageSourcePropType | { source: ImageSourcePropType };

interface ImageMapperProps {
  // Accepts an array (e.g. the ladder trophies) or a keyed map (e.g. gameMedals).
  images: ImageEntry[] | Record<string, ImageEntry>;
  title: string;
  description: string;
  // Optional footer rendered below the description (e.g. a "Read the rules" button).
  children?: React.ReactNode;
}

const isImageObject = (
  img: ImageEntry,
): img is { source: ImageSourcePropType } =>
  typeof img === "object" && img !== null && "source" in img;

const toSource = (img: ImageEntry): ImageSourcePropType =>
  isImageObject(img) ? img.source : img;

// Renders a grid of images (2 per row) with a title and description beneath.
const ImageMapper: React.FC<ImageMapperProps> = ({
  images,
  title,
  description,
  children,
}) => {
  const entries = Array.isArray(images)
    ? images.map((img, i) => [String(i), img] as const)
    : Object.entries(images);

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        gap: 18,
        paddingHorizontal: 24,
        paddingVertical: 30,
      }}
    >
      <Grid>
        {entries.map(([key, img]) => (
          <GridImage key={key} source={toSource(img)} resizeMode="contain" />
        ))}
      </Grid>
      <Title>{title}</Title>
      <Description>{description}</Description>
      {children}
    </ScrollView>
  );
};

export default ImageMapper;

const Grid = styled.View({
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "center",
  alignItems: "center",
  gap: 12,
});

const GridImage = styled.Image({
  width: "42%",
  aspectRatio: 1,
});

const Title = styled.Text({
  color: "#ffffff",
  fontSize: 24,
  fontWeight: "bold",
  textAlign: "center",
});

const Description = styled.Text({
  color: "#cccccc",
  fontSize: 15,
  lineHeight: 22,
  textAlign: "center",
});

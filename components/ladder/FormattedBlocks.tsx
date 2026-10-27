import React from "react";
import styled from "styled-components/native";

/** A paragraph, or a list of short points. */
export type TextBlock = string | string[];

interface FormattedBlocksProps {
  blocks: TextBlock[];
  testID?: string;
}

const FormattedBlocks: React.FC<FormattedBlocksProps> = ({
  blocks,
  testID,
}) => (
  <Blocks testID={testID}>
    {blocks.map((block, index) =>
      typeof block === "string" ? (
        <Paragraph key={index}>{block}</Paragraph>
      ) : (
        <List key={index}>
          {block.map((point) => (
            <Point key={point}>
              <Bullet>•</Bullet>
              <PointText>{point}</PointText>
            </Point>
          ))}
        </List>
      ),
    )}
  </Blocks>
);

export default FormattedBlocks;

const Blocks = styled.View({
  gap: 10,
});

const Paragraph = styled.Text({
  color: "#cccccc",
  fontSize: 14,
  lineHeight: 20,
});

const List = styled.View({
  gap: 6,
  paddingLeft: 4,
});

const Point = styled.View({
  flexDirection: "row",
  gap: 8,
});

const Bullet = styled.Text({
  color: "#00A2FF",
  fontSize: 14,
  lineHeight: 20,
});

const PointText = styled.Text({
  flex: 1,
  color: "#cccccc",
  fontSize: 14,
  lineHeight: 20,
});

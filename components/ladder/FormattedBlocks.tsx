import React from "react";
import styled from "styled-components/native";

import { isLegalTable } from "@shared";
import type { LegalBlock, LegalTable } from "@shared";

export type TextBlock = LegalBlock;

interface FormattedBlocksProps {
  blocks: TextBlock[];
  testID?: string;
}

const Table: React.FC<{ table: LegalTable }> = ({ table }) => (
  <TableFrame testID={table.id}>
    <TableRow $header>
      {table.columns.map((column, index) => (
        <HeaderCell key={column} $first={index === 0}>
          {column}
        </HeaderCell>
      ))}
    </TableRow>
    {table.rows.map((row, rowIndex) => (
      <TableRow key={row[0]} $last={rowIndex === table.rows.length - 1}>
        {row.map((cell, index) => (
          <Cell
            key={table.columns[index]}
            $first={index === 0}
            testID={index === 0 ? `${table.id}-row-${rowIndex}` : undefined}
          >
            {cell}
          </Cell>
        ))}
      </TableRow>
    ))}
  </TableFrame>
);

const FormattedBlocks: React.FC<FormattedBlocksProps> = ({
  blocks,
  testID,
}) => (
  <Blocks testID={testID}>
    {blocks.map((block, index) => {
      if (typeof block === "string") {
        return <Paragraph key={index}>{block}</Paragraph>;
      }
      if (isLegalTable(block)) {
        return <Table key={block.id} table={block} />;
      }
      return (
        <List key={index}>
          {block.map((point) => (
            <Point key={point}>
              <Bullet>•</Bullet>
              <PointText>{point}</PointText>
            </Point>
          ))}
        </List>
      );
    })}
  </Blocks>
);

export default FormattedBlocks;

const Blocks = styled.View({
  gap: 10,
});

const Paragraph = styled.Text({
  color: "#cccccc",
  fontSize: 14,
  lineHeight: "20px",
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
  lineHeight: "20px",
});

const PointText = styled.Text({
  flex: 1,
  color: "#cccccc",
  fontSize: 14,
  lineHeight: "20px",
});

const TableFrame = styled.View({
  borderWidth: 1,
  borderColor: "#192336",
  borderRadius: 8,
  overflow: "hidden",
});

type RowProps = { $header?: boolean; $last?: boolean };
type CellProps = { $first?: boolean };

const TableRow = styled.View<RowProps>(
  ({ $header, $last }: RowProps) => ({
    flexDirection: "row",
    backgroundColor: $header ? "rgba(0, 162, 255, 0.08)" : "transparent",
    borderBottomWidth: $last ? 0 : 1,
    borderBottomColor: "#192336",
  }),
);

const HeaderCell = styled.Text<CellProps>(({ $first }: CellProps) => ({
  flex: $first ? 1.6 : 1,
  paddingVertical: 8,
  paddingHorizontal: 6,
  color: "#9fb8c8",
  fontSize: 11,
  fontWeight: "bold",
  textAlign: $first ? "left" : "center",
}));

const Cell = styled.Text<CellProps>(({ $first }: CellProps) => ({
  flex: $first ? 1.6 : 1,
  paddingVertical: 8,
  paddingHorizontal: 6,
  color: "#cccccc",
  fontSize: 12,
  textAlign: $first ? "left" : "center",
}));

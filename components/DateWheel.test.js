import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import DateWheel from "./DateWheel";

const day = (offset) => new Date(2026, 9, 18 + offset);

describe("DateWheel", () => {
  it("lists every selectable day between the bounds and nothing outside", () => {
    const { queryByTestId } = render(
      <DateWheel
        value={day(0)}
        minimumDate={day(0)}
        maximumDate={day(3)}
        onChange={jest.fn()}
      />,
    );
    [0, 1, 2, 3].forEach((offset) =>
      expect(queryByTestId(`date-wheel-item-${offset}`)).not.toBeNull(),
    );
    expect(queryByTestId("date-wheel-item-4")).toBeNull();
  });

  it("reports the day that is tapped", () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <DateWheel
        value={day(0)}
        minimumDate={day(0)}
        maximumDate={day(3)}
        onChange={onChange}
      />,
    );
    fireEvent.press(getByTestId("date-wheel-item-2"));
    expect(onChange).toHaveBeenCalledWith(day(2));
  });

  it("shows a single day when the bounds meet", () => {
    const { queryByTestId } = render(
      <DateWheel
        value={day(0)}
        minimumDate={day(0)}
        maximumDate={day(0)}
        onChange={jest.fn()}
      />,
    );
    expect(queryByTestId("date-wheel-item-0")).not.toBeNull();
    expect(queryByTestId("date-wheel-item-1")).toBeNull();
  });
});

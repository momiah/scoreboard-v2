import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";

jest.mock("expo-blur", () => ({
  BlurView: require("react-native").View,
}));
jest.mock("react-native-ico-flags", () => ({
  __esModule: true,
  default: ({ name }: { name: string }) =>
    require("react").createElement(
      require("react-native").Text,
      { testID: `flag-${name}` },
      name,
    ),
}));
jest.mock("../Skeletons/SkeletonComponents", () => ({
  SkeletonWrapper: () => null,
}));

const mockNewCourt = {
  courtName: "Freshly Added Court",
  location: { city: "London", country: "United Kingdom" },
};
jest.mock("./AddCourtModal", () => ({
  __esModule: true,
  default: ({
    addCourt,
    onCourtAdded,
  }: {
    addCourt: jest.Mock;
    onCourtAdded: jest.Mock;
  }) =>
    require("react").createElement(
      require("react-native").TouchableOpacity,
      {
        testID: "mock-add-court-submit",
        onPress: async () => {
          const id = await addCourt(mockNewCourt);
          if (id) onCourtAdded(mockNewCourt, id);
        },
      },
      require("react").createElement(
        require("react-native").Text,
        null,
        "submit court",
      ),
    ),
}));

import SearchCourt, { type CourtListItem } from "./SearchLocationModal";

const item = (
  key: string,
  value: string,
  overrides: Partial<CourtListItem> = {},
): CourtListItem => ({
  key,
  value,
  city: "London",
  country: "United Kingdom",
  countryCode: "GB",
  address: "1 High St",
  ...overrides,
});

const COURTS: CourtListItem[] = [
  item("d", "Court D Verified"),
  item("b", "Court B Verified"),
  item("c", "Court C Other Pending", { awaitingVerification: true }),
  item("a", "Court A Own Pending", {
    awaitingVerification: true,
    pinned: true,
  }),
];

const renderPicker = (
  props: Partial<React.ComponentProps<typeof SearchCourt>> = {},
) => {
  const onSelectCourt = jest.fn();
  const onClose = jest.fn();
  const utils = render(
    <SearchCourt
      visible
      onClose={onClose}
      courts={COURTS}
      onSelectCourt={onSelectCourt}
      getCourts={jest.fn().mockResolvedValue([])}
      addCourt={jest.fn().mockResolvedValue("new-id")}
      onCourtsRefreshed={jest.fn()}
      {...props}
    />,
  );
  return { ...utils, onSelectCourt, onClose };
};

const rowOrder = (utils: ReturnType<typeof render>) =>
  utils
    .getAllByText(/^Court [A-D] /)
    .map((node) => String(node.props.children));

describe("SearchLocationModal country flags", () => {
  it("shows a flag for each court by default", () => {
    const utils = renderPicker();
    expect(utils.getAllByTestId("flag-GB")).toHaveLength(COURTS.length);
  });

  it("shows no flags when showCountryIcon is false", () => {
    const utils = renderPicker({ showCountryIcon: false });
    expect(utils.queryByTestId("flag-GB")).toBeNull();
  });
});

describe("SearchLocationModal awaiting verification", () => {
  it("labels submissions that are awaiting verification and no others", () => {
    const utils = renderPicker();

    expect(utils.getAllByText("Awaiting Verification")).toHaveLength(2);
    expect(utils.getByTestId("search-court-awaiting-a")).toBeTruthy();
    expect(utils.getByTestId("search-court-awaiting-c")).toBeTruthy();
    expect(utils.getByTestId("search-court-option-b")).toBeTruthy();
    expect(utils.queryByTestId("search-court-awaiting-b")).toBeNull();
  });

  it("does nothing when an awaiting court is pressed", () => {
    const { getByTestId, onSelectCourt, onClose } = renderPicker();

    fireEvent.press(getByTestId("search-court-awaiting-a"));
    fireEvent.press(getByTestId("search-court-awaiting-c"));

    expect(onSelectCourt).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("selects and closes when a verified court is pressed", () => {
    const { getByTestId, onSelectCourt, onClose } = renderPicker();

    fireEvent.press(getByTestId("search-court-option-b"));

    expect(onSelectCourt).toHaveBeenCalledWith("Court B Verified");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("SearchLocationModal ordering", () => {
  it("pins the player's own submission first, then sorts alphabetically", () => {
    const utils = renderPicker();
    expect(rowOrder(utils)).toEqual([
      "Court A Own Pending",
      "Court B Verified",
      "Court C Other Pending",
      "Court D Verified",
    ]);
  });

  it("puts the current selection above everything else", () => {
    const utils = renderPicker({ selectedCourtKey: "d" });
    expect(rowOrder(utils)[0]).toBe("Court D Verified");
  });
});

describe("SearchLocationModal empty state", () => {
  it("shows the empty message when there are no courts", () => {
    const utils = renderPicker({
      courts: [],
      emptyListMessage: "No verified courts yet",
    });
    expect(utils.getByTestId("search-court-empty")).toBeTruthy();
    expect(utils.getByText("No verified courts yet")).toBeTruthy();
  });

  it("does not show the empty message when courts are listed", () => {
    const utils = renderPicker({ emptyListMessage: "No verified courts yet" });
    expect(utils.queryByTestId("search-court-empty")).toBeNull();
  });
});

describe("SearchLocationModal adding a court", () => {
  const addCourtFlow = async (
    props: Partial<React.ComponentProps<typeof SearchCourt>>,
  ) => {
    const getCourts = jest.fn().mockResolvedValue([{ courtId: "new-id" }]);
    const onCourtsRefreshed = jest.fn();
    const utils = renderPicker({ getCourts, onCourtsRefreshed, ...props });
    fireEvent.press(utils.getByTestId("search-court-add"));
    fireEvent.press(utils.getByTestId("mock-add-court-submit"));
    await waitFor(() => expect(onCourtsRefreshed).toHaveBeenCalled());
    return { ...utils, onCourtsRefreshed };
  };

  it("selects the new court straight away by default", async () => {
    const { onSelectCourt, onCourtsRefreshed } = await addCourtFlow({});

    expect(onCourtsRefreshed).toHaveBeenCalledWith([{ courtId: "new-id" }]);
    expect(onSelectCourt).toHaveBeenCalledWith("Freshly Added Court");
  });

  it("does not select the new court when selectAddedCourt is false", async () => {
    const { onSelectCourt } = await addCourtFlow({ selectAddedCourt: false });

    expect(onSelectCourt).not.toHaveBeenCalled();
  });

  it("shows the success message inside the picker when one is provided", async () => {
    const { getByText } = await addCourtFlow({
      selectAddedCourt: false,
      addCourtSuccessMessage: "Court sent for approval.",
    });

    expect(getByText("Court sent for approval.")).toBeTruthy();
  });

  it("shows no toast when no success message is provided", async () => {
    const { queryByText } = await addCourtFlow({ selectAddedCourt: false });

    expect(queryByText("Court sent for approval.")).toBeNull();
  });
});

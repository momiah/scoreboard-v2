import type Ionicons from "@expo/vector-icons/Ionicons";

export type HowToPlayIcon = keyof typeof Ionicons.glyphMap;

export type HowToPlayTone = "white" | "blue" | "gold" | "red";

/** A line of guide text: plain strings, and highlighted runs in a tone. */
export type HowToPlayRichText = (
  | string
  | { text: string; tone: HowToPlayTone }
)[];

export interface HowToPlayCardText {
  icon: HowToPlayIcon;
  text: HowToPlayRichText;
}

export type HowToPlayTextPage = "post-game" | "accept-game";

export interface HowToPlayVariantConfig {
  /** Opens on the Season One intro with the prize pool counting up. */
  intro: boolean;
  /** Shows the ladder's current size and prize pool under the playoff table. */
  showLadderSize: boolean;
  /** The cards on the pages whose wording differs between variants. */
  cards: Record<HowToPlayTextPage, HowToPlayCardText[]>;
}

const HIDDEN_OPPONENT_POST: HowToPlayCardText = {
  icon: "eye-off-outline",
  text: [
    "You'll ",
    { text: "never know your opponent", tone: "white" },
    " until they accept your match.",
  ],
};

const HIDDEN_OPPONENT_ACCEPT: HowToPlayCardText = {
  icon: "eye-off-outline",
  text: [
    "Your opponent is ",
    { text: "hidden", tone: "white" },
    " until you accept the match.",
  ],
};

const POST_A_MATCH: HowToPlayCardText = {
  icon: "calendar-outline",
  text: [
    "Choose your court and post a match. Pick a ",
    { text: "day and time", tone: "white" },
    " that suits you, then wait for another member to accept.",
  ],
};

export const HOW_TO_PLAY_VARIANTS = {
  liveLadder: {
    intro: true,
    showLadderSize: true,
    cards: {
      "post-game": [
        {
          icon: "enter-outline",
          text: [
            "Head over to the ",
            { text: "Match Making", tone: "blue" },
            " tab to post or find matches to progress in the ladder.",
          ],
        },
        POST_A_MATCH,
        HIDDEN_OPPONENT_POST,
      ],
      "accept-game": [
        {
          icon: "map-outline",
          text: [
            "Rather explore? Browse ",
            { text: "live matches", tone: "white" },
            " in the ",
            { text: "Match Making", tone: "blue" },
            " tab at courts across the ladder and accept one that suits you.",
          ],
        },
        HIDDEN_OPPONENT_ACCEPT,
      ],
    },
  },
  preRegistration: {
    intro: true,
    showLadderSize: false,
    cards: {
      "post-game": [
        {
          icon: "enter-outline",
          text: [
            "Once you ",
            { text: "join the ladder", tone: "white" },
            ", you can enter the ",
            { text: "Match Making arena", tone: "blue" },
            " to post or find matches to progress in the competition.",
          ],
        },
        POST_A_MATCH,
        HIDDEN_OPPONENT_POST,
      ],
      "accept-game": [
        {
          icon: "map-outline",
          text: [
            "Rather explore? Browse ",
            { text: "live matches", tone: "white" },
            " at courts across the ladder and accept one that suits you.",
          ],
        },
        HIDDEN_OPPONENT_ACCEPT,
      ],
    },
  },
} satisfies Record<string, HowToPlayVariantConfig>;

export type HowToPlayVariant = keyof typeof HOW_TO_PLAY_VARIANTS;

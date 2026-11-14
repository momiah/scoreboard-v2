import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import {
  ccImageEndpoint,
  locationSchema,
  profileDetailSchema,
  userProfileSchema,
} from "@shared";
import { db } from "../../services/firebase.config";

export const FIXTURE_EMAIL_DOMAIN = "example.com";

export const FIXTURE_LOCATIONS = [
  {
    city: "London",
    country: "United Kingdom",
    countryCode: "GB",
    postCode: "N7 7AJ",
    address: "Highbury Fields, Highbury Crescent",
  },
  {
    city: "Manchester",
    country: "United Kingdom",
    countryCode: "GB",
    postCode: "M14 6NP",
    address: "Platt Fields Park, Wilmslow Road",
  },
  {
    city: "Birmingham",
    country: "United Kingdom",
    countryCode: "GB",
    postCode: "B12 9QH",
    address: "Cannon Hill Park, Russell Road",
  },
  {
    city: "Leeds",
    country: "United Kingdom",
    countryCode: "GB",
    postCode: "LS8 2HH",
    address: "Roundhay Park, Mansion Lane",
  },
  {
    city: "Bristol",
    country: "United Kingdom",
    countryCode: "GB",
    postCode: "BS8 3PJ",
    address: "The Downs, Stoke Road",
  },
  {
    city: "Glasgow",
    country: "United Kingdom",
    countryCode: "GB",
    postCode: "G3 7SA",
    address: "Kelvingrove Park, Kelvin Way",
  },
  {
    city: "Cardiff",
    country: "United Kingdom",
    countryCode: "GB",
    postCode: "CF11 9XR",
    address: "Bute Park, North Road",
  },
  {
    city: "Liverpool",
    country: "United Kingdom",
    countryCode: "GB",
    postCode: "L17 1AP",
    address: "Sefton Park, Aigburth Drive",
  },
];

const hashId = (id) =>
  [...id].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7);

export const fixtureLocationFor = (userId) => ({
  ...locationSchema,
  ...FIXTURE_LOCATIONS[hashId(userId) % FIXTURE_LOCATIONS.length],
});

export const fixtureEmailFor = (userId) => `${userId}@${FIXTURE_EMAIL_DOMAIN}`;

export const isLocationMissing = (location) =>
  !location ||
  Object.keys(locationSchema).some(
    (key) => typeof location[key] !== "string" || location[key].trim() === "",
  );

export const buildFixtureUser = ({
  userId,
  firstName,
  lastName,
  username,
  email = fixtureEmailFor(userId),
  location = fixtureLocationFor(userId),
  profileDetail = profileDetailSchema,
  profileImage = ccImageEndpoint,
  ...rest
}) => ({
  ...userProfileSchema,
  userId,
  firstName,
  lastName,
  username,
  usernameLower: username.toLowerCase(),
  email,
  location: { ...locationSchema, ...location },
  profileDetail,
  profileImage,
  provider: "email_password",
  ...rest,
});

export const writeFixtureUser = (user) =>
  setDoc(doc(db, "users", user.userId), buildFixtureUser(user), {
    merge: true,
  });

const FIXTURE_USER_SUBCOLLECTIONS = ["notifications", "chats"];

export const deleteFixtureUserSubcollections = async (userIds) => {
  await Promise.all(
    userIds.flatMap((userId) =>
      FIXTURE_USER_SUBCOLLECTIONS.map(async (sub) => {
        const snap = await getDocs(collection(db, "users", userId, sub));
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      }),
    ),
  );
};

export const deleteFixtureUsers = async (userIds) => {
  await deleteFixtureUserSubcollections(userIds);
  await Promise.all(userIds.map((id) => deleteDoc(doc(db, "users", id))));
  return userIds;
};

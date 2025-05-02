// src/utils/locationData.js
// Helper functions to load country and city lists using country-state-city

import { Country, City } from "country-state-city";

/**
 * Returns an array of countries that have at least one city.
 * Each item is { key: isoCode, value: countryName }.
 */
export function loadCountries() {
  const all = Country.getAllCountries()
    .map((c) => ({ key: c.isoCode, value: c.name }))
    .filter((c) => City.getCitiesOfCountry(c.key).length > 0);
  return all;
}

/**
 * Given a country ISO code, returns an array of unique cities in that country.
 * Each item is { key: `${name}-${lat}-${lng}`, value: name }.
 */
export function loadCities(countryCode) {
  if (!countryCode) return [];

  const cities = City.getCitiesOfCountry(countryCode) || [];
  const map = new Map();
  cities.forEach((city) => {
    if (city.name && !map.has(city.name)) {
      map.set(city.name, city);
    }
  });

  return Array.from(map.values()).map((city) => ({
    key: `${city.name}-${city.latitude}-${city.longitude}`,
    value: city.name,
  }));
}

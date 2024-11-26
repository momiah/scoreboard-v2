export const leagues = [
  { id: 1, name: "Premier League" },
  { id: 2, name: "La Liga" },
  { id: 3, name: "Serie A" },
  { id: 4, name: "Bundesliga" },
  { id: 5, name: "Ligue 1" },
];

function generateDatasets(n) {
  const datasets = [];
  for (let i = 0; i < n; i++) {
    datasets.push({
      id: i + 1,
      name: `Dataset ${i + 1}`,
      data: [],
    });
  }
  return datasets;
}

// Example usage:
const datasets = generateDatasets(5);
console.log(datasets);

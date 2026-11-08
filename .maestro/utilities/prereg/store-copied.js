// Stores maestro.copiedText in output[NAME], and a regex-escaped copy in
// output[NAME + "_re"] for matching inside a merged accessibility label.
output[NAME] = maestro.copiedText;
output[NAME + "_re"] = maestro.copiedText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

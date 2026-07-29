let nameCounter = 0;

// Unique, human-readable names keep specs isolated without world resets.
export function uniqueName(prefix) {
  nameCounter += 1;
  return `E2E ${prefix} ${Date.now().toString(36)}-${nameCounter}`;
}

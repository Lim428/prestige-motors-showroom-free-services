type VehicleIdentity = {
  year: number;
  brand: string;
  model: string;
  variant?: string | null;
};

function identityTokens(value: string) {
  return value
    .normalize("NFKD")
    .toLocaleLowerCase("en-MY")
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .match(/[a-z0-9]+/g) ?? [];
}

function containsTokenSequence(source: string[], candidate: string[]) {
  if (candidate.length === 0 || candidate.length > source.length) {
    return false;
  }

  return source.some((_, startIndex) =>
    candidate.every((token, offset) => source[startIndex + offset] === token)
  );
}

export function vehicleModelLabel(model: string, variant?: string | null) {
  const cleanVariant = variant?.trim();
  const modelTokens = identityTokens(model);
  const variantTokens = cleanVariant ? identityTokens(cleanVariant) : [];

  if (
    !cleanVariant ||
    containsTokenSequence(modelTokens, variantTokens)
  ) {
    return model;
  }

  return `${model} ${cleanVariant}`;
}

export function vehicleName(vehicle: VehicleIdentity) {
  return `${vehicle.year} ${vehicle.brand} ${vehicleModelLabel(
    vehicle.model,
    vehicle.variant
  )}`;
}

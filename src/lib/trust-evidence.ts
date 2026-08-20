export type TrustEvidenceProfile = {
  inspectionSummary: string | null | undefined;
  lastInspectedAt: Date | string | null | undefined;
};

export type TrustEvidenceDocument = {
  verified: boolean;
  title?: string | null;
  url?: string | null;
};

function isHttpUrl(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export function verifiedTrustEvidenceIssues(
  profile: TrustEvidenceProfile,
  documents: TrustEvidenceDocument[]
) {
  const issues: string[] = [];
  const inspectedAt = profile.lastInspectedAt
    ? new Date(profile.lastInspectedAt)
    : null;

  if (!profile.inspectionSummary?.trim()) {
    issues.push("an inspection summary");
  }
  if (
    !inspectedAt ||
    Number.isNaN(inspectedAt.getTime()) ||
    inspectedAt.getTime() > Date.now()
  ) {
    issues.push("a valid last inspection date that is not in the future");
  }
  if (
    !documents.some(
      (document) =>
        document.verified &&
        Boolean(document.title?.trim()) &&
        isHttpUrl(document.url)
    )
  ) {
    issues.push("at least one dealership-verified supporting document");
  }

  return issues;
}

export function hasVerifiedTrustEvidence(
  profile: TrustEvidenceProfile,
  documents: TrustEvidenceDocument[]
) {
  return verifiedTrustEvidenceIssues(profile, documents).length === 0;
}

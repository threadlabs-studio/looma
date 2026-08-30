function reportedRole(membership, username) {
  return typeof membership === "string"
    ? membership
    : membership?.[username] ?? membership?.role ?? membership?.org?.role;
}

export function scopeAuthorization({ username, scopeName, membership }) {
  if (username === scopeName) {
    return { kind: "user-scope", role: "owner" };
  }

  const role = reportedRole(membership, username);
  if (!role) {
    throw new Error(`npm identity ${username} has no reported role in @${scopeName}`);
  }
  if (role !== "owner") {
    throw new Error(
      `npm identity ${username} must be an owner of @${scopeName}; reported role is ${role}`
    );
  }
  return { kind: "organization", role };
}

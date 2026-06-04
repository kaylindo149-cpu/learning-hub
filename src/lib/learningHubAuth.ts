export const learningHubAuthCookieName = "learning-hub-auth";

export function getLearningHubPassword() {
  return process.env.LEARNING_HUB_PASSWORD?.trim() ?? "";
}

export function getLearningHubAuthSecret() {
  return (
    process.env.LEARNING_HUB_AUTH_SECRET?.trim() ||
    process.env.SLACK_SIGNING_SECRET?.trim() ||
    getLearningHubPassword()
  );
}

export async function createLearningHubAuthToken(password: string) {
  const secret = getLearningHubAuthSecret();
  const data = new TextEncoder().encode(
    `learning-hub-auth:${password}:${secret}`
  );
  const hash = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function isValidLearningHubAuthToken(token?: string) {
  const password = getLearningHubPassword();

  if (!password) {
    return true;
  }

  return token === (await createLearningHubAuthToken(password));
}

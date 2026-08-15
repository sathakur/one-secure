const USER_NAME_STORAGE_KEY = "vmOperationsRequesterUserName";

const form = document.getElementById("manualUserForm");
const input = document.getElementById("manualUserName");
const error = document.getElementById("manualUserError");

function normalizeUserName(value) {
  return String(value || "").trim();
}

function validateUserName(value) {
  const name = normalizeUserName(value);
  if (!name) return "User Name is required.";
  if (name.length > 120) return "User Name cannot exceed 120 characters.";
  if (!/^[A-Za-z0-9._@\\-]+$/.test(name)) {
    return "Use only letters, numbers, dot, underscore, hyphen, @ or backslash.";
  }
  return "";
}

try {
  input.value = localStorage.getItem(USER_NAME_STORAGE_KEY) || "";
} catch {}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const userName = normalizeUserName(input.value);
  const validationError = validateUserName(userName);
  if (validationError) {
    error.textContent = validationError;
    input.focus();
    return;
  }
  try {
    localStorage.setItem(USER_NAME_STORAGE_KEY, userName);
  } catch {
    error.textContent = "Unable to save the user name in this browser.";
    return;
  }
  window.location.assign("/portal.html");
});

input.addEventListener("input", () => { error.textContent = ""; });

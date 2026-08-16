const MAX_HOSTNAMES = 20;
const SNAPSHOT_MAX_HOSTNAMES = 5;
const HEALTH_MAX_HOSTNAMES = 1;
const FIXED_TIME_ZONE = "W. Europe Standard Time";
const IANA_TIME_ZONE = "Europe/Amsterdam";
const MINIMUM_LEAD_MINUTES = 45;
const MAXIMUM_DURATION_HOURS = 24;

const form = document.getElementById("suppressionForm");
const hostnamesInput = document.getElementById("hostnames");
const hostnameCount = document.getElementById("hostnameCount");
const validationMessage = document.getElementById("validationMessage");
const submitButton = document.getElementById("submitButton");
const clearButton = document.getElementById("clearButton");
const resultArea = document.getElementById("resultArea");
const authenticatedUserName = document.getElementById("authenticatedUserName");
const authenticatedProvider = document.getElementById("authenticatedProvider");
const identityStatus = document.getElementById("identityStatus");

const suppressionTabButton =
  document.getElementById("suppressionTabButton");
const snapshotTabButton =
  document.getElementById("snapshotTabButton");
const suppressionPanel =
  document.getElementById("suppressionPanel");
const snapshotPanel =
  document.getElementById("snapshotPanel");

const snapshotForm = document.getElementById("snapshotForm");
const snapshotHostnamesInput =
  document.getElementById("snapshotHostnames");
const snapshotHostnameCount =
  document.getElementById("snapshotHostnameCount");
const snapshotValidationMessage =
  document.getElementById("snapshotValidationMessage");
const snapshotSubmitButton =
  document.getElementById("snapshotSubmitButton");
const snapshotClearButton =
  document.getElementById("snapshotClearButton");
const snapshotResultArea =
  document.getElementById("snapshotResultArea");
const snapshotRetentionDays =
  document.getElementById("snapshotRetentionDays");
const snapshotExpiryDate =
  document.getElementById("snapshotExpiryDate");
const snapshotHistoryRefreshButton =
  document.getElementById("snapshotHistoryRefreshButton");
const snapshotHistoryMessage =
  document.getElementById("snapshotHistoryMessage");
const snapshotHistoryTableArea =
  document.getElementById("snapshotHistoryTableArea");

const backupTabButton =
  document.getElementById("backupTabButton");
const backupPanel =
  document.getElementById("backupPanel");
const backupForm =
  document.getElementById("backupForm");
const backupHostnamesInput =
  document.getElementById("backupHostnames");
const backupHostnameCount =
  document.getElementById("backupHostnameCount");
const backupCheckButton =
  document.getElementById("backupCheckButton");
const backupPrecheckArea =
  document.getElementById("backupPrecheckArea");
const backupActionFields =
  document.getElementById("backupActionFields");
const backupValidationMessage =
  document.getElementById("backupValidationMessage");
const backupSubmitButton =
  document.getElementById("backupSubmitButton");
const backupClearButton =
  document.getElementById("backupClearButton");
const backupResultArea =
  document.getElementById("backupResultArea");
const backupHistoryRefreshButton =
  document.getElementById("backupHistoryRefreshButton");
const backupHistoryMessage =
  document.getElementById("backupHistoryMessage");
const backupHistoryTableArea =
  document.getElementById("backupHistoryTableArea");

const healthTabButton =
  document.getElementById("healthTabButton");
const healthPanel =
  document.getElementById("healthPanel");
const healthForm =
  document.getElementById("healthForm");
const healthHostnamesInput =
  document.getElementById("healthHostnames");
const healthHostnameCount =
  document.getElementById("healthHostnameCount");
const healthPeriodMinutes =
  document.getElementById("healthPeriodMinutes");
const healthValidationMessage =
  document.getElementById("healthValidationMessage");
const healthSubmitButton =
  document.getElementById("healthSubmitButton");
const healthClearButton =
  document.getElementById("healthClearButton");
const healthResultArea =
  document.getElementById("healthResultArea");


const SNAPSHOT_STATUS_POLL_INTERVAL_MS = 5000;
const SNAPSHOT_STATUS_MAX_POLLS = 360;

let snapshotStatusPollTimer = null;
let snapshotStatusPollCount = 0;
let currentSnapshotRequestId = null;

const BACKUP_MAX_HOSTNAMES = 5;
const BACKUP_STATUS_POLL_INTERVAL_MS = 10000;
const BACKUP_STATUS_MAX_POLLS = 2160;

let backupStatusPollTimer = null;
let backupStatusPollCount = 0;
let currentBackupRequestId = null;
let backupPrecheckFingerprint = "";
let backupPrecheckPassed = false;

const HEALTH_STATUS_POLL_INTERVAL_MS = 5000;
const HEALTH_STATUS_MAX_POLLS = 120;

let healthStatusPollTimer = null;
let healthStatusPollCount = 0;
let currentHealthRequestId = null;

let manualRequester = null;



function activateOperationTab(tabName) {
  const tabMap = {
    suppression: {
      button: suppressionTabButton,
      panel: suppressionPanel
    },
    snapshot: {
      button: snapshotTabButton,
      panel: snapshotPanel
    },
    backup: {
      button: backupTabButton,
      panel: backupPanel
    },
    health: {
      button: healthTabButton,
      panel: healthPanel
    }
  };

  const selected =
    tabMap[tabName]
      ? tabName
      : "suppression";

  for (
    const [name, config]
    of Object.entries(tabMap)
  ) {
    const isActive =
      name === selected;

    config.panel.hidden =
      !isActive;

    config.button
      .classList
      .toggle(
        "active",
        isActive
      );

    config.button
      .setAttribute(
        "aria-selected",
        String(isActive)
      );
  }

  history.replaceState(
    null,
    "",
    `#${selected}`
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseHostnames(rawValue) {
  const values = rawValue
    .split(/[\n,;]+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => value.toUpperCase());

  return [...new Set(values)];
}

function getCentralEuropeanParts(date) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: IANA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });

  const values = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second)
  };
}

function getCentralEuropeanOffsetMilliseconds(date) {
  const parts = getCentralEuropeanParts(date);

  const representedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  return representedAsUtc - date.getTime();
}

function parseCentralEuropeanDateTime(value) {
  const match = String(value || "").match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
  );

  if (!match) return null;

  const [, year, month, day, hour, minute, second = "0"] = match;

  const expected = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second)
  };

  const localFieldsAsUtc = Date.UTC(
    expected.year,
    expected.month - 1,
    expected.day,
    expected.hour,
    expected.minute,
    expected.second
  );

  let utcMilliseconds = localFieldsAsUtc;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const offset = getCentralEuropeanOffsetMilliseconds(
      new Date(utcMilliseconds)
    );

    const adjusted = localFieldsAsUtc - offset;

    if (Math.abs(adjusted - utcMilliseconds) < 1000) {
      utcMilliseconds = adjusted;
      break;
    }

    utcMilliseconds = adjusted;
  }

  const actual = getCentralEuropeanParts(
    new Date(utcMilliseconds)
  );

  const isValid =
    actual.year === expected.year &&
    actual.month === expected.month &&
    actual.day === expected.day &&
    actual.hour === expected.hour &&
    actual.minute === expected.minute &&
    actual.second === expected.second;

  return isValid ? utcMilliseconds : null;
}

function updateHostnameCount() {
  const count = parseHostnames(hostnamesInput.value).length;

  hostnameCount.textContent = `${count} / ${MAX_HOSTNAMES}`;
  hostnameCount.classList.toggle("over-limit", count > MAX_HOSTNAMES);
}

const USER_NAME_STORAGE_KEY = "vmOperationsRequesterUserName";

function getManualRequesterUserName() {
  try {
    return String(localStorage.getItem(USER_NAME_STORAGE_KEY) || "").trim();
  } catch {
    return "";
  }
}

async function portalFetch(input, init = {}) {
  const userName = getManualRequesterUserName();
  if (!userName) {
    window.location.assign("/");
    throw new Error("Requester user name is required.");
  }

  const headers = new Headers(init.headers || {});
  headers.set("X-Requester-User-Name", userName);
  return window.fetch(input, { ...init, headers });
}

async function loadManualRequester() {
  const userName = getManualRequesterUserName();
  if (!userName) {
    window.location.assign("/");
    return;
  }

  manualRequester = {
    userDetails: userName,
    userId: userName.toLowerCase(),
    identityProvider: "manual"
  };

  authenticatedUserName.textContent = userName;
  authenticatedProvider.textContent = "Manual user name";
  identityStatus.textContent = "Ready";
  identityStatus.classList.remove("error");
  identityStatus.classList.add("verified");

  submitButton.disabled = false;
  submitButton.textContent = "Submit suppression request";
  snapshotSubmitButton.disabled = false;
  snapshotSubmitButton.textContent = "Create VM snapshots";
  backupCheckButton.disabled = false;
  backupCheckButton.textContent = "Check Backup Status";
  backupSubmitButton.disabled = true;
  backupSubmitButton.textContent = "Check backup status first";
  healthSubmitButton.disabled = false;
  healthSubmitButton.textContent = "Run VM health diagnostic";
}

function validateForm(payload) {
  if (!manualRequester) {
    return "Your requester user name is not available. Return to the start page and enter it again.";
  }

  if (payload.hostnames.length < 1) {
    return "Enter at least one hostname.";
  }

  if (payload.hostnames.length > MAX_HOSTNAMES) {
    return `A maximum of ${MAX_HOSTNAMES} unique hostnames is allowed.`;
  }

  const hostnamePattern = /^[A-Z0-9._-]{1,253}$/;
  const invalidHostname = payload.hostnames.find(
    (hostname) => !hostnamePattern.test(hostname)
  );

  if (invalidHostname) {
    return `Invalid hostname: ${invalidHostname}.`;
  }

  if (!payload.startDateTime || !payload.endDateTime) {
    return "Enter the start and end date/time.";
  }

  const startMilliseconds = parseCentralEuropeanDateTime(payload.startDateTime);
  const endMilliseconds = parseCentralEuropeanDateTime(payload.endDateTime);

  if (startMilliseconds === null || endMilliseconds === null) {
    return "Enter valid start and end dates in Central European Time.";
  }

  if (payload.timeZone !== FIXED_TIME_ZONE) {
    return "Only Central European Time is allowed.";
  }

  if (endMilliseconds <= startMilliseconds) {
    return "End date/time must be later than start date/time.";
  }

  const minimumStart =
    Date.now() + MINIMUM_LEAD_MINUTES * 60 * 1000;

  if (startMilliseconds < minimumStart) {
    return `Start time must be at least ${MINIMUM_LEAD_MINUTES} minutes in the future.`;
  }

  const durationMilliseconds = endMilliseconds - startMilliseconds;

  if (
    durationMilliseconds >
    MAXIMUM_DURATION_HOURS * 60 * 60 * 1000
  ) {
    return `The suppression window cannot exceed ${MAXIMUM_DURATION_HOURS} hours.`;
  }

  if (!payload.changeNumber) {
    return "Enter the change or incident number.";
  }

  if (!payload.reason) {
    return "Enter the reason for suppression.";
  }

  return "";
}


const ALLOWED_SNAPSHOT_RETENTION_DAYS =
  new Set([1, 3, 7, 14]);

function calculateSnapshotExpiryUtc(retentionDays) {
  const days = Number(retentionDays);

  if (!ALLOWED_SNAPSHOT_RETENTION_DAYS.has(days)) {
    return "";
  }

  return new Date(
    Date.now() + days * 24 * 60 * 60 * 1000
  ).toISOString();
}

function formatSnapshotExpiryForDisplay(expiresUtc) {
  if (!expiresUtc) return "";

  const date = new Date(expiresUtc);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: IANA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
    hourCycle: "h23"
  }).format(date);
}

function updateSnapshotExpiryPreview() {
  const expiresUtc = calculateSnapshotExpiryUtc(
    snapshotRetentionDays.value
  );

  snapshotExpiryDate.value =
    formatSnapshotExpiryForDisplay(expiresUtc);
}

function updateSnapshotHostnameCount() {
  const count =
    parseHostnames(snapshotHostnamesInput.value).length;

  snapshotHostnameCount.textContent =
    `${count} / ${SNAPSHOT_MAX_HOSTNAMES}`;

  snapshotHostnameCount.classList.toggle(
    "over-limit",
    count > SNAPSHOT_MAX_HOSTNAMES
  );
}

function validateSnapshotForm(payload) {
  if (!manualRequester) {
    return "Your requester user name is not available. Return to the start page and enter it again.";
  }

  if (payload.hostnames.length < 1) {
    return "Enter at least one hostname.";
  }

  if (payload.hostnames.length > SNAPSHOT_MAX_HOSTNAMES) {
    return `A maximum of ${SNAPSHOT_MAX_HOSTNAMES} unique hostnames is allowed per snapshot request.`;
  }

  const hostnamePattern = /^[A-Z0-9._-]{1,253}$/;
  const invalidHostname = payload.hostnames.find(
    (hostname) => !hostnamePattern.test(hostname)
  );

  if (invalidHostname) {
    return `Invalid hostname: ${invalidHostname}.`;
  }

  if (!["OSOnly", "AllDisks"].includes(payload.snapshotScope)) {
    return "Select a valid snapshot scope.";
  }

  if (
    !ALLOWED_SNAPSHOT_RETENTION_DAYS.has(
      Number(payload.retentionDays)
    )
  ) {
    return "Select a valid snapshot retention period.";
  }

  const changeNumberPattern = /^[A-Za-z0-9._-]{1,40}$/;

  if (!changeNumberPattern.test(payload.changeNumber)) {
    return (
      "Change / incident number may contain only letters, numbers, " +
      "full stops, underscores and hyphens."
    );
  }

  if (!payload.reason) {
    return "Enter the reason for the snapshot request.";
  }

  return "";
}

function stopSnapshotStatusPolling(clearStoredRequest = false) {
  if (snapshotStatusPollTimer) {
    clearTimeout(snapshotStatusPollTimer);
    snapshotStatusPollTimer = null;
  }

  snapshotStatusPollCount = 0;

  if (clearStoredRequest) {
    currentSnapshotRequestId = null;

    try {
      sessionStorage.removeItem(
        "activeSnapshotRequestId"
      );
    } catch {
      // Continue without browser session storage.
    }
  }
}

function snapshotStatusIsTerminal(status) {
  return [
    "Completed",
    "PartiallyCompleted",
    "Failed"
  ].includes(status);
}

function formatStatusDetails(details) {
  if (details === null || details === undefined) {
    return "";
  }

  if (typeof details === "string") {
    return details;
  }

  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
}

function buildSnapshotStatusTable(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return "";
  }

  const rows = items
    .map((item) => {
      const diskLabel =
        item.diskType === "Data" &&
        item.lun !== undefined &&
        item.lun !== null
          ? `Data (LUN ${item.lun})`
          : item.diskType || "VM";

      return `
        <tr>
          <td>${escapeHtml(item.hostname || "")}</td>
          <td>${escapeHtml(diskLabel)}</td>
          <td>${escapeHtml(item.sourceDiskName || "")}</td>
          <td>${escapeHtml(item.snapshotName || "")}</td>
          <td>
            <span class="badge ${
              item.status === "Created"
                ? "badge-success"
                : "badge-error"
            }">
              ${escapeHtml(item.status || "Unknown")}
            </span>
          </td>
          <td>${escapeHtml(
            item.message ||
            item.reason ||
            formatStatusDetails(item.details) ||
            ""
          )}</td>
        </tr>`;
    })
    .join("");

  return `
    <h3>Snapshot results</h3>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Hostname</th>
            <th>Disk</th>
            <th>Source disk</th>
            <th>Snapshot</th>
            <th>Status</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function renderSnapshotStatus(result) {
  const status = result.status || "Submitted";

  let bannerClass = "status-warning";
  let heading = "Snapshot creation in progress";

  if (status === "Completed") {
    bannerClass = "status-success";
    heading = "VM snapshots created successfully";
  } else if (status === "PartiallyCompleted") {
    bannerClass = "status-warning";
    heading = "Snapshot request partially completed";
  } else if (status === "Failed") {
    bannerClass = "status-error";
    heading = "Snapshot request failed";
  } else if (status === "RateLimited") {
    bannerClass = "status-error";
    heading = "Snapshot request limit reached";
  } else if (status === "Submitted") {
    heading = "Snapshot request submitted";
  }

  snapshotResultArea.hidden = false;
  snapshotResultArea.innerHTML = `
    <div class="status-banner ${bannerClass}">
      <h2>${escapeHtml(heading)}</h2>
      <div class="copy-row">
        <strong>Request ID:</strong>
        <code>${escapeHtml(
          result.requestId || "Not available"
        )}</code>
        ${
          result.requestId
            ? `
              <button id="copySnapshotRequestId"
                type="button" class="secondary">
                Copy Request ID
              </button>`
            : ""
        }
      </div>
      <p>${escapeHtml(
        result.message ||
        "The request is being processed."
      )}</p>
    </div>

    ${
      status !== "RateLimited"
        ? `<div class="summary snapshot-summary">
      <div class="summary-item">
        <strong>${escapeHtml(
          result.submittedCount ?? 0
        )}</strong>
        <span>VMs submitted</span>
      </div>
      <div class="summary-item">
        <strong>${escapeHtml(
          result.successCount ?? 0
        )}</strong>
        <span>Snapshots created</span>
      </div>
      <div class="summary-item">
        <strong>${escapeHtml(
          result.failureCount ?? 0
        )}</strong>
        <span>Failures</span>
      </div>
      <div class="summary-item">
        <strong>${escapeHtml(
          result.retentionDays
            ? `${result.retentionDays} day${
                Number(result.retentionDays) === 1 ? "" : "s"
              }`
            : "Not available"
        )}</strong>
        <span>Retention</span>
      </div>
      <div class="summary-item">
        <strong>${escapeHtml(
          result.expiresUtc
            ? formatSnapshotExpiryForDisplay(
                result.expiresUtc
              )
            : "Not available"
        )}</strong>
        <span>Expires</span>
      </div>
    </div>`
        : ""
    }

    ${
      !snapshotStatusIsTerminal(status)
        ? `
          <div class="information-note">
            The portal is checking the Snapshot Logic App result automatically.
            Keep this tab open for live confirmation.
          </div>`
        : ""
    }

    ${buildSnapshotStatusTable(result.results)}
  `;

  document
    .getElementById("copySnapshotRequestId")
    ?.addEventListener("click", async () => {
      if (!result.requestId) return;

      await navigator.clipboard.writeText(
        result.requestId
      );

      document.getElementById(
        "copySnapshotRequestId"
      ).textContent = "Copied";
    });
}

async function pollSnapshotStatus(requestId) {
  if (
    !requestId ||
    requestId !== currentSnapshotRequestId
  ) {
    return;
  }

  snapshotStatusPollCount += 1;

  try {
    const response = await portalFetch(
      `/api/getSnapshotStatus?requestId=${encodeURIComponent(
        requestId
      )}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json"
        },
        cache: "no-store"
      }
    );

    if (response.status === 401) {
      window.location.assign("/");
      return;
    }

    const result = await response.json();

    if (response.ok) {
      renderSnapshotStatus(result);

      if (snapshotStatusIsTerminal(result.status)) {
        stopSnapshotStatusPolling(true);

        loadMySnapshotRequests(
          false
        );

        return;
      }
    } else if (response.status !== 404) {
      console.error(
        "Snapshot status polling failed.",
        result
      );
    }
  } catch (error) {
    console.error(
      "Snapshot status polling error.",
      error
    );
  }

  if (
    snapshotStatusPollCount >=
    SNAPSHOT_STATUS_MAX_POLLS
  ) {
    snapshotValidationMessage.textContent =
      "Snapshot status polling timed out after 30 minutes. " +
      "Use the Request ID to check the Snapshot Logic App run history.";
    stopSnapshotStatusPolling(false);
    return;
  }

  snapshotStatusPollTimer = window.setTimeout(
    () => pollSnapshotStatus(requestId),
    SNAPSHOT_STATUS_POLL_INTERVAL_MS
  );
}

function startSnapshotStatusPolling(requestId) {
  stopSnapshotStatusPolling(false);

  currentSnapshotRequestId = requestId;
  snapshotStatusPollCount = 0;

  try {
    sessionStorage.setItem(
      "activeSnapshotRequestId",
      requestId
    );
  } catch {
    // Continue without browser session storage.
  }

  pollSnapshotStatus(requestId);
}

function showSnapshotResult(result, httpStatus) {
  const accepted =
    httpStatus === 202 || result.status === "Accepted";

  if (!accepted) {
    if (result.status === "RateLimited") {
      const retryText = result.retryAfterUtc
        ? ` Next request allowed after ${formatSnapshotExpiryForDisplay(
            result.retryAfterUtc
          )}.`
        : "";

      renderSnapshotStatus({
        ...result,
        status: "RateLimited",
        message: `${result.message || "Snapshot request limit reached."}${retryText}`
      });
    } else {
      renderSnapshotStatus({
        ...result,
        status: "Failed"
      });
    }

    return;
  }

  renderSnapshotStatus({
    ...result,
    status: "Submitted",
    successCount: 0,
    failureCount: 0,
    results: []
  });

  startSnapshotStatusPolling(result.requestId);

  window.setTimeout(
    () =>
      loadMySnapshotRequests(
        false
      ),
    750
  );
}


function formatBackupDateTime(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone: IANA_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
      hourCycle: "h23"
    }
  ).format(date);
}

function getSnapshotHistoryBadgeClass(
  status
) {
  if (status === "Completed") {
    return "badge-success";
  }

  if (
    status ===
      "PartiallyCompleted" ||
    status ===
      "CompletedWithWarnings" ||
    status ===
      "Submitted" ||
    status ===
      "Processing" ||
    status ===
      "Accepted"
  ) {
    return "badge-warning";
  }

  return "badge-error";
}

function renderMySnapshotRequests(
  requests
) {
  if (
    !Array.isArray(requests) ||
    requests.length === 0
  ) {
    snapshotHistoryTableArea.innerHTML = `
      <div class="backup-history-empty">
        No server-side VM Snapshot request history is available yet.
        New snapshot requests submitted after this update will appear here automatically.
      </div>`;

    return;
  }

  const rows =
    requests.map((item) => {
      const hostnames =
        Array.isArray(
          item.hostnames
        )
          ? item.hostnames
              .filter(Boolean)
          : [];

      const status =
        item.status ||
        "Unknown";

      const scopeLabel =
        item.snapshotScopeLabel ||
        (item.snapshotScope === "AllDisks"
          ? "OS + data disks"
          : item.snapshotScope === "OSOnly"
            ? "OS disk only"
            : "Not available");

      const retentionText =
        Number.isFinite(
          Number(item.retentionDays)
        ) &&
        Number(item.retentionDays) > 0
          ? `${Number(item.retentionDays)} day${Number(item.retentionDays) === 1 ? "" : "s"}`
          : "Not available";

      const completionText =
        item.completedUtc
          ? formatBackupDateTime(
              item.completedUtc
            )
          : "-";

      const snapshotCount =
        item.snapshotCount ??
        item.successCount ??
        0;

      const failureCount =
        item.failureCount ??
        0;

      return `
        <tr>
          <td>
            <code>${escapeHtml(
              item.requestId || ""
            )}</code>
          </td>
          <td class="backup-history-vms">
            ${escapeHtml(
              hostnames.length
                ? hostnames.join(", ")
                : "Not available"
            )}
          </td>
          <td>${escapeHtml(
            scopeLabel
          )}</td>
          <td>${escapeHtml(
            retentionText
          )}</td>
          <td>${escapeHtml(
            item.changeNumber ||
            "Not available"
          )}</td>
          <td>${escapeHtml(
            formatBackupDateTime(
              item.submittedUtc
            )
          )}</td>
          <td>
            <span class="badge ${getSnapshotHistoryBadgeClass(
              status
            )}">
              ${escapeHtml(
                status
              )}
            </span>
          </td>
          <td>${escapeHtml(
            snapshotCount
          )}</td>
          <td>${escapeHtml(
            failureCount
          )}</td>
          <td>${escapeHtml(
            completionText
          )}</td>
          <td class="backup-history-actions">
            <button
              type="button"
              class="secondary snapshot-history-view-button"
              data-request-id="${escapeHtml(
                item.requestId || ""
              )}">
              ${
                snapshotStatusIsTerminal(
                  status
                )
                  ? "View"
                  : "View / Resume"
              }
            </button>
          </td>
        </tr>`;
    }).join("");

  snapshotHistoryTableArea.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Request ID</th>
            <th>VMs</th>
            <th>Scope</th>
            <th>Retention</th>
            <th>Change / Incident</th>
            <th>Submitted</th>
            <th>Status</th>
            <th>Snapshots</th>
            <th>Failures</th>
            <th>Completed</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  snapshotHistoryTableArea
    .querySelectorAll(
      ".snapshot-history-view-button"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const requestId =
            button.dataset
              .requestId;

          if (requestId) {
            openSnapshotRequestFromHistory(
              requestId
            );
          }
        }
      );
    });
}

async function loadMySnapshotRequests(
  showLoading = true
) {
  if (!manualRequester) {
    return;
  }

  if (showLoading) {
    snapshotHistoryMessage.textContent =
      "Loading your recent VM Snapshot requests…";
  }

  snapshotHistoryRefreshButton.disabled =
    true;

  try {
    const response =
      await portalFetch(
        "/api/getMySnapshotRequests?limit=5",
        {
          method: "GET",
          headers: {
            Accept:
              "application/json"
          },
          cache: "no-store"
        }
      );

    if (response.status === 401) {
      window.location.assign("/");
      return;
    }

    const result =
      await response.json();

    if (!response.ok) {
      snapshotHistoryMessage.innerHTML = `
        <span class="backup-history-error">
          ${escapeHtml(
            result.message ||
            "My Snapshot Requests could not be loaded."
          )}
        </span>`;

      return;
    }

    snapshotHistoryMessage.textContent =
      `Showing ${result.count ?? 0} recent request${result.count === 1 ? "" : "s"}.`;

    renderMySnapshotRequests(
      result.requests
    );
  } catch (error) {
    snapshotHistoryMessage.innerHTML = `
      <span class="backup-history-error">
        ${escapeHtml(
          `My Snapshot Requests could not be loaded: ${error.message}`
        )}
      </span>`;
  } finally {
    snapshotHistoryRefreshButton.disabled =
      false;
  }
}

async function openSnapshotRequestFromHistory(
  requestId
) {
  snapshotHistoryMessage.textContent =
    "Loading selected VM Snapshot request…";

  try {
    const response =
      await portalFetch(
        `/api/getSnapshotStatus?requestId=${encodeURIComponent(
          requestId
        )}`,
        {
          method: "GET",
          headers: {
            Accept:
              "application/json"
          },
          cache: "no-store"
        }
      );

    if (response.status === 401) {
      window.location.assign("/");
      return;
    }

    const result =
      await response.json();

    if (!response.ok) {
      snapshotHistoryMessage.innerHTML = `
        <span class="backup-history-error">
          ${escapeHtml(
            result.message ||
            "The selected snapshot request could not be loaded."
          )}
        </span>`;
      return;
    }

    renderSnapshotStatus(
      result
    );

    snapshotResultArea.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    if (
      !snapshotStatusIsTerminal(
        result.status
      )
    ) {
      startSnapshotStatusPolling(
        requestId
      );
    }

    snapshotHistoryMessage.textContent =
      "Selected request loaded.";
  } catch (error) {
    snapshotHistoryMessage.innerHTML = `
      <span class="backup-history-error">
        ${escapeHtml(
          `The selected snapshot request could not be loaded: ${error.message}`
        )}
      </span>`;
  }
}


function updateBackupHostnameCount() {
  const count =
    parseHostnames(
      backupHostnamesInput.value
    ).length;

  backupHostnameCount.textContent =
    `${count} / ${BACKUP_MAX_HOSTNAMES}`;

  backupHostnameCount.classList.toggle(
    "over-limit",
    count > BACKUP_MAX_HOSTNAMES
  );
}


function getBackupHostnamesFingerprint() {
  return parseHostnames(
    backupHostnamesInput.value
  )
    .slice()
    .sort()
    .join("|");
}

function resetBackupPrecheck(
  clearDisplay = true
) {
  backupPrecheckFingerprint = "";
  backupPrecheckPassed = false;

  backupActionFields.disabled = true;
  backupSubmitButton.disabled = true;
  backupSubmitButton.textContent =
    "Check backup status first";

  if (clearDisplay) {
    backupPrecheckArea.hidden = true;
    backupPrecheckArea.innerHTML = "";
  }
}

function getJobDurationMinutes(job) {
  const properties =
    job?.properties || job || {};

  const start = Date.parse(
    properties.startTime || ""
  );
  const end = Date.parse(
    properties.endTime || ""
  );

  if (
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    end >= start
  ) {
    return (end - start) / 60000;
  }

  return null;
}

function getEstimatedBackupMinutes(item) {
  const durations =
    (Array.isArray(item.recentCompletedJobs)
      ? item.recentCompletedJobs
      : [])
      .map(getJobDurationMinutes)
      .filter(
        (value) =>
          Number.isFinite(value) &&
          value > 0
      )
      .slice(0, 5)
      .sort((a, b) => a - b);

  if (durations.length === 0) {
    return null;
  }

  const middle =
    Math.floor(durations.length / 2);

  return durations.length % 2 === 0
    ? (
        durations[middle - 1] +
        durations[middle]
      ) / 2
    : durations[middle];
}

function formatApproxDuration(item) {
  const minutes =
    getEstimatedBackupMinutes(item);

  if (!Number.isFinite(minutes)) {
    return `
      <span>Not enough recent history</span>
      <span class="estimate-note">
        Actual backup duration depends on changed data,
        disk count and Azure Backup processing.
      </span>`;
  }

  const rounded =
    Math.max(1, Math.round(minutes));

  const historyCount =
    Math.min(
      5,
      Array.isArray(item.recentCompletedJobs)
        ? item.recentCompletedJobs.length
        : 0
    );

  return `
    <strong>~${escapeHtml(rounded)} min</strong>
    <span class="estimate-note">
      Median of ${escapeHtml(historyCount)} recent successful backup job${historyCount === 1 ? "" : "s"}.
      Actual duration may vary.
    </span>`;
}

function renderBackupPrecheck(result) {
  const items =
    Array.isArray(result.items)
      ? result.items
      : [];

  const allEligible =
    Boolean(result.allEligible) &&
    items.length > 0;

  let bannerClass =
    allEligible
      ? "success"
      : "warning";

  let bannerTitle =
    allEligible
      ? "Backup Now is available"
      : "Backup Now is not available for all entered VMs";

  if (items.length === 0) {
    bannerClass = "error";
    bannerTitle =
      "Backup status could not be determined";
  }

  const rows =
    items.map((item) => {
      const activeJob =
        String(
          item.currentJobStatus || ""
        ).trim();

      const currentJobText =
        activeJob
          ? `
            <span class="current-job-inprogress">
              ${escapeHtml(activeJob)}
            </span>
            ${
              item.currentJobStartUtc
                ? `<span class="estimate-note">Started ${escapeHtml(
                    formatBackupDateTime(
                      item.currentJobStartUtc
                    )
                  )}</span>`
                : ""
            }`
          : "None";

      const eligibleText =
        item.backupNowAllowed
          ? '<span class="badge badge-success">Ready</span>'
          : '<span class="badge badge-warning">Blocked</span>';

      return `
        <tr>
          <td>${escapeHtml(
            item.hostname || ""
          )}</td>
          <td>${escapeHtml(
            item.subscriptionName ||
            "Not available"
          )}</td>
          <td>${escapeHtml(
            item.resourceGroup ||
            "Not available"
          )}</td>
          <td>${escapeHtml(
            item.protectionStatus ||
            "Unknown"
          )}</td>
          <td>${escapeHtml(
            item.vaultName ||
            "Not available"
          )}</td>
          <td>${escapeHtml(
            item.policyName ||
            "Not available"
          )}</td>
          <td>${escapeHtml(
            item.lastBackupStatus ||
            "Not available"
          )}</td>
          <td>${escapeHtml(
            formatBackupDateTime(
              item.lastBackupTimeUtc
            )
          )}</td>
          <td>${escapeHtml(
            formatBackupDateTime(
              item.lastSuccessfulBackupUtc
            )
          )}</td>
          <td>${currentJobText}</td>
          <td>${formatApproxDuration(
            item
          )}</td>
          <td>${eligibleText}</td>
        </tr>`;
    }).join("");

  backupPrecheckArea.hidden = false;
  backupPrecheckArea.innerHTML = `
    <div class="backup-precheck-banner ${bannerClass}">
      <h3>${escapeHtml(
        bannerTitle
      )}</h3>
      <p>${escapeHtml(
        result.message ||
        (
          allEligible
            ? "All entered VMs are protected and no active backup job was found."
            : "Review the VM backup information below before continuing."
        )
      )}</p>
    </div>

    ${
      items.length
        ? `
          <div class="table-wrap backup-precheck-table">
            <table>
              <thead>
                <tr>
                  <th>Hostname</th>
                  <th>Subscription</th>
                  <th>Resource Group</th>
                  <th>Protection</th>
                  <th>Vault</th>
                  <th>Policy</th>
                  <th>Last backup status</th>
                  <th>Last backup time</th>
                  <th>Last successful backup</th>
                  <th>Current backup job</th>
                  <th>Approx. duration</th>
                  <th>Backup Now</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`
        : ""
    }
  `;

  backupPrecheckPassed =
    allEligible;

  backupPrecheckFingerprint =
    allEligible
      ? getBackupHostnamesFingerprint()
      : "";

  backupActionFields.disabled =
    !allEligible;

  backupSubmitButton.disabled =
    !allEligible;

  backupSubmitButton.textContent =
    allEligible
      ? "Trigger Backup Now"
      : "Backup Now unavailable";
}

async function checkBackupStatusBeforeSubmit() {
  backupValidationMessage.textContent = "";
  resetBackupPrecheck(true);

  const hostnames =
    parseHostnames(
      backupHostnamesInput.value
    );

  if (hostnames.length < 1) {
    backupValidationMessage.textContent =
      "Enter at least one VM hostname.";
    return;
  }

  if (
    hostnames.length >
    BACKUP_MAX_HOSTNAMES
  ) {
    backupValidationMessage.textContent =
      `A maximum of ${BACKUP_MAX_HOSTNAMES} unique hostnames is allowed.`;
    return;
  }

  backupCheckButton.disabled = true;
  backupCheckButton.textContent =
    "Checking Azure Backup…";

  try {
    const response =
      await portalFetch(
        "/api/checkBackupStatus",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Accept:
              "application/json"
          },
          body: JSON.stringify({
            hostnames
          })
        }
      );

    const text =
      await response.text();

    let result;

    try {
      result =
        text
          ? JSON.parse(text)
          : {};
    } catch {
      result = {
        success: false,
        message:
          text ||
          "The status API returned an invalid response."
      };
    }

    if (response.status === 401) {
      window.location.assign("/");
      return;
    }

    if (!response.ok) {
      backupPrecheckArea.hidden = false;
      backupPrecheckArea.innerHTML = `
        <div class="backup-precheck-banner error">
          <h3>Backup status check failed</h3>
          <p>${escapeHtml(
            result.message ||
            "Unable to check Azure Backup status."
          )}</p>
        </div>`;
      return;
    }

    renderBackupPrecheck(result);
  } catch (error) {
    backupPrecheckArea.hidden = false;
    backupPrecheckArea.innerHTML = `
      <div class="backup-precheck-banner error">
        <h3>Backup status check failed</h3>
        <p>${escapeHtml(
          `Unable to check Azure Backup status: ${error.message}`
        )}</p>
      </div>`;
  } finally {
    backupCheckButton.disabled =
      !manualRequester;

    backupCheckButton.textContent =
      manualRequester
        ? "Check Backup Status"
        : "User name required";
  }
}

function validateBackupForm(payload) {
  if (!manualRequester) {
    return "Your requester user name is not available. Return to the start page and enter it again.";
  }

  if (
    !backupPrecheckPassed ||
    backupPrecheckFingerprint !==
      getBackupHostnamesFingerprint()
  ) {
    return "Check the current Azure Backup status before triggering Backup Now.";
  }

  if (payload.hostnames.length < 1) {
    return "Enter at least one hostname.";
  }

  if (
    payload.hostnames.length >
    BACKUP_MAX_HOSTNAMES
  ) {
    return `A maximum of ${BACKUP_MAX_HOSTNAMES} unique hostnames is allowed per backup request.`;
  }

  const hostnamePattern =
    /^[A-Z0-9._-]{1,253}$/;

  const invalidHostname =
    payload.hostnames.find(
      (hostname) =>
        !hostnamePattern.test(
          hostname
        )
    );

  if (invalidHostname) {
    return `Invalid hostname: ${invalidHostname}.`;
  }

  const changeNumberPattern =
    /^[A-Za-z0-9._-]{1,40}$/;

  if (
    !changeNumberPattern.test(
      payload.changeNumber
    )
  ) {
    return (
      "Change / incident number may contain only letters, numbers, " +
      "full stops, underscores and hyphens."
    );
  }

  if (!payload.reason) {
    return "Enter the reason for the backup request.";
  }

  return "";
}

function stopBackupStatusPolling(
  clearStoredRequest = false
) {
  if (backupStatusPollTimer) {
    clearTimeout(
      backupStatusPollTimer
    );
    backupStatusPollTimer = null;
  }

  backupStatusPollCount = 0;

  if (clearStoredRequest) {
    currentBackupRequestId = null;

    try {
      localStorage.removeItem(
        "activeBackupRequestId"
      );
    } catch {
      // Continue without browser storage.
    }
  }
}

function backupStatusIsTerminal(
  status
) {
  return [
    "Completed",
    "PartiallyCompleted",
    "Failed"
  ].includes(status);
}

function buildBackupStatusTable(items) {
  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return "";
  }

  const rows = items
    .map((item) => {
      const successfulDate =
        item.lastSuccessfulBackupUtc ||
        item.previousLastSuccessfulBackupUtc;

      const backupStatus =
        item.lastBackupStatus ||
        item.backupStatus ||
        item.status ||
        "Unknown";

      const rowClass =
        item.status === "Completed"
          ? "badge-success"
          : ["NotProtected", "CompletedWithWarnings"].includes(item.status)
            ? "badge-warning"
            : "badge-error";

      return `
        <tr>
          <td>${escapeHtml(
            item.hostname || ""
          )}</td>
          <td>${escapeHtml(
            item.protectionStatus ||
            "Unknown"
          )}</td>
          <td>${escapeHtml(
            item.vaultName ||
            "Not available"
          )}</td>
          <td>${escapeHtml(
            item.policyName ||
            "Not available"
          )}</td>
          <td>${escapeHtml(
            backupStatus
          )}</td>
          <td>${escapeHtml(
            formatBackupDateTime(
              successfulDate
            )
          )}</td>
          <td>
            <span class="badge ${rowClass}">
              ${escapeHtml(
                item.status ||
                "Unknown"
              )}
            </span>
          </td>
          <td>${escapeHtml(
            item.message ||
            formatStatusDetails(
              item.details
            ) ||
            ""
          )}</td>
        </tr>`;
    })
    .join("");

  return `
    <h3>VM backup results</h3>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Hostname</th>
            <th>Protection</th>
            <th>Vault</th>
            <th>Policy</th>
            <th>Last backup status</th>
            <th>Last successful backup</th>
            <th>Request status</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function renderBackupStatus(result) {
  const status =
    result.status || "Submitted";

  let bannerClass =
    "status-warning";
  let heading =
    "VM backup is in progress";

  if (status === "Completed") {
    bannerClass =
      "status-success";
    heading =
      "VM backup completed successfully";
  } else if (
    status ===
    "PartiallyCompleted"
  ) {
    heading =
      "VM backup request partially completed";
  } else if (
    status === "Failed"
  ) {
    bannerClass =
      "status-error";
    heading =
      "VM backup request failed";
  } else if (
    status === "RateLimited"
  ) {
    bannerClass =
      "status-error";
    heading =
      "VM backup request limit reached";
  } else if (
    status === "Submitted"
  ) {
    heading =
      "VM backup request submitted";
  }

  backupResultArea.hidden = false;

  backupResultArea.innerHTML = `
    <div class="status-banner ${bannerClass}">
      <h2>${escapeHtml(
        heading
      )}</h2>
      <div class="copy-row">
        <strong>Request ID:</strong>
        <code>${escapeHtml(
          result.requestId ||
          "Not available"
        )}</code>
        ${
          result.requestId
            ? `
              <button
                id="copyBackupRequestId"
                type="button"
                class="secondary">
                Copy Request ID
              </button>`
            : ""
        }
      </div>
      <p>${escapeHtml(
        result.message ||
        "The backup request is being processed."
      )}</p>
    </div>

    ${
      status !== "RateLimited"
        ? `
          <div class="summary backup-summary">
            <div class="summary-item">
              <strong>${escapeHtml(
                result.submittedCount ??
                0
              )}</strong>
              <span>VMs submitted</span>
            </div>

            <div class="summary-item">
              <strong>${escapeHtml(
                result.successCount ??
                result.backupCount ??
                0
              )}</strong>
              <span>Backups completed</span>
            </div>

            <div class="summary-item">
              <strong>${escapeHtml(
                result.failureCount ??
                0
              )}</strong>
              <span>Failures</span>
            </div>
          </div>`
        : ""
    }

    ${
      !backupStatusIsTerminal(
        status
      ) &&
      status !== "RateLimited"
        ? `
          <div class="information-note">
            Azure Backup is processing this request asynchronously.
            The portal checks the result automatically.
            You can keep this tab open for live confirmation.
          </div>`
        : ""
    }

    ${buildBackupStatusTable(
      result.results
    )}
  `;

  document
    .getElementById(
      "copyBackupRequestId"
    )
    ?.addEventListener(
      "click",
      async () => {
        if (!result.requestId) {
          return;
        }

        await navigator.clipboard
          .writeText(
            result.requestId
          );

        document
          .getElementById(
            "copyBackupRequestId"
          )
          .textContent =
            "Copied";
      }
    );
}


function getBackupHistoryBadgeClass(
  status
) {
  if (status === "Completed") {
    return "badge-success";
  }

  if (
    status ===
      "PartiallyCompleted" ||
    status ===
      "CompletedWithWarnings" ||
    status ===
      "Submitted" ||
    status ===
      "Processing" ||
    status ===
      "Accepted"
  ) {
    return "badge-warning";
  }

  return "badge-error";
}

function renderMyBackupRequests(
  requests
) {
  if (
    !Array.isArray(requests) ||
    requests.length === 0
  ) {
    backupHistoryTableArea.innerHTML = `
      <div class="backup-history-empty">
        No server-side VM Backup request history is available yet.
        New requests submitted after this update will appear here automatically.
      </div>`;

    return;
  }

  const rows =
    requests.map((item) => {
      const hostnames =
        Array.isArray(
          item.hostnames
        )
          ? item.hostnames
              .filter(Boolean)
          : [];

      const status =
        item.status ||
        "Unknown";

      const completionText =
        item.completedUtc
          ? formatBackupDateTime(
              item.completedUtc
            )
          : "-";

      const completedCount =
        `${item.successCount ?? 0}/${item.submittedCount ?? hostnames.length ?? 0}`;

      return `
        <tr>
          <td>
            <code>${escapeHtml(
              item.requestId || ""
            )}</code>
          </td>
          <td class="backup-history-vms">
            ${escapeHtml(
              hostnames.length
                ? hostnames.join(", ")
                : "Not available"
            )}
          </td>
          <td>${escapeHtml(
            item.changeNumber ||
            "Not available"
          )}</td>
          <td>${escapeHtml(
            formatBackupDateTime(
              item.submittedUtc
            )
          )}</td>
          <td>
            <span class="badge ${getBackupHistoryBadgeClass(
              status
            )}">
              ${escapeHtml(
                status
              )}
            </span>
          </td>
          <td>${escapeHtml(
            completedCount
          )}</td>
          <td>${escapeHtml(
            completionText
          )}</td>
          <td class="backup-history-actions">
            <button
              type="button"
              class="secondary backup-history-view-button"
              data-request-id="${escapeHtml(
                item.requestId || ""
              )}">
              ${
                backupStatusIsTerminal(
                  status
                )
                  ? "View"
                  : "View / Resume"
              }
            </button>
          </td>
        </tr>`;
    }).join("");

  backupHistoryTableArea.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Request ID</th>
            <th>VMs</th>
            <th>Change / Incident</th>
            <th>Submitted</th>
            <th>Status</th>
            <th>Completed VMs</th>
            <th>Completed</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  backupHistoryTableArea
    .querySelectorAll(
      ".backup-history-view-button"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const requestId =
            button.dataset
              .requestId;

          if (requestId) {
            openBackupRequestFromHistory(
              requestId
            );
          }
        }
      );
    });
}

async function loadMyBackupRequests(
  showLoading = true
) {
  if (!manualRequester) {
    return;
  }

  if (showLoading) {
    backupHistoryMessage.textContent =
      "Loading your recent VM Backup requests…";
  }

  backupHistoryRefreshButton.disabled =
    true;

  try {
    const response =
      await portalFetch(
        "/api/getMyBackupRequests?limit=5",
        {
          method: "GET",
          headers: {
            Accept:
              "application/json"
          },
          cache: "no-store"
        }
      );

    if (response.status === 401) {
      window.location.assign("/");
      return;
    }

    const result =
      await response.json();

    if (!response.ok) {
      backupHistoryMessage.innerHTML = `
        <span class="backup-history-error">
          ${escapeHtml(
            result.message ||
            "My Backup Requests could not be loaded."
          )}
        </span>`;

      return;
    }

    backupHistoryMessage.textContent =
      `Showing ${result.count ?? 0} recent request${result.count === 1 ? "" : "s"}.`;

    renderMyBackupRequests(
      result.requests
    );
  } catch (error) {
    backupHistoryMessage.innerHTML = `
      <span class="backup-history-error">
        ${escapeHtml(
          `My Backup Requests could not be loaded: ${error.message}`
        )}
      </span>`;
  } finally {
    backupHistoryRefreshButton.disabled =
      false;
  }
}

async function openBackupRequestFromHistory(
  requestId
) {
  backupHistoryMessage.textContent =
    "Loading selected VM Backup request…";

  try {
    const response =
      await portalFetch(
        `/api/getBackupStatus?requestId=${encodeURIComponent(
          requestId
        )}`,
        {
          method: "GET",
          headers: {
            Accept:
              "application/json"
          },
          cache: "no-store"
        }
      );

    if (response.status === 401) {
      window.location.assign("/");
      return;
    }

    const result =
      await response.json();

    if (!response.ok) {
      backupHistoryMessage.innerHTML = `
        <span class="backup-history-error">
          ${escapeHtml(
            result.message ||
            "The selected backup request could not be loaded."
          )}
        </span>`;
      return;
    }

    renderBackupStatus(
      result
    );

    backupResultArea.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    if (
      !backupStatusIsTerminal(
        result.status
      )
    ) {
      startBackupStatusPolling(
        requestId
      );
    }

    backupHistoryMessage.textContent =
      "Selected request loaded.";
  } catch (error) {
    backupHistoryMessage.innerHTML = `
      <span class="backup-history-error">
        ${escapeHtml(
          `The selected backup request could not be loaded: ${error.message}`
        )}
      </span>`;
  }
}

async function pollBackupStatus(
  requestId
) {
  if (
    !requestId ||
    requestId !==
      currentBackupRequestId
  ) {
    return;
  }

  backupStatusPollCount += 1;

  try {
    const response =
      await portalFetch(
        `/api/getBackupStatus?requestId=${encodeURIComponent(
          requestId
        )}`,
        {
          method: "GET",
          headers: {
            Accept:
              "application/json"
          },
          cache: "no-store"
        }
      );

    if (
      response.status === 401
    ) {
      window.location.assign("/");
      return;
    }

    const result =
      await response.json();

    if (response.ok) {
      renderBackupStatus(
        result
      );

      if (
        backupStatusIsTerminal(
          result.status
        )
      ) {
        stopBackupStatusPolling(
          true
        );

        loadMyBackupRequests(
          false
        );

        return;
      }
    } else if (
      response.status !== 404
    ) {
      console.error(
        "VM backup status polling failed.",
        result
      );
    }
  } catch (error) {
    console.error(
      "VM backup status polling error.",
      error
    );
  }

  if (
    backupStatusPollCount >=
    BACKUP_STATUS_MAX_POLLS
  ) {
    backupValidationMessage
      .textContent =
      "Automatic backup status monitoring stopped after 6 hours. " +
      "Azure Backup is not cancelled. Use the Request ID and Backup Logic App run history to check the operation.";

    stopBackupStatusPolling(
      false
    );
    return;
  }

  backupStatusPollTimer =
    window.setTimeout(
      () =>
        pollBackupStatus(
          requestId
        ),
      BACKUP_STATUS_POLL_INTERVAL_MS
    );
}

function startBackupStatusPolling(
  requestId
) {
  stopBackupStatusPolling(
    false
  );

  currentBackupRequestId =
    requestId;

  backupStatusPollCount = 0;

  try {
    localStorage.setItem(
      "activeBackupRequestId",
      requestId
    );
  } catch {
    // Continue without browser storage.
  }

  pollBackupStatus(
    requestId
  );
}

function showBackupResult(
  result,
  httpStatus
) {
  const accepted =
    httpStatus === 202 ||
    result.status === "Accepted";

  if (!accepted) {
    if (
      result.status ===
      "RateLimited"
    ) {
      const retryText =
        result.retryAfterUtc
          ? ` Next request allowed after ${formatBackupDateTime(
              result.retryAfterUtc
            )}.`
          : "";

      renderBackupStatus({
        ...result,
        status:
          "RateLimited",
        message:
          `${result.message || "VM backup request limit reached."}${retryText}`
      });
    } else {
      renderBackupStatus({
        ...result,
        status: "Failed"
      });
    }

    return;
  }

  renderBackupStatus({
    ...result,
    status: "Submitted",
    successCount: 0,
    failureCount: 0,
    results: []
  });

  startBackupStatusPolling(
    result.requestId
  );

  window.setTimeout(
    () =>
      loadMyBackupRequests(
        false
      ),
    750
  );
}

function buildSuccessTable(items) {
  if (!Array.isArray(items) || items.length === 0) return "";

  const rows = items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.hostname)}</td>
          <td>${escapeHtml(item.vmName)}</td>
          <td>${escapeHtml(item.subscriptionName)}</td>
          <td>${escapeHtml(item.resourceGroup)}</td>
          <td>
            <span class="badge badge-success">
              ${escapeHtml(item.status || "Created")}
            </span>
          </td>
          <td>${escapeHtml(item.ruleName)}</td>
        </tr>`
    )
    .join("");

  return `
    <h3>Successful VMs</h3>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Hostname</th>
            <th>Azure VM</th>
            <th>Subscription</th>
            <th>Resource group</th>
            <th>Status</th>
            <th>Suppression rule</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function buildFailureTable(items) {
  if (!Array.isArray(items) || items.length === 0) return "";

  const rows = items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.hostname || item.hostnameSubmitted)}</td>
          <td>
            <span class="badge badge-error">
              ${escapeHtml(item.status || "Failed")}
            </span>
          </td>
          <td>${escapeHtml(item.failureStage)}</td>
          <td>
            ${escapeHtml(
              item.message ||
              item.details?.message ||
              "Automation failed"
            )}
          </td>
        </tr>`
    )
    .join("");

  return `
    <h3>Failed VMs</h3>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Hostname</th>
            <th>Status</th>
            <th>Failure stage</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function showResult(result, httpStatus) {
  let bannerClass = "status-error";
  let heading = "Request failed";

  if (result.status === "Created") {
    bannerClass = "status-success";
    heading = "All suppression rules were created";
  } else if (result.status === "PartiallyCreated") {
    bannerClass = "status-warning";
    heading = "Request partially completed";
  }

  resultArea.hidden = false;
  resultArea.innerHTML = `
    <div class="status-banner ${bannerClass}">
      <h2>${escapeHtml(heading)}</h2>
      <div class="copy-row">
        <strong>Request ID:</strong>
        <code>${escapeHtml(result.requestId || "Not available")}</code>
        <button id="copyRequestId" type="button" class="secondary">
          Copy Request ID
        </button>
      </div>
      <p>
        ${escapeHtml(
          result.message || `The API returned HTTP ${httpStatus}.`
        )}
      </p>
    </div>

    <div class="summary">
      <div class="summary-item">
        <strong>${escapeHtml(result.submittedCount ?? 0)}</strong>
        <span>Submitted</span>
      </div>
      <div class="summary-item">
        <strong>${escapeHtml(result.uniqueCount ?? 0)}</strong>
        <span>Unique</span>
      </div>
      <div class="summary-item">
        <strong>${escapeHtml(result.successCount ?? 0)}</strong>
        <span>Successful</span>
      </div>
      <div class="summary-item">
        <strong>${escapeHtml(result.failureCount ?? 0)}</strong>
        <span>Failed</span>
      </div>
    </div>

    ${buildSuccessTable(result.successfulResults)}
    ${buildFailureTable(result.failedResults)}
  `;

  document
    .getElementById("copyRequestId")
    ?.addEventListener("click", async () => {
      if (!result.requestId) return;

      await navigator.clipboard.writeText(result.requestId);
      document.getElementById("copyRequestId").textContent = "Copied";
    });

  resultArea.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}




/* =========================================================
   VM Health Diagnostic V2 - single VM, read-only, no score
   ========================================================= */
function updateHealthHostnameCount() {
  const count = parseHostnames(healthHostnamesInput.value).length;
  healthHostnameCount.textContent = `${count} / ${HEALTH_MAX_HOSTNAMES}`;
  healthHostnameCount.classList.toggle("over-limit", count > HEALTH_MAX_HOSTNAMES);
}

function validateHealthForm(payload) {
  if (!manualRequester) return "Your requester user name is not available. Return to the start page and enter it again.";
  if (payload.hostnames.length < 1) return "Enter a VM hostname.";
  if (payload.hostnames.length > HEALTH_MAX_HOSTNAMES) return "VM Health Diagnostic accepts exactly one VM hostname per request.";

  const hostnamePattern = /^[A-Z0-9._-]{1,253}$/;
  const invalidHostname = payload.hostnames.find((hostname) => !hostnamePattern.test(hostname));
  if (invalidHostname) return `Invalid hostname: ${invalidHostname}.`;
  if (![60, 180, 360, 1440].includes(Number(payload.periodMinutes))) return "Select a valid diagnostic period.";
  return "";
}

function healthFiniteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function healthFormatNumber(value, digits = 1) {
  const number = healthFiniteNumber(value);
  return number === null ? "Unknown" : number.toFixed(digits);
}

function healthFormatPercent(value, digits = 1) {
  const number = healthFiniteNumber(value);
  return number === null ? "Unknown" : `${number.toFixed(digits)}%`;
}

function healthFormatBytes(value) {
  const number = healthFiniteNumber(value);
  if (number === null) return "Unknown";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = Math.abs(number);
  let unit = 0;
  while (n >= 1024 && unit < units.length - 1) { n /= 1024; unit += 1; }
  const signed = number < 0 ? -n : n;
  return `${signed.toFixed(unit > 1 ? 1 : 0)} ${units[unit]}`;
}

function healthFormatDateTime(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: IANA_TIME_ZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    timeZoneName: "short", hourCycle: "h23"
  }).format(date);
}

function healthAgeMinutes(value) {
  if (!value) return null;
  const t = new Date(value).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.round((Date.now() - t) / 60000));
}

function healthAgeText(value) {
  const minutes = healthAgeMinutes(value);
  if (minutes === null) return "Unknown";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m ago`;
  return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h ago`;
}

function healthBasename(resourceId) {
  const value = String(resourceId || "").replace(/\/$/, "");
  if (!value) return "Not available";
  const parts = value.split("/").filter(Boolean);
  return parts.at(-1) || value;
}

function healthResourceSegment(resourceId, segmentName) {
  const parts = String(resourceId || "").split("/").filter(Boolean);
  const index = parts.findIndex((part) => part.toLowerCase() === String(segmentName || "").toLowerCase());
  return index >= 0 && parts[index + 1] ? parts[index + 1] : "Unknown";
}

function healthParseJson(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return {}; }
}

function healthGetInstanceStatus(result, prefix) {
  const statuses = Array.isArray(result?.instanceView?.statuses) ? result.instanceView.statuses : [];
  const match = statuses.find((status) => String(status?.code || "").toLowerCase().startsWith(prefix.toLowerCase()));
  return match ? String(match.displayStatus || match.code?.split("/").at(-1) || "Unknown") : "Unknown";
}

function healthGetAgentStatus(result) {
  const statuses = Array.isArray(result?.instanceView?.vmAgent?.statuses) ? result.instanceView.vmAgent.statuses : [];
  const status = statuses[0];
  return status ? String(status.displayStatus || status.code?.split("/").at(-1) || "Unknown") : "Unknown";
}

function healthIsRunning(powerState) {
  return /running/i.test(String(powerState || ""));
}

function healthReadMetric(result, metricName) {
  const metrics = [
    ...(Array.isArray(result?.platformMetrics?.value) ? result.platformMetrics.value : []),
    ...(Array.isArray(result?.platformTransferMetrics?.value) ? result.platformTransferMetrics.value : [])
  ];
  const metric = metrics.find((item) => String(item?.name?.value || item?.name?.localizedValue || "").toLowerCase() === metricName.toLowerCase());
  if (!metric) return { available: false, average: null, maximum: null, total: null, latest: null, latestUtc: null, series: [] };

  const series = (metric.timeseries || []).map((ts) => {
    const points = Array.isArray(ts?.data) ? ts.data : [];
    const avgs = points.map((p) => healthFiniteNumber(p.average)).filter((v) => v !== null);
    const maxs = points.map((p) => healthFiniteNumber(p.maximum)).filter((v) => v !== null);
    const totals = points.map((p) => healthFiniteNumber(p.total)).filter((v) => v !== null);
    const latestPoint = [...points].reverse().find((p) => healthFiniteNumber(p.average) !== null || healthFiniteNumber(p.maximum) !== null || healthFiniteNumber(p.total) !== null);
    const dimensions = Object.fromEntries((ts?.metadatavalues || []).map((m) => [m?.name?.value || m?.name?.localizedValue || "Dimension", m?.value]));
    return {
      dimensions,
      average: avgs.length ? avgs.reduce((a,b) => a+b,0)/avgs.length : null,
      maximum: maxs.length ? Math.max(...maxs) : null,
      total: totals.length ? totals.reduce((a,b) => a+b,0) : null,
      latest: latestPoint ? (healthFiniteNumber(latestPoint.average) ?? healthFiniteNumber(latestPoint.maximum) ?? healthFiniteNumber(latestPoint.total)) : null,
      latestUtc: latestPoint?.timeStamp || null
    };
  });

  const avgs = series.map((x) => x.average).filter((x) => x !== null);
  const maxs = series.map((x) => x.maximum).filter((x) => x !== null);
  const totals = series.map((x) => x.total).filter((x) => x !== null);
  const latestCandidates = series.filter((x) => x.latestUtc).sort((a,b) => new Date(b.latestUtc) - new Date(a.latestUtc));
  return {
    available: true,
    average: avgs.length ? avgs.reduce((a,b) => a+b,0)/avgs.length : null,
    maximum: maxs.length ? Math.max(...maxs) : null,
    total: totals.length ? totals.reduce((a,b) => a+b,0) : null,
    latest: latestCandidates[0]?.latest ?? null,
    latestUtc: latestCandidates[0]?.latestUtc ?? null,
    series
  };
}

function healthReadPlatform(result) {
  return {
    cpu: healthReadMetric(result, "Percentage CPU"),
    networkIn: healthReadMetric(result, "Network In Total"),
    networkOut: healthReadMetric(result, "Network Out Total"),
    diskReadBytes: healthReadMetric(result, "Disk Read Bytes"),
    diskWriteBytes: healthReadMetric(result, "Disk Write Bytes"),
    diskReadIops: healthReadMetric(result, "Disk Read Operations/Sec"),
    diskWriteIops: healthReadMetric(result, "Disk Write Operations/Sec"),
    osDiskIopsPct: healthReadMetric(result, "OS Disk IOPS Consumed Percentage"),
    osDiskBandwidthPct: healthReadMetric(result, "OS Disk Bandwidth Consumed Percentage"),
    osDiskLatency: healthReadMetric(result, "OS Disk Latency"),
    dataDiskIopsPct: healthReadMetric(result, "Data Disk IOPS Consumed Percentage"),
    dataDiskBandwidthPct: healthReadMetric(result, "Data Disk Bandwidth Consumed Percentage"),
    dataDiskLatency: healthReadMetric(result, "Data Disk Latency")
  };
}

function healthRowsFromLawQuery(queryBody) {
  const table = Array.isArray(queryBody?.tables) ? queryBody.tables[0] : null;
  if (!table || !Array.isArray(table.columns) || !Array.isArray(table.rows)) return [];
  const columns = table.columns.map((column) => String(column?.name || ""));
  return table.rows.map((row) => Object.fromEntries(columns.map((column, index) => [column, row[index]])));
}

function healthReadGuestRows(result) {
  return healthRowsFromLawQuery(result?.guestMetrics);
}

function healthReadHeartbeat(result) {
  const rows = healthRowsFromLawQuery(result?.heartbeat);
  const row = rows[0] || {};
  return {
    heartbeatUtc: row.LastHeartbeat || row.TimeGenerated || null,
    computer: row.Computer || "",
    resourceId: row.ResourceId || ""
  };
}

function healthReadLawPerformance(result) {
  return healthRowsFromLawQuery(result?.lawPerformance);
}

function healthReadWindowsEvents(result) {
  return healthRowsFromLawQuery(result?.windowsEvents).map((row) => {
    const firstSeen = row.FirstSeen || row.TimeGenerated || null;
    const lastSeen = row.LastSeen || row.TimeGenerated || null;
    const occurrences = Math.max(1, Math.trunc(healthFiniteNumber(row.Occurrences) ?? 1));

    return {
      firstSeen,
      lastSeen,
      timeGenerated: lastSeen,
      computer: String(row.Computer || ""),
      eventLog: String(row.EventLog || "Unknown"),
      level: String(row.Level || row.EventLevelName || "Unknown"),
      eventLevel: healthFiniteNumber(row.EventLevel),
      eventId: row.EventID ?? "Unknown",
      source: String(row.Source || "Unknown"),
      occurrences,
      message: String(row.Message || ""),
      resourceId: String(row.ResourceId || "")
    };
  });
}

function healthShortText(value, maxLength = 300) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`;
}

function healthReadRegionalLaw(result) {
  const regional = result?.regionalLaw || {};
  const workspace = regional?.workspace || {};
  const primaryWorkspace = regional?.primaryWorkspace || {};
  const fallbackWorkspace = regional?.fallbackWorkspace || {};
  return {
    mappedName: String(regional?.mappedName || ""),
    workspaceName: String(workspace?.WorkspaceName || regional?.mappedName || ""),
    workspaceId: String(workspace?.WorkspaceId || ""),
    workspaceResourceId: String(workspace?.WorkspaceResourceId || ""),
    workspaceResourceGroup: String(workspace?.WorkspaceResourceGroup || ""),
    workspaceSubscriptionId: String(workspace?.WorkspaceSubscriptionId || ""),
    workspaceLocation: String(workspace?.WorkspaceLocation || ""),
    matchCount: Number(regional?.matchCount || 0),
    lookupStatus: String(regional?.lookupStatus || "Unknown"),
    fallbackUsed: regional?.fallbackUsed === true,
    effectiveSource: String(regional?.effectiveSource || "Primary regional LAW"),
    fallbackReason: String(regional?.fallbackReason || ""),
    primaryMappedName: String(regional?.primaryMappedName || ""),
    primaryWorkspaceName: String(primaryWorkspace?.WorkspaceName || regional?.primaryMappedName || ""),
    fallbackConfiguredName: String(regional?.fallbackConfiguredName || ""),
    fallbackWorkspaceName: String(fallbackWorkspace?.WorkspaceName || regional?.fallbackConfiguredName || "")
  };
}

function healthReadGuest(result) {
  const rows = healthReadGuestRows(result);
  const memoryRow = rows.find((row) => row.Namespace === "Memory" && row.Name === "AvailableMB");
  const memoryPercentRow = rows.find((row) => row.Namespace === "Memory" && row.Name === "AvailablePercent");
  let availableMemoryMb = healthFiniteNumber(memoryRow?.Value);
  let availableMemoryPercent = healthFiniteNumber(memoryPercentRow?.Value);

  if (availableMemoryPercent === null && memoryRow) {
    const tags = healthParseJson(memoryRow.Tags);
    const totalMemoryMb = healthFiniteNumber(tags["vm.azm.ms/memorySizeMB"]);
    if (availableMemoryMb !== null && totalMemoryMb !== null && totalMemoryMb > 0) {
      availableMemoryPercent = (availableMemoryMb / totalMemoryMb) * 100;
    }
  }

  const disksByInstance = new Map();
  for (const row of rows) {
    if (row.Namespace !== "LogicalDisk") continue;

    const instance = String(row.Instance || "Unknown");
    const current = disksByInstance.get(instance) || {
      instance,
      freePercent: null,
      freeMb: null,
      timeGenerated: row.TimeGenerated || null,
      source: String(row.Source || ""),
      isOverallTotal: instance === "_Total"
    };

    if (row.Name === "FreeSpacePercentage") current.freePercent = healthFiniteNumber(row.Value);
    if (row.Name === "FreeSpaceMB") current.freeMb = healthFiniteNumber(row.Value);
    if (row.TimeGenerated) current.timeGenerated = row.TimeGenerated;
    if (row.Source) current.source = String(row.Source);
    current.isOverallTotal = instance === "_Total";

    disksByInstance.set(instance, current);
  }

  const disks = [...disksByInstance.values()].sort((a, b) => {
    if (a.isOverallTotal && !b.isOverallTotal) return 1;
    if (!a.isOverallTotal && b.isOverallTotal) return -1;
    return String(a.instance).localeCompare(String(b.instance), undefined, { numeric: true, sensitivity: "base" });
  });

  const individualDisks = disks.filter((disk) => !disk.isOverallTotal);
  const totalDisk = disks.find((disk) => disk.isOverallTotal) || null;
  const preferredDisks = individualDisks.length ? individualDisks : (totalDisk ? [totalDisk] : []);

  const freePercents = preferredDisks.map((disk) => disk.freePercent).filter((value) => value !== null);
  const freeMbs = preferredDisks.map((disk) => disk.freeMb).filter((value) => value !== null);
  const latestGuestUtc = rows
    .map((row) => row.TimeGenerated)
    .filter(Boolean)
    .sort((a, b) => new Date(b) - new Date(a))[0] || null;

  return {
    availableMemoryMb,
    availableMemoryPercent,
    lowestDiskFreePercent: freePercents.length ? Math.min(...freePercents) : null,
    lowestDiskFreeMb: freeMbs.length ? Math.min(...freeMbs) : null,
    disks,
    individualDisks,
    totalDisk,
    perDriveDataAvailable: individualDisks.length > 0,
    onlyOverallDiskAvailable: individualDisks.length === 0 && !!totalDisk,
    heartbeatUtc: null,
    latestGuestUtc,
    dataAvailable: rows.length > 0
  };
}

function healthReadPatch(result) {
  const records = Array.isArray(result?.patchAssessment?.data) ? result.patchAssessment.data : [];
  const properties = records[0]?.Properties || {};
  const counts = properties.availablePatchCountByClassification || {};
  const criticalSecurityCount = Object.entries(counts).filter(([name]) => /critical|security/i.test(name)).reduce((sum, [, value]) => sum + (Number(value) || 0), 0);
  const totalPending = Object.values(counts).reduce((sum, value) => sum + (Number(value) || 0), 0);
  return {
    available: records.length > 0,
    properties,
    counts,
    criticalSecurityCount,
    totalPending,
    rebootPending: properties.rebootPending ?? null,
    lastAssessmentUtc: properties.lastModifiedDateTime || properties.startDateTime || null
  };
}

function healthReadExtensions(result) {
  return Array.isArray(result?.extensions?.value) ? result.extensions.value : [];
}

function healthReadLawQueryDiagnostics(result) {
  const d = result?.lawQueryDiagnostics || {};
  const clean = (value) => String(value ?? "");
  const number = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };
  return {
    workspaceId: clean(d.workspaceId),
    workspaceName: clean(d.workspaceName),
    heartbeatStatus: clean(d.heartbeatStatus || "Unknown"),
    heartbeatHttpStatus: number(d.heartbeatHttpStatus),
    heartbeatErrorCode: clean(d.heartbeatErrorCode),
    heartbeatErrorMessage: clean(d.heartbeatErrorMessage),
    guestStatus: clean(d.guestStatus || "Unknown"),
    guestHttpStatus: number(d.guestHttpStatus),
    guestErrorCode: clean(d.guestErrorCode),
    guestErrorMessage: clean(d.guestErrorMessage),
    performanceStatus: clean(d.performanceStatus || "Unknown"),
    performanceHttpStatus: number(d.performanceHttpStatus),
    performanceErrorCode: clean(d.performanceErrorCode),
    performanceErrorMessage: clean(d.performanceErrorMessage),
    windowsEventStatus: clean(d.windowsEventStatus || "Unknown"),
    windowsEventHttpStatus: number(d.windowsEventHttpStatus),
    windowsEventErrorCode: clean(d.windowsEventErrorCode),
    windowsEventErrorMessage: clean(d.windowsEventErrorMessage),
    fallbackUsed: d.fallbackUsed === true,
    primaryWorkspaceName: clean(d.primaryWorkspaceName),
    fallbackWorkspaceName: clean(d.fallbackWorkspaceName),
    primaryHeartbeatStatus: clean(d.primaryHeartbeatStatus || "Unknown"),
    primaryHeartbeatHttpStatus: number(d.primaryHeartbeatHttpStatus),
    primaryGuestStatus: clean(d.primaryGuestStatus || "Unknown"),
    primaryGuestHttpStatus: number(d.primaryGuestHttpStatus),
    primaryPerformanceStatus: clean(d.primaryPerformanceStatus || "Unknown"),
    primaryPerformanceHttpStatus: number(d.primaryPerformanceHttpStatus),
    primaryWindowsEventStatus: clean(d.primaryWindowsEventStatus || "Unknown"),
    primaryWindowsEventHttpStatus: number(d.primaryWindowsEventHttpStatus)
  };
}

function healthReadMonitoring(result, guest) {
  const extensions = healthReadExtensions(result);
  const amaExtension = extensions.find((extension) => {
    const text = `${extension?.name || ""} ${extension?.properties?.type || ""}`.toLowerCase();
    return text.includes("azuremonitorwindowsagent") || text.includes("azuremonitorlinuxagent");
  });
  const dcrs = Array.isArray(result?.dcrAssociations?.value) ? result.dcrAssociations.value : [];
  const heartbeat = healthReadHeartbeat(result);
  const regionalLaw = healthReadRegionalLaw(result);
  const lawDiagnostics = healthReadLawQueryDiagnostics(result);
  const heartbeatUtc = heartbeat.heartbeatUtc || guest.heartbeatUtc || null;
  const heartbeatAge = healthAgeMinutes(heartbeatUtc);
  return {
    amaInstalled: Boolean(amaExtension),
    amaProvisioningState: amaExtension?.properties?.provisioningState || "Unknown",
    dcrCount: dcrs.length,
    dcrs,
    vmInsightsDataAvailable: guest.dataAvailable,
    heartbeatUtc,
    heartbeatAgeMinutes: heartbeatAge,
    heartbeatState: heartbeatAge === null ? "Unknown" : heartbeatAge <= 10 ? "Reporting" : heartbeatAge <= 30 ? "Stale" : "No recent heartbeat",
    regionalLawName: regionalLaw.workspaceName || regionalLaw.mappedName || "Unknown",
    regionalLawWorkspaceId: regionalLaw.workspaceId || "",
    regionalLawLocation: regionalLaw.workspaceLocation || "",
    regionalLawResourceGroup: regionalLaw.workspaceResourceGroup || "",
    regionalLawMatchCount: regionalLaw.matchCount,
    regionalLawLookupStatus: regionalLaw.lookupStatus,
    regionalLawFallbackUsed: regionalLaw.fallbackUsed,
    regionalLawEffectiveSource: regionalLaw.effectiveSource,
    regionalLawFallbackReason: regionalLaw.fallbackReason,
    regionalLawPrimaryName: regionalLaw.primaryWorkspaceName || regionalLaw.primaryMappedName,
    regionalLawFallbackName: regionalLaw.fallbackWorkspaceName || regionalLaw.fallbackConfiguredName,
    lawPerformance: healthReadLawPerformance(result),
    lawDiagnostics
  };
}

function healthReadBackup(result) {
  const current = result?.backup || {};
  const records = Array.isArray(result?.backupProtectedItem?.data) ? result.backupProtectedItem.data : [];
  const item = records[0] || {};
  return {
    protected: String(current.protectionStatus || item.ProtectionStatus || "Unknown"),
    vaultId: current.vaultId || item.VaultId || "",
    policyName: current.policyName || item.PolicyName || "Unknown",
    lastBackupStatus: item.LastBackupStatus || "Unknown",
    lastBackupTime: item.LastBackupTime || null,
    lastRecoveryPoint: item.LastRecoveryPoint || null,
    healthStatus: item.HealthStatus || "Unknown",
    protectionState: item.ProtectionState || "Unknown"
  };
}

function healthReadAlerts(result) {
  const alerts = Array.isArray(result?.activeAlerts?.value) ? result.activeAlerts.value : [];
  return alerts.filter((a) => String(a?.properties?.essentials?.monitorCondition || "").toLowerCase() === "fired");
}

function healthReadActivity(result) {
  const events = Array.isArray(result?.recentActivity?.value) ? result.recentActivity.value : [];
  return [...events].sort((a,b) => new Date(b?.eventTimestamp || 0) - new Date(a?.eventTimestamp || 0)).slice(0, 20);
}

function healthReadResourceHistory(result) {
  const items = Array.isArray(result?.resourceHealthHistory?.value) ? result.resourceHealthHistory.value : [];
  return [...items].sort((a,b) => new Date(b?.properties?.reportedTime || b?.properties?.occuredTime || 0) - new Date(a?.properties?.reportedTime || a?.properties?.occuredTime || 0)).slice(0, 15);
}


function healthReadEffectiveNSGs(result) {
  return Array.isArray(result?.effectiveNSGs?.value) ? result.effectiveNSGs.value : [];
}

function healthAddFinding(findings, severity, code, message) {
  findings.push({ severity, code, message });
}

function healthDataFreshness(result, platform, guest, patch, backup, monitoring) {
  const candidates = [
    { name: "Platform metrics", utc: platform.cpu.latestUtc },
    { name: "Guest telemetry", utc: guest.latestGuestUtc },
    { name: "Heartbeat", utc: monitoring.heartbeatUtc },
    { name: "Patch assessment", utc: patch.lastAssessmentUtc },
    { name: "Last backup", utc: backup.lastBackupTime },
    { name: "Resource Health", utc: result?.resourceHealth?.properties?.reportedTime || null }
  ];
  const known = candidates.filter((x) => x.utc);
  const stale = known.filter((x) => (healthAgeMinutes(x.utc) ?? 0) > 1440);
  return {
    rows: candidates,
    state: known.length === 0 ? "Unknown" : stale.length > 0 || known.length < candidates.length ? "Partial" : "Fresh"
  };
}

function deriveVmHealth(result) {
  if (!result || result.status === "Failed") {
    return {
      overall: "Critical",
      findings: [{ severity: "Critical", code: "DIAGNOSTIC_FAILED", message: result?.message || "The VM health diagnostic failed." }],
      recommendations: ["Review the Logic App run history and the failed data source before retrying the diagnostic."],
      powerState: "Unknown", provisioningState: "Unknown", agentStatus: "Unknown", resourceHealth: "Unknown",
      platform: healthReadPlatform({}), guest: healthReadGuest({}), patch: healthReadPatch({}), monitoring: healthReadMonitoring({}, healthReadGuest({})),
      backup: healthReadBackup({}), alerts: [], activity: [], resourceHistory: [], effectiveNSGs: [], windowsEvents: [], windowsEventSummary: { uniqueTotal: 0, criticalUnique24h: 0, errorUnique24h: 0, totalOccurrences: 0, criticalOccurrences: 0, errorOccurrences: 0, recentCriticalUnique: 0, recentCriticalOccurrences: 0, lastCriticalUtc: null }, freshness: { rows: [], state: "Unknown" }
    };
  }

  const findings = [];
  const powerState = healthGetInstanceStatus(result, "PowerState/");
  const provisioningState = healthGetInstanceStatus(result, "ProvisioningState/");
  const agentStatus = healthGetAgentStatus(result);
  const resourceHealth = String(result?.resourceHealth?.properties?.availabilityState || "Unknown");
  const platform = healthReadPlatform(result);
  const guest = healthReadGuest(result);
  const patch = healthReadPatch(result);
  const monitoring = healthReadMonitoring(result, guest);
  const backup = healthReadBackup(result);
  const alerts = healthReadAlerts(result);
  const activity = healthReadActivity(result);
  const resourceHistory = healthReadResourceHistory(result);
  const effectiveNSGs = healthReadEffectiveNSGs(result);
  const windowsEvents = healthReadWindowsEvents(result);
  const extensions = healthReadExtensions(result);
  const running = healthIsRunning(powerState);

  const diagnosticPeriodMinutes = Number(result?.periodMinutes || 60);
  const criticalWindowsEvents = windowsEvents.filter((event) => /^critical$/i.test(event.level));
  const errorWindowsEvents = windowsEvents.filter((event) => /^error$/i.test(event.level));

  const recentCriticalWindowsEvents = criticalWindowsEvents.filter((event) => {
    const age = healthAgeMinutes(event.lastSeen || event.timeGenerated);
    return age !== null && age <= diagnosticPeriodMinutes;
  });

  const lastCriticalWindowsEvent = [...criticalWindowsEvents]
    .filter((event) => event.lastSeen || event.timeGenerated)
    .sort((a, b) => new Date(b.lastSeen || b.timeGenerated) - new Date(a.lastSeen || a.timeGenerated))[0] || null;

  const sumOccurrences = (events) => events.reduce(
    (sum, event) => sum + Math.max(1, Number(event.occurrences || 1)),
    0
  );

  const windowsEventSummary = {
    uniqueTotal: windowsEvents.length,
    criticalUnique24h: criticalWindowsEvents.length,
    errorUnique24h: errorWindowsEvents.length,
    totalOccurrences: sumOccurrences(windowsEvents),
    criticalOccurrences: sumOccurrences(criticalWindowsEvents),
    errorOccurrences: sumOccurrences(errorWindowsEvents),
    recentCriticalUnique: recentCriticalWindowsEvents.length,
    recentCriticalOccurrences: sumOccurrences(recentCriticalWindowsEvents),
    lastCriticalUtc: lastCriticalWindowsEvent?.lastSeen || lastCriticalWindowsEvent?.timeGenerated || null
  };

  if (powerState !== "Unknown" && !running) healthAddFinding(findings, "Critical", "VM_NOT_RUNNING", `VM power state is ${powerState}.`);
  if (provisioningState !== "Unknown" && !/succeeded/i.test(provisioningState)) healthAddFinding(findings, "Critical", "PROVISIONING_STATE", `VM provisioning state is ${provisioningState}.`);
  if (/unavailable/i.test(resourceHealth)) healthAddFinding(findings, "Critical", "RESOURCE_HEALTH", "Azure Resource Health reports the VM as Unavailable.");
  else if (/degraded|unknown/i.test(resourceHealth)) healthAddFinding(findings, "Warning", "RESOURCE_HEALTH", `Azure Resource Health is ${resourceHealth}.`);
  if (agentStatus !== "Unknown" && !/ready/i.test(agentStatus)) healthAddFinding(findings, "Warning", "VM_AGENT", `Azure VM Agent status is ${agentStatus}.`);

  if (running && platform.cpu.average !== null && platform.cpu.average >= 90) healthAddFinding(findings, "Critical", "CPU_HIGH", `Average CPU is ${platform.cpu.average.toFixed(1)}%.`);
  else if (running && ((platform.cpu.average !== null && platform.cpu.average >= 80) || (platform.cpu.maximum !== null && platform.cpu.maximum >= 90))) healthAddFinding(findings, "Warning", "CPU_HIGH", `CPU reached ${healthFormatPercent(platform.cpu.maximum)} with ${healthFormatPercent(platform.cpu.average)} average.`);

  if (guest.availableMemoryPercent !== null) {
    if (guest.availableMemoryPercent < 10) healthAddFinding(findings, "Critical", "MEMORY_LOW", `Available memory is ${guest.availableMemoryPercent.toFixed(1)}%.`);
    else if (guest.availableMemoryPercent < 20) healthAddFinding(findings, "Warning", "MEMORY_LOW", `Available memory is ${guest.availableMemoryPercent.toFixed(1)}%.`);
  }
  for (const disk of guest.disks) {
    if (disk.freePercent === null) continue;
    if (disk.freePercent < 10) healthAddFinding(findings, "Critical", "DISK_SPACE_LOW", `${disk.instance} has only ${disk.freePercent.toFixed(1)}% free space.`);
    else if (disk.freePercent < 20) healthAddFinding(findings, "Warning", "DISK_SPACE_LOW", `${disk.instance} has ${disk.freePercent.toFixed(1)}% free space.`);
  }

  const failedExtensions = extensions.filter((extension) => {
    const state = String(extension?.properties?.provisioningState || "Unknown");
    return state !== "Unknown" && !/succeeded/i.test(state);
  });
  if (failedExtensions.length) healthAddFinding(findings, "Warning", "EXTENSION_HEALTH", `${failedExtensions.length} VM extension(s) are not in Succeeded provisioning state.`);

  const highAlerts = alerts.filter((a) => /Sev0|Sev1/i.test(String(a?.properties?.essentials?.severity || "")));
  if (highAlerts.length) healthAddFinding(findings, "Critical", "ACTIVE_ALERT", `${highAlerts.length} active Sev0/Sev1 Azure Monitor alert(s) target this VM.`);
  else if (alerts.length) healthAddFinding(findings, "Warning", "ACTIVE_ALERT", `${alerts.length} active Azure Monitor alert(s) target this VM.`);

  if (windowsEventSummary.recentCriticalUnique > 0) {
    healthAddFinding(
      findings,
      "Critical",
      "WINDOWS_CRITICAL_EVENT",
      `${windowsEventSummary.recentCriticalUnique} unique Critical Windows event type(s) occurred during the selected ${diagnosticPeriodMinutes}-minute diagnostic period (${windowsEventSummary.recentCriticalOccurrences} occurrence(s)).`
    );
  } else if (windowsEventSummary.criticalUnique24h > 0) {
    healthAddFinding(
      findings,
      "Warning",
      "WINDOWS_CRITICAL_EVENT_HISTORY",
      `${windowsEventSummary.criticalUnique24h} unique Critical Windows event type(s) occurred in the last 24 hours (${windowsEventSummary.criticalOccurrences} occurrence(s)).`
    );
  }

  if (backup.protected.toLowerCase() !== "protected") healthAddFinding(findings, "Warning", "BACKUP_PROTECTION", `Azure Backup protection status is ${backup.protected}.`);
  if (/unhealthy|failed/i.test(backup.lastBackupStatus)) healthAddFinding(findings, "Warning", "BACKUP_LAST_STATUS", `Last Azure Backup status is ${backup.lastBackupStatus}.`);
  const backupAge = healthAgeMinutes(backup.lastBackupTime);
  if (backupAge !== null && backupAge > 2880) healthAddFinding(findings, "Critical", "BACKUP_STALE", `Last backup is ${healthAgeText(backup.lastBackupTime)}.`);
  else if (backupAge !== null && backupAge > 1440) healthAddFinding(findings, "Warning", "BACKUP_STALE", `Last backup is ${healthAgeText(backup.lastBackupTime)}.`);

  if (patch.criticalSecurityCount > 0) healthAddFinding(findings, "Warning", "PATCHES_PENDING", `${patch.criticalSecurityCount} Critical/Security patch(es) are pending in the latest assessment.`);
  if (patch.rebootPending === true) healthAddFinding(findings, "Warning", "PATCH_REBOOT", "The latest patch assessment indicates a reboot is pending.");
  if (!monitoring.amaInstalled) healthAddFinding(findings, "Warning", "AMA_MISSING", "Azure Monitor Agent was not detected in the VM extension list.");
  if (monitoring.dcrCount < 1) healthAddFinding(findings, "Warning", "DCR_MISSING", "No Data Collection Rule association was returned for this VM.");
  if (monitoring.regionalLawName === "Unknown") healthAddFinding(findings, "Warning", "REGIONAL_LAW_UNKNOWN", `No regional Log Analytics workspace mapping was resolved for Azure region ${result?.vm?.Location || "Unknown"}.`);
  if (monitoring.regionalLawFallbackUsed) healthAddFinding(findings, "Warning", "LAW_FALLBACK_USED", `No VM telemetry was found in primary LAW ${monitoring.regionalLawPrimaryName || "central-law-weu-law"}; last-resort LAW ${monitoring.regionalLawName} was used.`);
  if (!monitoring.vmInsightsDataAvailable) healthAddFinding(findings, "Warning", "GUEST_TELEMETRY_UNKNOWN", `VM Insights guest telemetry was not returned from effective LAW ${monitoring.regionalLawName}; memory and logical-disk health remain Unknown.`);
  if (running && monitoring.heartbeatAgeMinutes === null) healthAddFinding(findings, "Warning", "HEARTBEAT_UNKNOWN", `No Heartbeat record was returned from regional LAW ${monitoring.regionalLawName}.`);
  if (monitoring.heartbeatAgeMinutes !== null && monitoring.heartbeatAgeMinutes > 30) healthAddFinding(findings, "Warning", "HEARTBEAT_STALE", `Latest VM Insights heartbeat is ${healthAgeText(monitoring.heartbeatUtc)}.`);

  const lawDiag = monitoring.lawDiagnostics || {};
  if (lawDiag.heartbeatStatus && lawDiag.heartbeatStatus !== "Succeeded") {
    const http = lawDiag.heartbeatHttpStatus ? ` HTTP ${lawDiag.heartbeatHttpStatus}` : "";
    const code = lawDiag.heartbeatErrorCode ? ` ${lawDiag.heartbeatErrorCode}` : "";
    healthAddFinding(findings, "Warning", "LAW_HEARTBEAT_QUERY_FAILED", `Regional LAW Heartbeat query failed.${http}${code}`);
  }

  const failedSources = Object.entries(result?.actionStatus || {}).filter(([, status]) => status !== "Succeeded").map(([name]) => name);
  if (failedSources.length) healthAddFinding(findings, "Warning", "DATA_SOURCE_UNAVAILABLE", `${failedSources.length} diagnostic data source(s) were unavailable: ${failedSources.join(", ")}.`);

  let overall = "Healthy";
  if (findings.some((finding) => finding.severity === "Critical")) overall = "Critical";
  else if (findings.some((finding) => finding.severity === "Warning")) overall = "Warning";

  const recommendations = [];
  if (!running) recommendations.push("Verify whether the VM shutdown/deallocation was planned. Performance telemetry is shown as N/A while the VM is not running.");
  if (/unavailable|degraded/i.test(resourceHealth)) recommendations.push("Review Resource Health history and any recommended Azure actions for the current availability event.");
  if (alerts.length) recommendations.push("Review the active Azure Monitor alerts and resolve the highest-severity fired condition first.");
  if ([401, 403].includes(Number(monitoring.lawDiagnostics?.heartbeatHttpStatus || 0))) {
    if (Number(monitoring.lawDiagnostics?.heartbeatHttpStatus) === 403) recommendations.push(`Grant the Health Logic App managed identity Log Analytics Reader/query access on regional LAW ${monitoring.regionalLawName}.`);
    else recommendations.push(`The regional LAW query returned HTTP 401. Verify the Logic App managed-identity authentication/audience for the Log Analytics API.`);
  }
  if (monitoring.regionalLawFallbackUsed) recommendations.push(`Primary LAW ${monitoring.regionalLawPrimaryName || "central-law-weu-law"} had no matching VM telemetry, so ${monitoring.regionalLawName} was queried as the last-resort fallback. Confirm whether this VM is expected to report to the fallback LAW.`);
  if (!monitoring.vmInsightsDataAvailable) recommendations.push(`Validate VM Insights / InsightsMetrics collection in effective LAW ${monitoring.regionalLawName} before relying on guest memory/disk health.`);
  if (monitoring.heartbeatAgeMinutes !== null && monitoring.heartbeatAgeMinutes > 30) recommendations.push("Investigate the stale VM Insights heartbeat: check AMA extension state, DCR association, outbound connectivity and workspace ingestion.");
  if (windowsEventSummary.criticalUnique24h > 0) recommendations.push("Review the unique Critical Windows System/Application event types, starting with the highest-occurrence and most recently seen Event ID/source.");
  if (patch.criticalSecurityCount > 0) recommendations.push("Review pending Critical/Security patches in Azure Update Manager and schedule remediation through the approved patch process.");
  if (backup.protected.toLowerCase() !== "protected" || /unhealthy|failed/i.test(backup.lastBackupStatus)) recommendations.push("Review Azure Backup protection and the latest backup job before relying on recovery-point availability.");
  if (recommendations.length === 0) recommendations.push("No immediate remediation recommendation was generated from the configured read-only checks.");

  const freshness = healthDataFreshness(result, platform, guest, patch, backup, monitoring);
  return { overall, findings, recommendations, powerState, provisioningState, agentStatus, resourceHealth, platform, guest, patch, monitoring, backup, alerts, activity, resourceHistory, effectiveNSGs, windowsEvents, windowsEventSummary, freshness };
}

function healthBadgeClass(status) {
  const value = String(status || "Unknown").toLowerCase();
  if (value === "healthy") return "health-status-healthy";
  if (value === "warning") return "health-status-warning";
  if (value === "critical") return "health-status-critical";
  if (value === "processing" || value === "submitted") return "health-status-processing";
  return "health-status-unknown";
}

function healthStatusBannerClass(status) {
  if (status === "Completed") return "status-success";
  if (status === "Failed") return "status-error";
  return "status-warning";
}

function healthBuildMiniTable(headers, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return '<div class="health-empty">No data returned for this section.</div>';
  return `<div class="table-wrap"><table class="health-mini-table"><thead><tr>${headers.map((header) => `<th>${escapeHtml(header.label)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(header.value(row))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function healthBuildConfiguration(result, view) {
  const vm = result?.vm || {};
  const hardware = result?.hardware || {};
  const vCpuCount = healthFiniteNumber(hardware.vCpuCount);
  const memoryMb = healthFiniteNumber(hardware.memoryMB);
  const memoryGb = memoryMb === null ? null : memoryMb / 1024;
  const rows = [
    ["Azure VM name", vm.VMName || "Unknown"], ["OS hostname", vm.ComputerName || vm.Hostname || result?.hostname || "Unknown"],
    ["Subscription", vm.SubscriptionName || vm.SubscriptionId || "Unknown"], ["Resource group", vm.ResourceGroup || "Unknown"],
    ["Region", vm.Location || "Unknown"], ["VM size", vm.VMSize || "Unknown"],
    ["vCPUs", vCpuCount === null ? "Unknown" : healthFormatNumber(vCpuCount, 0)],
    ["RAM", memoryGb === null ? "Unknown" : `${healthFormatNumber(memoryGb, memoryGb % 1 === 0 ? 0 : 1)} GB`],
    ["OS type", vm.OSType || "Unknown"],
    ["Security type", vm.SecurityType || "Standard / not reported"], ["Managed identity", vm.IdentityType || "None / not reported"],
    ["Boot diagnostics", vm.BootDiagnosticsEnabled === true ? "Enabled" : vm.BootDiagnosticsEnabled === false ? "Disabled" : "Unknown"],
    ["Power state", view.powerState], ["Provisioning state", view.provisioningState], ["VM Agent", view.agentStatus], ["Resource ID", vm.ResourceId || "Unknown"]
  ];
  return `<div class="table-wrap"><table class="health-mini-table"><tbody>${rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}</tbody></table></div>`;
}

function healthVmPortalUrl(result) {
  const id = result?.vm?.ResourceId;
  return id ? `https://portal.azure.com/#resource${id}/overview` : "https://portal.azure.com/";
}

function healthCopyText(result) {
  const v = deriveVmHealth(result);
  const vm = result?.vm || {};
  const hardware = result?.hardware || {};
  const vCpuCount = healthFiniteNumber(hardware.vCpuCount);
  const memoryMb = healthFiniteNumber(hardware.memoryMB);
  const memoryGb = memoryMb === null ? null : memoryMb / 1024;
  return [
    `VM Health Diagnostic V2.6.8`, `VM: ${result?.hostname || vm.VMName || "Unknown"}`, `Overall: ${v.overall}`,
    `Power: ${v.powerState}`, `Resource Health: ${v.resourceHealth}`, `Active alerts: ${v.alerts.length}`,
    `CPU avg/max: ${healthIsRunning(v.powerState) ? `${healthFormatPercent(v.platform.cpu.average)} / ${healthFormatPercent(v.platform.cpu.maximum)}` : "N/A - VM not running"}`,
    `vCPUs: ${vCpuCount === null ? "Unknown" : healthFormatNumber(vCpuCount, 0)}`,
    `RAM: ${memoryGb === null ? "Unknown" : `${healthFormatNumber(memoryGb, memoryGb % 1 === 0 ? 0 : 1)} GB`}`,
    `Memory available: ${healthIsRunning(v.powerState) ? healthFormatPercent(v.guest.availableMemoryPercent) : "N/A - VM not running"}`,
    `Lowest disk free: ${healthIsRunning(v.powerState) ? healthFormatPercent(v.guest.lowestDiskFreePercent) : "N/A - VM not running"}`,
    `Backup: ${v.backup.protected}; last=${v.backup.lastBackupStatus}; ${healthAgeText(v.backup.lastBackupTime)}`,
    `Patch pending: ${v.patch.available ? v.patch.totalPending : "Unknown"}`,
    `Windows events (24h): ${v.windowsEventSummary.uniqueTotal} unique (${v.windowsEventSummary.criticalUnique24h} Critical / ${v.windowsEventSummary.errorUnique24h} Error), ${v.windowsEventSummary.totalOccurrences} occurrence(s)`,
    `Regional LAW: ${v.monitoring.regionalLawName}`, `Monitoring: ${v.monitoring.heartbeatState}`,
    `Findings:`, ...v.findings.map((f) => `- ${f.severity}: ${f.message}`), `Recommendations:`, ...v.recommendations.map((r) => `- ${r}`)
  ].join("\n");
}

function healthDownloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}


// V2.6 PDF-only enhancement: creates one complete print-ready report for the VM.
// All diagnostic accordions are expanded in the report, while the live portal is unchanged.
function healthDownloadPdfReport(result) {
  const hostname = String(result?.hostname || result?.vm?.VMName || "vm").trim() || "vm";
  const safeHostname = hostname.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
  const generatedUtc = new Date();
  const generatedDisplay = generatedUtc.toLocaleString();
  const fileDate = generatedUtc.toISOString().replace(/[:]/g, "-").replace(/\.\d{3}Z$/, "Z");

  if (!healthResultArea) {
    alert("VM health result is not available for PDF export.");
    return;
  }

  const reportClone = healthResultArea.cloneNode(true);

  // Export the complete diagnostic, not only currently expanded sections.
  reportClone.querySelectorAll("details").forEach((detail) => {
    detail.setAttribute("open", "");
    detail.open = true;
  });

  // Remove portal-only controls from the PDF copy.
  reportClone.querySelectorAll(".health-action-bar").forEach((node) => node.remove());
  reportClone.querySelectorAll("button").forEach((node) => node.remove());

  const printableHtml = reportClone.innerHTML;
  const reportWindow = window.open("", "_blank");

  if (!reportWindow) {
    alert("The browser blocked the PDF report window. Allow pop-ups for this portal and try again.");
    return;
  }

  const cssUrl = new URL("/styles.css", window.location.origin).href;
  const reportTitle = `vm-health-${safeHostname}-${fileDate}`;

  reportWindow.document.open();
  reportWindow.document.write(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(reportTitle)}</title>
  <link rel="stylesheet" href="${escapeHtml(cssUrl)}">
  <style>
    @page {
      size: A4 landscape;
      margin: 10mm;
    }

    html,
    body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #102a43 !important;
      font-family: Arial, Helvetica, sans-serif !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      width: 100% !important;
      max-width: none !important;
    }

    .health-pdf-shell {
      width: 100% !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    .health-pdf-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 20px;
      padding: 0 0 8px;
      margin-bottom: 10px;
      border-bottom: 2px solid #0f6cbd;
    }

    .health-pdf-header h1 {
      margin: 0;
      font-size: 18pt;
      color: #0b2239;
    }

    .health-pdf-header p {
      margin: 3px 0 0;
      color: #526b80;
      font-size: 8.5pt;
    }

    .health-pdf-meta {
      text-align: right;
      font-size: 8pt;
      color: #526b80;
      white-space: nowrap;
    }

    #healthResultArea,
    .health-results,
    .health-result-area {
      width: 100% !important;
      max-width: none !important;
      margin: 0 !important;
    }

    .health-action-bar,
    button,
    .secondary {
      display: none !important;
    }

    .health-vm-card,
    .health-status-banner,
    .health-overview-grid,
    .health-findings,
    .health-note {
      box-shadow: none !important;
    }

    .health-vm-card {
      border: 1px solid #cddbe7 !important;
      margin: 0 0 10px !important;
      break-inside: auto;
    }

    .health-chip-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
      gap: 6px !important;
    }

    .health-chip {
      min-height: 0 !important;
      padding: 8px 9px !important;
      border: 1px solid #d6e2ec !important;
      box-shadow: none !important;
      transform: none !important;
      background: #ffffff !important;
    }

    .health-chip-label {
      font-size: 7.5pt !important;
    }

    .health-chip-value {
      font-size: 10.5pt !important;
    }

    .health-kpi-note,
    .health-disk-system-note,
    .health-disk-lowest {
      font-size: 7.5pt !important;
    }

    .health-disk-pill {
      font-size: 7.5pt !important;
      padding: 2px 6px !important;
    }

    .health-findings {
      break-inside: avoid-page;
    }

    .health-findings h4 {
      margin-top: 0 !important;
    }

    .health-findings li {
      font-size: 8pt !important;
      line-height: 1.35 !important;
      margin-bottom: 2px !important;
    }

    .health-details details {
      display: block !important;
      border-top: 1px solid #d6e2ec !important;
      break-inside: auto !important;
    }

    .health-details details[open] > * {
      display: block !important;
    }

    .health-details summary {
      display: block !important;
      padding: 7px 9px !important;
      font-size: 9pt !important;
      font-weight: 700 !important;
      color: #0b2239 !important;
      background: #f5f9fc !important;
      break-after: avoid-page;
      list-style: none !important;
    }

    .health-details summary::-webkit-details-marker {
      display: none !important;
    }

    .health-details-body {
      display: block !important;
      padding: 8px 9px !important;
    }

    .health-section-heading {
      margin: 8px 0 5px !important;
      font-size: 8.5pt !important;
      break-after: avoid-page;
    }

    .health-table-wrap {
      overflow: visible !important;
      width: 100% !important;
      margin-bottom: 7px !important;
    }

    .health-table-wrap table,
    .health-mini-table {
      width: 100% !important;
      border-collapse: collapse !important;
      table-layout: auto !important;
      font-size: 7.2pt !important;
    }

    .health-table-wrap thead,
    .health-mini-table thead {
      display: table-header-group !important;
    }

    .health-table-wrap tr,
    .health-mini-table tr {
      break-inside: avoid !important;
    }

    .health-table-wrap th,
    .health-table-wrap td,
    .health-mini-table th,
    .health-mini-table td {
      padding: 3px 4px !important;
      border: 1px solid #dbe5ed !important;
      vertical-align: top !important;
      white-space: normal !important;
      overflow-wrap: anywhere !important;
    }

    .health-metric-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      gap: 5px !important;
    }

    .health-metric-box {
      padding: 6px 7px !important;
      min-height: 0 !important;
      box-shadow: none !important;
    }

    .health-metric-box span {
      font-size: 7pt !important;
    }

    .health-metric-box strong {
      font-size: 8.5pt !important;
    }

    .health-status-pill {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .health-request-meta,
    .health-vm-subtitle,
    .field-help,
    .health-empty,
    .health-note {
      font-size: 7.8pt !important;
      line-height: 1.35 !important;
    }

    a {
      color: #0f6cbd !important;
      text-decoration: none !important;
    }

    @media print {
      .health-pdf-header,
      .health-overview-grid,
      .health-vm-header {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <main class="health-pdf-shell">
    <header class="health-pdf-header">
      <div>
        <h1>Azure VM Health Diagnostic Report</h1>
        <p>Complete diagnostic output for ${escapeHtml(hostname)}</p>
      </div>
      <div class="health-pdf-meta">
        <div><strong>Generated:</strong> ${escapeHtml(generatedDisplay)}</div>
        <div><strong>Portal:</strong> VM Health Diagnostic V2.6.8</div>
      </div>
    </header>

    <section id="healthResultArea">
      ${printableHtml}
    </section>
  </main>
</body>
</html>`);
  reportWindow.document.close();

  const triggerPrint = () => {
    try {
      reportWindow.focus();
      reportWindow.print();
    } catch (error) {
      console.error("Unable to open PDF print dialog.", error);
      alert("The PDF report was prepared, but the browser could not open the print dialog.");
    }
  };

  if (reportWindow.document.readyState === "complete") {
    window.setTimeout(triggerPrint, 600);
  } else {
    reportWindow.addEventListener("load", () => {
      window.setTimeout(triggerPrint, 600);
    }, { once: true });
  }
}

function healthDiskFreeStatus(percent) {
  const value = healthFiniteNumber(percent);
  if (value === null) return "unknown";
  if (value < 10) return "critical";
  if (value < 25) return "warning";
  return "healthy";
}

function healthBuildVmCard(result, index) {
  const view = deriveVmHealth(result);
  const vm = result?.vm || {};
  const hardware = result?.hardware || {};
  const vCpuCount = healthFiniteNumber(hardware.vCpuCount);
  const memoryMb = healthFiniteNumber(hardware.memoryMB);
  const memoryGb = memoryMb === null ? null : memoryMb / 1024;
  const computeSummary = [
    vCpuCount === null ? null : `${healthFormatNumber(vCpuCount, 0)} vCPU`,
    memoryGb === null ? null : `${healthFormatNumber(memoryGb, memoryGb % 1 === 0 ? 0 : 1)} GB RAM`
  ].filter(Boolean).join(" • ");
  const guest = view.guest;
  const patch = view.patch;
  const monitoring = view.monitoring;
  const backup = view.backup;
  const windowsEvents = view.windowsEvents;
  const windowsEventSummary = view.windowsEventSummary;
  const disks = Array.isArray(result?.managedDisks?.data) ? result.managedDisks.data : [];
  const nics = Array.isArray(result?.network?.data) ? result.network.data : [];
  const extensions = healthReadExtensions(result);
  const running = healthIsRunning(view.powerState);
  const runtimeMetric = (value, formatter = healthFormatPercent) => running ? formatter(value) : "N/A – VM not running";
  const patchDisplay = patch.available ? `${patch.totalPending} pending` : "Unknown";
  const monitorDisplay = monitoring.heartbeatState === "Reporting" ? (monitoring.vmInsightsDataAvailable ? "Reporting" : "Reporting / Partial") : monitoring.heartbeatState !== "Unknown" ? monitoring.heartbeatState : monitoring.vmInsightsDataAvailable ? "Partial" : "Unknown";
  const memoryDisplay = !running ? "N/A – VM not running" : guest.availableMemoryPercent !== null ? healthFormatPercent(guest.availableMemoryPercent) : guest.availableMemoryMb !== null ? `${healthFormatNumber(guest.availableMemoryMb, 0)} MB` : "Unknown";
  const diskDisplay = !running ? "N/A – VM not running" : guest.lowestDiskFreePercent !== null ? healthFormatPercent(guest.lowestDiskFreePercent) : guest.lowestDiskFreeMb !== null ? `${healthFormatNumber(guest.lowestDiskFreeMb, 0)} MB` : "Unknown";

  const driveLetterDisks = guest.individualDisks.filter((disk) => /^[A-Za-z]:$/.test(String(disk.instance || "").trim()));
  const systemVolumeDisks = guest.individualDisks.filter((disk) => !/^[A-Za-z]:$/.test(String(disk.instance || "").trim()));

  const lowestDrive = driveLetterDisks
    .filter((disk) => disk.freePercent !== null)
    .sort((a, b) => a.freePercent - b.freePercent)[0] || null;

  const diskCardLabel = driveLetterDisks.length ? "Disk space" : "Disk free";
  const diskHeadline = lowestDrive
    ? `${lowestDrive.freePercent.toFixed(1)}%`
    : diskDisplay;

  const diskHeadlineNote = lowestDrive
    ? `Lowest free drive: ${lowestDrive.instance}`
    : guest.totalDisk
      ? "Overall logical disks"
      : "No drive-level telemetry";

  const diskDrivePillsHtml = driveLetterDisks.length
    ? `<div class="health-disk-pills">${driveLetterDisks.map((disk) => {
        const percent = disk.freePercent;
        const freeGb = disk.freeMb !== null ? healthFormatNumber(disk.freeMb / 1024, 1) : null;
        const status = healthDiskFreeStatus(percent);
        const valueText = percent !== null ? `${percent.toFixed(1)}%` : freeGb !== null ? `${freeGb} GB` : "Unknown";
        const titleText = freeGb !== null ? `${disk.instance} - ${valueText} free (${freeGb} GB)` : `${disk.instance} - ${valueText} free`;
        return `<span class="health-disk-pill health-disk-${status}" title="${escapeHtml(titleText)}"><strong>${escapeHtml(disk.instance)}</strong><span>${escapeHtml(valueText)}</span></span>`;
      }).join("")}</div>`
    : "";

  const diskSystemNoteHtml = systemVolumeDisks.length
    ? `<span class="health-disk-system-note">${escapeHtml(`${systemVolumeDisks.length} system volume${systemVolumeDisks.length === 1 ? "" : "s"} available in details`)}</span>`
    : "";

  const findingsHtml = view.findings.length ? `<ul>${view.findings.map((finding) => `<li class="health-finding-${finding.severity.toLowerCase()}"><strong>${escapeHtml(finding.severity)}:</strong> ${escapeHtml(finding.message)}</li>`).join("")}</ul>` : '<div class="health-empty">No warning or critical findings were identified by the configured V2 rules.</div>';

  const guestDiskTable = healthBuildMiniTable([
    { label: "Drive / mount", value: (r) => r.instance },
    { label: "Free %", value: (r) => r.freePercent === null ? "Unknown" : `${r.freePercent.toFixed(1)}%` },
    { label: "Free GB", value: (r) => r.freeMb === null ? "Unknown" : healthFormatNumber(r.freeMb / 1024, 1) },
    { label: "Scope", value: (r) => r.isOverallTotal ? "Overall (_Total)" : "Individual drive" },
    { label: "Last sample", value: (r) => healthFormatDateTime(r.timeGenerated) }
  ], guest.disks);

  const managedDiskTable = healthBuildMiniTable([
    { label: "Disk", value: (r) => r.Name || "Unknown" }, { label: "Size GB", value: (r) => r.SizeGB ?? "Unknown" }, { label: "SKU", value: (r) => r.Sku || "Unknown" },
    { label: "State", value: (r) => r.DiskState || "Unknown" }, { label: "Encryption", value: (r) => r.EncryptionType || "Platform managed / not reported" }
  ], disks);

  const networkTable = healthBuildMiniTable([
    { label: "NIC", value: (r) => r.Name || "Unknown" }, { label: "Private IP", value: (r) => r.PrivateIp || "Unknown" },
    { label: "VNet", value: (r) => healthResourceSegment(r.SubnetId, "virtualNetworks") }, { label: "Subnet", value: (r) => healthBasename(r.SubnetId) },
    { label: "NSG", value: (r) => healthBasename(r.NSGId) }, { label: "Accelerated", value: (r) => r.AcceleratedNetworking === true ? "Enabled" : r.AcceleratedNetworking === false ? "Disabled" : "Unknown" },
    { label: "IP forwarding", value: (r) => r.IPForwarding === true ? "Enabled" : r.IPForwarding === false ? "Disabled" : "Unknown" }
  ], nics);


  const nsgRows = view.effectiveNSGs.flatMap((item) => {
    const nsgName = healthBasename(item?.networkSecurityGroup?.id || item?.networkSecurityGroup?.Id || item?.networkSecurityGroup?.name);
    const rules = Array.isArray(item?.effectiveSecurityRules) ? item.effectiveSecurityRules : [];
    if (!rules.length) return [{ nsgName, rule: "Rules not returned", direction: "", access: "", priority: "" }];
    return rules.slice(0, 50).map((rule) => ({ nsgName, rule: rule.name || "Unknown", direction: rule.direction || "", access: rule.access || "", priority: rule.priority ?? "" }));
  });
  const nsgTable = healthBuildMiniTable([
    { label: "NSG", value: (r) => r.nsgName }, { label: "Rule", value: (r) => r.rule }, { label: "Direction", value: (r) => r.direction }, { label: "Access", value: (r) => r.access }, { label: "Priority", value: (r) => r.priority }
  ], nsgRows);

  const extensionTable = healthBuildMiniTable([
    { label: "Extension", value: (r) => r.name || "Unknown" }, { label: "Publisher", value: (r) => r.properties?.publisher || "Unknown" }, { label: "Type", value: (r) => r.properties?.type || "Unknown" },
    { label: "Version", value: (r) => r.properties?.typeHandlerVersion || "Unknown" }, { label: "Provisioning", value: (r) => r.properties?.provisioningState || "Unknown" }
  ], extensions);

  const dcrTable = healthBuildMiniTable([
    { label: "Association", value: (r) => r.name || "Unknown" }, { label: "DCR", value: (r) => healthBasename(r.properties?.dataCollectionRuleId) }, { label: "DCR Resource ID", value: (r) => r.properties?.dataCollectionRuleId || "Unknown" }
  ], monitoring.dcrs);

  const lawPerformanceTable = healthBuildMiniTable([
    { label: "Object", value: (r) => r.ObjectName || "Unknown" },
    { label: "Counter", value: (r) => r.CounterName || "Unknown" },
    { label: "Instance", value: (r) => r.InstanceName || "-" },
    { label: "Average", value: (r) => healthFormatNumber(r.Average, 2) },
    { label: "Maximum", value: (r) => healthFormatNumber(r.Maximum, 2) },
    { label: "Latest", value: (r) => healthFormatDateTime(r.LatestTime) }
  ], monitoring.lawPerformance);

  const patchRows = Object.entries(patch.counts || {}).map(([classification, count]) => ({ classification, count }));
  const patchTable = healthBuildMiniTable([{ label: "Classification", value: (r) => r.classification }, { label: "Pending", value: (r) => r.count }], patchRows);

  const alertTable = healthBuildMiniTable([
    { label: "Severity", value: (r) => r?.properties?.essentials?.severity || "Unknown" }, { label: "Alert", value: (r) => r?.name || r?.properties?.essentials?.alertRule || "Unknown" },
    { label: "Service", value: (r) => r?.properties?.essentials?.monitorService || "Unknown" }, { label: "State", value: (r) => r?.properties?.essentials?.monitorCondition || "Unknown" },
    { label: "Started", value: (r) => healthFormatDateTime(r?.properties?.essentials?.startDateTime) }
  ], view.alerts);

  const activityTable = healthBuildMiniTable([
    { label: "Time", value: (r) => healthFormatDateTime(r?.eventTimestamp) }, { label: "Operation", value: (r) => r?.operationName?.localizedValue || r?.operationName?.value || "Unknown" },
    { label: "Status", value: (r) => r?.status?.localizedValue || r?.status?.value || "Unknown" }, { label: "Level", value: (r) => r?.level || "Unknown" },
    { label: "Caller", value: (r) => r?.caller || r?.claims?.name || r?.claims?.upn || "Not reported" }
  ], view.activity);

  const resourceHistoryTable = healthBuildMiniTable([
    { label: "Reported", value: (r) => healthFormatDateTime(r?.properties?.reportedTime || r?.properties?.occuredTime) }, { label: "State", value: (r) => r?.properties?.availabilityState || "Unknown" },
    { label: "Context", value: (r) => r?.properties?.context || "Unknown" }, { label: "Reason", value: (r) => r?.properties?.reasonType || r?.properties?.category || "Unknown" },
    { label: "Summary", value: (r) => r?.properties?.summary || r?.properties?.title || "" }
  ], view.resourceHistory);
  const windowsEventTable = healthBuildMiniTable([
    { label: "Level", value: (r) => r.level },
    { label: "Log", value: (r) => r.eventLog },
    { label: "Event ID", value: (r) => r.eventId },
    { label: "Source", value: (r) => r.source },
    { label: "Occurrences", value: (r) => r.occurrences },
    { label: "First seen", value: (r) => healthFormatDateTime(r.firstSeen) },
    { label: "Last seen", value: (r) => healthFormatDateTime(r.lastSeen) },
    { label: "Message", value: (r) => healthShortText(r.message, 320) }
  ], windowsEvents);

  const rh = result?.resourceHealth?.properties || {};
  const rhRecommended = Array.isArray(rh.recommendedActions) ? rh.recommendedActions : [];
  const rhRecommendedHtml = rhRecommended.length
    ? `<ol class="health-recommendations">${rhRecommended.map((a) => `<li>${escapeHtml(a?.action || a?.actionUrlText || a?.actionUrl || a?.message || JSON.stringify(a))}</li>`).join("")}</ol>`
    : '<div class="health-empty">No Azure Resource Health recommended actions were returned.</div>';

  const freshnessTable = healthBuildMiniTable([
    { label: "Data source", value: (r) => r.name }, { label: "Latest data", value: (r) => healthFormatDateTime(r.utc) }, { label: "Age", value: (r) => healthAgeText(r.utc) }
  ], view.freshness.rows);

  const diskPerfRows = [
    ["OS disk IOPS consumed", runtimeMetric(view.platform.osDiskIopsPct.average)], ["OS disk bandwidth consumed", runtimeMetric(view.platform.osDiskBandwidthPct.average)],
    ["OS disk latency", running ? (view.platform.osDiskLatency.average === null ? "Unknown" : `${view.platform.osDiskLatency.average.toFixed(1)} ms`) : "N/A – VM not running"],
    ["Data disk max IOPS consumed", runtimeMetric(view.platform.dataDiskIopsPct.maximum)], ["Data disk max bandwidth consumed", runtimeMetric(view.platform.dataDiskBandwidthPct.maximum)],
    ["Data disk max latency", running ? (view.platform.dataDiskLatency.maximum === null ? "Unknown" : `${view.platform.dataDiskLatency.maximum.toFixed(1)} ms`) : "N/A – VM not running"],
    ["Disk read IOPS avg", running ? healthFormatNumber(view.platform.diskReadIops.average) : "N/A – VM not running"], ["Disk write IOPS avg", running ? healthFormatNumber(view.platform.diskWriteIops.average) : "N/A – VM not running"],
    ["Disk read bytes", running ? healthFormatBytes(view.platform.diskReadBytes.total) : "N/A – VM not running"], ["Disk write bytes", running ? healthFormatBytes(view.platform.diskWriteBytes.total) : "N/A – VM not running"]
  ];
  const diskPerfTable = `<div class="table-wrap"><table class="health-mini-table"><tbody>${diskPerfRows.map(([k,v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join("")}</tbody></table></div>`;

  const backupRows = [
    ["Protection", backup.protected], ["Vault", healthBasename(backup.vaultId)], ["Policy", backup.policyName], ["Protection state", backup.protectionState], ["Item health", backup.healthStatus],
    ["Last backup status", backup.lastBackupStatus], ["Last backup", healthFormatDateTime(backup.lastBackupTime)], ["Last backup age", healthAgeText(backup.lastBackupTime)],
    ["Latest recovery point", healthFormatDateTime(backup.lastRecoveryPoint)]
  ];
  const backupTable = `<div class="table-wrap"><table class="health-mini-table"><tbody>${backupRows.map(([k,v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join("")}</tbody></table></div>`;

  return `
    <article class="health-vm-card">
      <div class="health-vm-header"><div><h3>${escapeHtml(result?.hostname || vm.VMName || "VM")}</h3><div class="health-vm-subtitle">${escapeHtml(vm.SubscriptionName || "Unknown subscription")} • ${escapeHtml(vm.ResourceGroup || "Unknown resource group")} • ${escapeHtml(vm.Location || "Unknown region")}</div></div><span class="health-status-pill ${healthBadgeClass(view.overall)}">${escapeHtml(view.overall)}</span></div>

      <div class="health-chip-grid">
        <div class="health-chip"><span class="health-chip-label">Power</span><span class="health-chip-value">${escapeHtml(view.powerState)}</span></div>
        <div class="health-chip"><span class="health-chip-label">Resource Health</span><span class="health-chip-value">${escapeHtml(view.resourceHealth)}</span></div>
        <div class="health-chip"><span class="health-chip-label">Active alerts</span><span class="health-chip-value">${escapeHtml(view.alerts.length)}</span></div>
        <div class="health-chip"><span class="health-chip-label">CPU avg / max</span><span class="health-chip-value">${escapeHtml(runtimeMetric(view.platform.cpu.average))} / ${escapeHtml(runtimeMetric(view.platform.cpu.maximum))}</span>${computeSummary ? `<span class="health-kpi-note">${escapeHtml(computeSummary)}</span>` : ""}</div>
        <div class="health-chip"><span class="health-chip-label">Memory available</span><span class="health-chip-value">${escapeHtml(memoryDisplay)}</span></div>
        <div class="health-chip health-disk-kpi">
          <span class="health-chip-label">${escapeHtml(diskCardLabel)}</span>
          <div class="health-disk-headline">
            <span class="health-chip-value">${escapeHtml(diskHeadline)}</span>
            <span class="health-disk-lowest">${escapeHtml(diskHeadlineNote)}</span>
          </div>
          ${diskDrivePillsHtml}
          ${diskSystemNoteHtml}
        </div>
        <div class="health-chip"><span class="health-chip-label">Network in / out</span><span class="health-chip-value">${escapeHtml(running ? healthFormatBytes(view.platform.networkIn.total) : "N/A")} / ${escapeHtml(running ? healthFormatBytes(view.platform.networkOut.total) : "N/A")}</span></div>
        <div class="health-chip"><span class="health-chip-label">Azure Backup</span><span class="health-chip-value">${escapeHtml(backup.protected)}</span><span class="health-kpi-note">${escapeHtml(backup.lastBackupStatus)} • ${escapeHtml(healthAgeText(backup.lastBackupTime))}</span></div>
        <div class="health-chip"><span class="health-chip-label">Patch assessment</span><span class="health-chip-value">${escapeHtml(patchDisplay)}</span><span class="health-kpi-note">${escapeHtml(healthAgeText(patch.lastAssessmentUtc))}</span></div>
        <div class="health-chip"><span class="health-chip-label">Monitoring</span><span class="health-chip-value">${escapeHtml(monitorDisplay)}</span><span class="health-kpi-note">${escapeHtml(monitoring.regionalLawName)} • Heartbeat: ${escapeHtml(monitoring.heartbeatState)}</span></div>
        <div class="health-chip"><span class="health-chip-label">Data freshness</span><span class="health-chip-value">${escapeHtml(view.freshness.state)}</span></div>
        <div class="health-chip">
          <span class="health-chip-label">Windows events</span>
          <span class="health-chip-value">${escapeHtml(`${windowsEventSummary.uniqueTotal} unique`)}</span>
          <span class="health-kpi-note">${escapeHtml(`${windowsEventSummary.criticalUnique24h} Critical • ${windowsEventSummary.errorUnique24h} Error • ${windowsEventSummary.totalOccurrences} occurrence${windowsEventSummary.totalOccurrences === 1 ? "" : "s"}`)}${windowsEventSummary.lastCriticalUtc ? ` • Last Critical ${escapeHtml(healthAgeText(windowsEventSummary.lastCriticalUtc))}` : ""}</span>
        </div>
        <div class="health-chip"><span class="health-chip-label">Boot diagnostics</span><span class="health-chip-value">${escapeHtml(vm.BootDiagnosticsEnabled === true ? "Enabled" : vm.BootDiagnosticsEnabled === false ? "Disabled" : "Unknown")}</span></div>
      </div>

      <div class="health-action-bar">
        <button type="button" class="secondary" data-health-action="copy" data-health-index="${index}">Copy for incident</button>
        <button type="button" class="secondary" data-health-action="pdf" data-health-index="${index}">Download PDF</button>
        <button type="button" class="secondary" data-health-action="json" data-health-index="${index}">Download JSON</button>
        <button type="button" class="secondary" data-health-action="csv" data-health-index="${index}">Export CSV</button>
        <button type="button" class="secondary" data-health-action="azure" data-health-index="${index}">Open VM in Azure</button>
      </div>

      <div class="health-findings"><h4>Findings</h4>${findingsHtml}</div>
      ${!running
        ? '<div class="health-note">Performance, guest memory and logical-disk utilization are shown as N/A while the VM is not running. Zero is not used as a substitute for unavailable telemetry.</div>'
        : !guest.dataAvailable
          ? '<div class="health-note">Guest memory and logical-disk values are Unknown because neither InsightsMetrics nor the required Perf counters were returned from the effective Log Analytics workspace.</div>'
          : guest.onlyOverallDiskAvailable
            ? '<div class="health-note"><strong>Disk scope:</strong> LAW currently returns only LogicalDisk(_Total). The overall free-space value is shown, but individual drive letters require per-drive counters such as \\LogicalDisk(*)\\% Free Space to be collected by the VM DCR.</div>'
            : ""}

      <div class="health-details">
        <details><summary>VM configuration &amp; runtime</summary><div class="health-details-body">${healthBuildConfiguration(result, view)}</div></details>
        <details><summary>Performance</summary><div class="health-details-body"><div class="health-metric-grid"><div class="health-metric-box"><span>CPU average</span><strong>${escapeHtml(runtimeMetric(view.platform.cpu.average))}</strong></div><div class="health-metric-box"><span>CPU maximum</span><strong>${escapeHtml(runtimeMetric(view.platform.cpu.maximum))}</strong></div><div class="health-metric-box"><span>Metric latest</span><strong>${escapeHtml(healthFormatDateTime(view.platform.cpu.latestUtc))}</strong></div><div class="health-metric-box"><span>Network in</span><strong>${escapeHtml(running ? healthFormatBytes(view.platform.networkIn.total) : "N/A")}</strong></div><div class="health-metric-box"><span>Network out</span><strong>${escapeHtml(running ? healthFormatBytes(view.platform.networkOut.total) : "N/A")}</strong></div><div class="health-metric-box"><span>Period</span><strong>${escapeHtml(`${result?.periodMinutes || ""} min`)}</strong></div></div>${freshnessTable}</div></details>
        <details><summary>Storage &amp; disk performance</summary><div class="health-details-body"><h4 class="health-section-heading">Azure managed disks</h4>${managedDiskTable}<h4 class="health-section-heading">Guest logical disks</h4>${guestDiskTable}<h4 class="health-section-heading">Platform disk performance</h4>${diskPerfTable}</div></details>
        <details><summary>Network &amp; security configuration</summary><div class="health-details-body"><h4 class="health-section-heading">NIC configuration</h4>${networkTable}<h4 class="health-section-heading">Effective network security groups</h4>${nsgTable}</div></details>
        <details><summary>Azure alerts &amp; recent changes</summary><div class="health-details-body"><h4 class="health-section-heading">Active fired alerts</h4>${alertTable}<h4 class="health-section-heading">Azure Activity Log - last 24 hours</h4>${activityTable}</div></details>
        <details><summary>Resource Health history</summary><div class="health-details-body"><p class="field-help">Current summary: <strong>${escapeHtml(rh.summary || rh.title || view.resourceHealth)}</strong> • Context: <strong>${escapeHtml(rh.context || "Unknown")}</strong> • Reason: <strong>${escapeHtml(rh.reasonType || rh.category || "Unknown")}</strong> • Reported: <strong>${escapeHtml(healthFormatDateTime(rh.reportedTime))}</strong>${rh.resolutionETA ? ` • Resolution ETA: <strong>${escapeHtml(healthFormatDateTime(rh.resolutionETA))}</strong>` : ""}</p><h4 class="health-section-heading">Azure recommended actions</h4>${rhRecommendedHtml}<h4 class="health-section-heading">Availability history</h4>${resourceHistoryTable}</div></details>
        <details><summary>Windows Event Viewer</summary><div class="health-details-body">
          <p class="field-help">Effective LAW: <strong>${escapeHtml(monitoring.regionalLawName)}</strong> • Last 24 hours • Unique event types: <strong>${escapeHtml(windowsEventSummary.uniqueTotal)}</strong> • Critical: <strong>${escapeHtml(windowsEventSummary.criticalUnique24h)}</strong> • Error: <strong>${escapeHtml(windowsEventSummary.errorUnique24h)}</strong> • Total occurrences: <strong>${escapeHtml(windowsEventSummary.totalOccurrences)}</strong>${windowsEventSummary.lastCriticalUtc ? ` • Last Critical: <strong>${escapeHtml(healthFormatDateTime(windowsEventSummary.lastCriticalUtc))}</strong> (${escapeHtml(healthAgeText(windowsEventSummary.lastCriticalUtc))})` : ""}</p>
          <p class="health-inline-note">Repeated Event Viewer records are grouped by Level + Log + Event ID + Source. A unique Critical event type seen inside the selected diagnostic period can raise VM Health to Critical. Error event types are displayed for investigation but do not automatically change overall VM status.</p>
          ${windowsEventTable}
        </div></details>
        <details><summary>VM extensions</summary><div class="health-details-body">${extensionTable}</div></details>
        <details><summary>Monitoring / Regional LAW / AMA / DCR</summary><div class="health-details-body"><p class="field-help">Effective LAW: <strong>${escapeHtml(monitoring.regionalLawName)}</strong>${monitoring.regionalLawFallbackUsed ? ` • <strong>Fallback used</strong>: ${escapeHtml(monitoring.regionalLawPrimaryName || "central-law-weu-law")} → ${escapeHtml(monitoring.regionalLawFallbackName || monitoring.regionalLawName)}` : ` • Primary LAW used: <strong>${escapeHtml(monitoring.regionalLawPrimaryName || monitoring.regionalLawName)}</strong>`}${monitoring.regionalLawLocation ? ` • LAW region: <strong>${escapeHtml(monitoring.regionalLawLocation)}</strong>` : ""}${monitoring.regionalLawResourceGroup ? ` • LAW RG: <strong>${escapeHtml(monitoring.regionalLawResourceGroup)}</strong>` : ""} • LAW lookup: <strong>${escapeHtml(monitoring.regionalLawLookupStatus)}</strong> • Workspace ID: <strong>${escapeHtml(monitoring.regionalLawWorkspaceId || "Unknown")}</strong> • AMA: <strong>${escapeHtml(monitoring.amaInstalled ? monitoring.amaProvisioningState : "Not detected")}</strong> • DCR associations: <strong>${escapeHtml(monitoring.dcrCount)}</strong> • VM Insights data: <strong>${escapeHtml(monitoring.vmInsightsDataAvailable ? "Available" : "Unknown")}</strong> • Last heartbeat: <strong>${escapeHtml(healthFormatDateTime(monitoring.heartbeatUtc))}</strong> (${escapeHtml(healthAgeText(monitoring.heartbeatUtc))})</p>${monitoring.regionalLawFallbackUsed ? `<p class="health-inline-note"><strong>Last-resort LAW fallback was used.</strong> No Heartbeat, InsightsMetrics or Perf rows matching this VM were returned from the primary regional LAW.</p>` : ""}<h4 class="health-section-heading">LAW query diagnostics</h4><div class="health-table-wrap"><table class="health-table"><thead><tr><th>Source</th><th>Query</th><th>Logic App status</th><th>HTTP</th><th>Error</th></tr></thead><tbody>${monitoring.regionalLawFallbackUsed ? `<tr><td>Primary</td><td>Heartbeat</td><td>${escapeHtml(monitoring.lawDiagnostics?.primaryHeartbeatStatus || "Unknown")}</td><td>${escapeHtml(monitoring.lawDiagnostics?.primaryHeartbeatHttpStatus || "-")}</td><td>-</td></tr><tr><td>Primary</td><td>Guest metrics</td><td>${escapeHtml(monitoring.lawDiagnostics?.primaryGuestStatus || "Unknown")}</td><td>${escapeHtml(monitoring.lawDiagnostics?.primaryGuestHttpStatus || "-")}</td><td>-</td></tr><tr><td>Primary</td><td>LAW performance</td><td>${escapeHtml(monitoring.lawDiagnostics?.primaryPerformanceStatus || "Unknown")}</td><td>${escapeHtml(monitoring.lawDiagnostics?.primaryPerformanceHttpStatus || "-")}</td><td>-</td></tr><tr><td>Primary</td><td>Windows events</td><td>${escapeHtml(monitoring.lawDiagnostics?.primaryWindowsEventStatus || "Unknown")}</td><td>${escapeHtml(monitoring.lawDiagnostics?.primaryWindowsEventHttpStatus || "-")}</td><td>-</td></tr>` : ""}<tr><td>${escapeHtml(monitoring.regionalLawFallbackUsed ? "Fallback" : "Primary")}</td><td>Heartbeat</td><td>${escapeHtml(monitoring.lawDiagnostics?.heartbeatStatus || "Unknown")}</td><td>${escapeHtml(monitoring.lawDiagnostics?.heartbeatHttpStatus || "-")}</td><td>${escapeHtml(monitoring.lawDiagnostics?.heartbeatErrorCode || monitoring.lawDiagnostics?.heartbeatErrorMessage || "-")}</td></tr><tr><td>${escapeHtml(monitoring.regionalLawFallbackUsed ? "Fallback" : "Primary")}</td><td>Guest metrics</td><td>${escapeHtml(monitoring.lawDiagnostics?.guestStatus || "Unknown")}</td><td>${escapeHtml(monitoring.lawDiagnostics?.guestHttpStatus || "-")}</td><td>${escapeHtml(monitoring.lawDiagnostics?.guestErrorCode || monitoring.lawDiagnostics?.guestErrorMessage || "-")}</td></tr><tr><td>${escapeHtml(monitoring.regionalLawFallbackUsed ? "Fallback" : "Primary")}</td><td>LAW performance</td><td>${escapeHtml(monitoring.lawDiagnostics?.performanceStatus || "Unknown")}</td><td>${escapeHtml(monitoring.lawDiagnostics?.performanceHttpStatus || "-")}</td><td>${escapeHtml(monitoring.lawDiagnostics?.performanceErrorCode || monitoring.lawDiagnostics?.performanceErrorMessage || "-")}</td></tr><tr><td>${escapeHtml(monitoring.regionalLawFallbackUsed ? "Fallback" : "Primary")}</td><td>Windows events</td><td>${escapeHtml(monitoring.lawDiagnostics?.windowsEventStatus || "Unknown")}</td><td>${escapeHtml(monitoring.lawDiagnostics?.windowsEventHttpStatus || "-")}</td><td>${escapeHtml(monitoring.lawDiagnostics?.windowsEventErrorCode || monitoring.lawDiagnostics?.windowsEventErrorMessage || "-")}</td></tr></tbody></table></div><h4 class="health-section-heading">DCR associations</h4>${dcrTable}<h4 class="health-section-heading">LAW performance counters (when collected)</h4>${lawPerformanceTable}</div></details>
        <details><summary>Backup &amp; patching</summary><div class="health-details-body"><h4 class="health-section-heading">Azure Backup</h4>${backupTable}<h4 class="health-section-heading">Update Manager</h4><p class="field-help">Assessment: <strong>${escapeHtml(healthFormatDateTime(patch.lastAssessmentUtc))}</strong> (${escapeHtml(healthAgeText(patch.lastAssessmentUtc))}) • Reboot pending: <strong>${escapeHtml(patch.rebootPending === null ? "Unknown" : String(patch.rebootPending))}</strong></p>${patchTable}</div></details>
        <details><summary>Boot diagnostics</summary><div class="health-details-body"><p class="field-help">Boot diagnostics configuration: <strong>${escapeHtml(vm.BootDiagnosticsEnabled === true ? "Enabled" : vm.BootDiagnosticsEnabled === false ? "Disabled" : "Unknown")}</strong>.</p><p class="health-inline-note">For security, this report does not return temporary screenshot/serial-log SAS URLs. Use <strong>Open VM in Azure</strong> and the Boot diagnostics blade when detailed boot artifacts are needed.</p></div></details>
        <details><summary>Recommendations</summary><div class="health-details-body"><ol class="health-recommendations">${view.recommendations.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ol></div></details>
      </div>
    </article>`;
}

function renderHealthStatus(result) {
  healthResultArea.hidden = false;
  const requestStatus = String(result?.status || "Unknown");
  const terminal = ["Completed", "PartiallyCompleted", "Failed"].includes(requestStatus);
  if (!terminal) {
    healthResultArea.innerHTML = `<div class="status-banner status-warning"><h2>VM health diagnostic ${escapeHtml(requestStatus.toLowerCase())}</h2><p>${escapeHtml(result?.message || "The read-only diagnostic is still running.")}</p><div class="health-request-meta"><span><strong>Request ID:</strong> ${escapeHtml(result?.requestId || currentHealthRequestId || "")}</span><span><strong>VMs:</strong> ${escapeHtml(result?.submittedCount ?? "")}</span><span><strong>Period:</strong> ${escapeHtml(result?.periodMinutes ?? "")} minutes</span></div></div>`;
    return;
  }

  const results = Array.isArray(result?.results) ? result.results : [];
  const views = results.map((item) => deriveVmHealth(item));
  const collectionFailedCount = results.filter((item) => String(item?.status || "") === "Failed").length;
  const healthyCount = views.filter((view, index) => results[index]?.status !== "Failed" && view.overall === "Healthy").length;
  const warningCount = views.filter((view, index) => results[index]?.status !== "Failed" && view.overall === "Warning").length;
  const criticalCount = views.filter((view, index) => results[index]?.status !== "Failed" && view.overall === "Critical").length;

  healthResultArea.innerHTML = `
    <div class="status-banner ${healthStatusBannerClass(requestStatus)}"><h2>VM health diagnostic ${escapeHtml(requestStatus)}</h2><p>${escapeHtml(result?.message || "The diagnostic completed.")}</p><div class="health-request-meta"><span><strong>Request ID:</strong> ${escapeHtml(result?.requestId || "")}</span><span><strong>Submitted:</strong> ${escapeHtml(result?.submittedCount ?? results.length)}</span><span><strong>Period:</strong> ${escapeHtml(result?.periodMinutes ?? "")} minutes</span></div></div>
    <div class="health-overview-grid"><div class="health-overview-item"><span>Healthy</span><strong>${healthyCount}</strong></div><div class="health-overview-item"><span>Warning</span><strong>${warningCount}</strong></div><div class="health-overview-item"><span>Critical</span><strong>${criticalCount}</strong></div><div class="health-overview-item"><span>Collection failed</span><strong>${collectionFailedCount}</strong></div></div>
    ${results.length ? results.map((item, index) => healthBuildVmCard(item, index)).join("") : '<div class="health-empty">No VM result records were returned.</div>'}`;

  healthResultArea.querySelectorAll("[data-health-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const index = Number(button.dataset.healthIndex);
      const item = results[index];
      if (!item) return;
      const action = button.dataset.healthAction;
      if (action === "copy") {
        await navigator.clipboard.writeText(healthCopyText(item));
        const old = button.textContent; button.textContent = "Copied"; window.setTimeout(() => { button.textContent = old; }, 1500);
      } else if (action === "pdf") {
        healthDownloadPdfReport(item);
      } else if (action === "json") {
        healthDownloadFile(`vm-health-${String(item.hostname || "vm").toLowerCase()}.json`, JSON.stringify(item, null, 2), "application/json");
      } else if (action === "csv") {
        const v = deriveVmHealth(item);
        const rows = [
          ["VM", item.hostname || item?.vm?.VMName || ""], ["Overall", v.overall], ["Power", v.powerState], ["Resource Health", v.resourceHealth], ["Active alerts", v.alerts.length],
          ["CPU average", healthIsRunning(v.powerState) ? healthFormatPercent(v.platform.cpu.average) : "N/A"], ["CPU maximum", healthIsRunning(v.powerState) ? healthFormatPercent(v.platform.cpu.maximum) : "N/A"],
          ["vCPUs", healthFiniteNumber(item?.hardware?.vCpuCount) === null ? "Unknown" : healthFormatNumber(item.hardware.vCpuCount, 0)],
          ["RAM GB", healthFiniteNumber(item?.hardware?.memoryMB) === null ? "Unknown" : healthFormatNumber(item.hardware.memoryMB / 1024, 1)],
          ["Windows unique event types (24h)", v.windowsEventSummary.uniqueTotal],
          ["Windows unique Critical event types (24h)", v.windowsEventSummary.criticalUnique24h],
          ["Windows unique Error event types (24h)", v.windowsEventSummary.errorUnique24h],
          ["Windows event occurrences (24h)", v.windowsEventSummary.totalOccurrences],
          ["Memory available", healthIsRunning(v.powerState) ? healthFormatPercent(v.guest.availableMemoryPercent) : "N/A"], ["Lowest disk free", healthIsRunning(v.powerState) ? healthFormatPercent(v.guest.lowestDiskFreePercent) : "N/A"],
          ["Backup protection", v.backup.protected], ["Last backup status", v.backup.lastBackupStatus], ["Last backup", v.backup.lastBackupTime || "Unknown"], ["Patch pending", v.patch.available ? v.patch.totalPending : "Unknown"], ["Regional LAW", v.monitoring.regionalLawName], ["Heartbeat", v.monitoring.heartbeatState]
        ];
        const csv = ["Field,Value", ...rows.map(([a,b]) => `"${String(a).replaceAll('"','""')}","${String(b).replaceAll('"','""')}"`)].join("\r\n");
        healthDownloadFile(`vm-health-${String(item.hostname || "vm").toLowerCase()}.csv`, csv, "text/csv;charset=utf-8");
      } else if (action === "azure") {
        window.open(healthVmPortalUrl(item), "_blank", "noopener,noreferrer");
      }
    });
  });
}

function stopHealthStatusPolling(clearStoredRequest = false) {
  if (healthStatusPollTimer) {
    clearTimeout(healthStatusPollTimer);
    healthStatusPollTimer = null;
  }

  healthStatusPollCount = 0;

  if (clearStoredRequest) {
    currentHealthRequestId = null;
    try {
      sessionStorage.removeItem("activeHealthRequestId");
    } catch {
      // Continue when browser storage is unavailable.
    }
  }
}

async function pollHealthStatus(requestId) {
  try {
    const response = await portalFetch(
      `/api/getHealthDiagnosticStatus?requestId=${encodeURIComponent(requestId)}`,
      { headers: { Accept: "application/json" }, cache: "no-store" }
    );

    const text = await response.text();
    let result;

    try {
      result = text ? JSON.parse(text) : {};
    } catch {
      result = { success: false, status: "Failed", message: text || "The API returned an invalid response." };
    }

    if (response.status === 401) {
      window.location.assign("/");
      return;
    }

    if (!response.ok) {
      throw new Error(result?.message || `Status check failed with HTTP ${response.status}.`);
    }

    renderHealthStatus(result);

    if (["Completed", "PartiallyCompleted", "Failed"].includes(result.status)) {
      stopHealthStatusPolling(true);
      healthSubmitButton.disabled = false;
      healthSubmitButton.textContent = "Run VM health diagnostic";
      return;
    }
  } catch (error) {
    healthValidationMessage.textContent =
      `Health status refresh failed: ${error.message}`;
  }

  healthStatusPollCount += 1;

  if (healthStatusPollCount >= HEALTH_STATUS_MAX_POLLS) {
    stopHealthStatusPolling(false);
    healthValidationMessage.textContent =
      "Automatic health status refresh stopped after 10 minutes. Keep the Request ID and refresh the page to resume polling.";
    healthSubmitButton.disabled = false;
    healthSubmitButton.textContent = "Run VM health diagnostic";
    return;
  }

  healthStatusPollTimer = window.setTimeout(
    () => pollHealthStatus(requestId),
    HEALTH_STATUS_POLL_INTERVAL_MS
  );
}

function startHealthStatusPolling(requestId) {
  stopHealthStatusPolling(false);
  currentHealthRequestId = requestId;

  try {
    sessionStorage.setItem("activeHealthRequestId", requestId);
  } catch {
    // Continue when browser storage is unavailable.
  }

  healthStatusPollCount = 0;
  pollHealthStatus(requestId);
}

healthTabButton.addEventListener("click", () => {
  activateOperationTab("health");
});

healthHostnamesInput.addEventListener(
  "input",
  updateHealthHostnameCount
);

healthClearButton.addEventListener("click", () => {
  stopHealthStatusPolling(true);
  healthForm.reset();
  healthValidationMessage.textContent = "";
  healthResultArea.hidden = true;
  healthResultArea.innerHTML = "";
  updateHealthHostnameCount();

  if (manualRequester) {
    healthSubmitButton.disabled = false;
    healthSubmitButton.textContent = "Run VM health diagnostic";
  }
});

healthForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  healthValidationMessage.textContent = "";

  const payload = {
    hostnames: parseHostnames(healthHostnamesInput.value),
    periodMinutes: Number(healthPeriodMinutes.value)
  };

  const validationError = validateHealthForm(payload);

  if (validationError) {
    healthValidationMessage.textContent = validationError;
    return;
  }

  stopHealthStatusPolling(true);
  healthSubmitButton.disabled = true;
  healthSubmitButton.textContent = "Starting diagnostic…";
  healthResultArea.hidden = false;
  healthResultArea.innerHTML = `
    <div class="status-banner status-warning">
      <strong>Starting VM Health Diagnostic</strong>
      <span>Azure read-only checks are being submitted for ${escapeHtml(payload.hostnames.length)} VM(s).</span>
    </div>
  `;

  try {
    const response = await portalFetch("/api/submitHealthDiagnostic", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    let result;

    try {
      result = text ? JSON.parse(text) : {};
    } catch {
      result = {
        success: false,
        status: "Failed",
        message: text || "The API returned an invalid response."
      };
    }

    if (response.status === 401) {
      window.location.assign("/");
      return;
    }

    if (!response.ok) {
      throw new Error(
        result?.message ||
        `Health diagnostic submission failed with HTTP ${response.status}.`
      );
    }

    renderHealthStatus(result);
    startHealthStatusPolling(result.requestId);
  } catch (error) {
    healthResultArea.hidden = false;
    healthResultArea.innerHTML = `
      <div class="status-banner status-error">
        <strong>VM Health Diagnostic could not be started</strong>
        <span>${escapeHtml(error.message)}</span>
      </div>
    `;
    healthSubmitButton.disabled = false;
    healthSubmitButton.textContent = "Run VM health diagnostic";
  }
});

suppressionTabButton.addEventListener("click", () => {
  activateOperationTab("suppression");
});

backupTabButton.addEventListener("click", () => {
  activateOperationTab("backup");

  loadMyBackupRequests(
    false
  );
});


backupHostnamesInput.addEventListener(
  "input",
  () => {
    updateBackupHostnameCount();
    resetBackupPrecheck(true);
  }
);

backupCheckButton.addEventListener(
  "click",
  checkBackupStatusBeforeSubmit
);

backupHistoryRefreshButton.addEventListener(
  "click",
  () =>
    loadMyBackupRequests(
      true
    )
);

backupClearButton.addEventListener("click", () => {
  stopBackupStatusPolling(true);
  backupForm.reset();
  backupValidationMessage.textContent = "";
  backupResultArea.hidden = true;
  backupResultArea.innerHTML = "";
  resetBackupPrecheck(true);
  updateBackupHostnameCount();
});

backupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  backupValidationMessage.textContent = "";
  backupResultArea.hidden = true;

  const payload = {
    hostnames:
      parseHostnames(
        backupHostnamesInput.value
      ),
    changeNumber:
      document
        .getElementById(
          "backupChangeNumber"
        )
        .value.trim(),
    reason:
      document
        .getElementById(
          "backupReason"
        )
        .value.trim()
  };

  const validationError =
    validateBackupForm(payload);

  if (validationError) {
    backupValidationMessage
      .textContent =
      validationError;
    return;
  }

  backupSubmitButton.disabled =
    true;

  backupSubmitButton.textContent =
    "Submitting backup request…";

  try {
    const response =
      await portalFetch(
        "/api/submitBackup",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Accept:
              "application/json"
          },
          body:
            JSON.stringify(
              payload
            )
        }
      );

    const text =
      await response.text();

    let result;

    try {
      result =
        text
          ? JSON.parse(text)
          : {};
    } catch {
      result = {
        success: false,
        status: "Failed",
        message:
          text ||
          "The API returned an invalid response."
      };
    }

    if (
      response.status === 401
    ) {
      window.location.assign("/");
      return;
    }

    showBackupResult(
      result,
      response.status
    );
  } catch (error) {
    showBackupResult(
      {
        success: false,
        status: "Failed",
        message:
          `The VM backup request could not be submitted: ${error.message}`
      },
      0
    );
  } finally {
    resetBackupPrecheck(false);

    backupSubmitButton.disabled = true;
    backupSubmitButton.textContent =
      "Check backup status again";
  }
});


snapshotHistoryRefreshButton.addEventListener(
  "click",
  () => {
    loadMySnapshotRequests(
      true
    );
  }
);

snapshotTabButton.addEventListener("click", () => {
  activateOperationTab("snapshot");
});

snapshotHostnamesInput.addEventListener(
  "input",
  updateSnapshotHostnameCount
);

snapshotRetentionDays.addEventListener(
  "change",
  updateSnapshotExpiryPreview
);

snapshotClearButton.addEventListener("click", () => {
  stopSnapshotStatusPolling(true);
  snapshotForm.reset();
  snapshotValidationMessage.textContent = "";
  snapshotResultArea.hidden = true;
  snapshotResultArea.innerHTML = "";
  updateSnapshotHostnameCount();
  updateSnapshotExpiryPreview();
});

snapshotForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  snapshotValidationMessage.textContent = "";
  snapshotResultArea.hidden = true;

  const payload = {
    hostnames: parseHostnames(snapshotHostnamesInput.value),
    snapshotScope:
      document.getElementById("snapshotScope").value,
    retentionDays:
      Number(snapshotRetentionDays.value),
    changeNumber:
      document
        .getElementById("snapshotChangeNumber")
        .value.trim(),
    reason:
      document
        .getElementById("snapshotReason")
        .value.trim()
  };

  const validationError =
    validateSnapshotForm(payload);

  if (validationError) {
    snapshotValidationMessage.textContent =
      validationError;
    return;
  }

  snapshotSubmitButton.disabled = true;
  snapshotSubmitButton.textContent =
    "Submitting snapshot request…";

  try {
    const response = await portalFetch(
      "/api/submitSnapshot",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    const text = await response.text();
    let result;

    try {
      result = text ? JSON.parse(text) : {};
    } catch {
      result = {
        success: false,
        status: "Failed",
        message:
          text ||
          "The API returned an invalid response."
      };
    }

    if (response.status === 401) {
      window.location.assign("/");
      return;
    }

    showSnapshotResult(result, response.status);
  } catch (error) {
    showSnapshotResult(
      {
        success: false,
        status: "Failed",
        message:
          `The snapshot request could not be submitted: ${error.message}`
      },
      0
    );
  } finally {
    snapshotSubmitButton.disabled = false;
    snapshotSubmitButton.textContent =
      "Create VM snapshots";
  }
});

hostnamesInput.addEventListener("input", updateHostnameCount);

clearButton.addEventListener("click", () => {
  form.reset();
  document.getElementById("timeZone").value = FIXED_TIME_ZONE;
  validationMessage.textContent = "";
  resultArea.hidden = true;
  resultArea.innerHTML = "";
  updateHostnameCount();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  validationMessage.textContent = "";
  resultArea.hidden = true;

  const payload = {
    hostnames: parseHostnames(hostnamesInput.value),
    startDateTime: document.getElementById("startDateTime").value,
    endDateTime: document.getElementById("endDateTime").value,
    timeZone: document.getElementById("timeZone").value,
    changeNumber: document.getElementById("changeNumber").value.trim(),
    reason: document.getElementById("reason").value.trim()
  };

  const validationError = validateForm(payload);

  if (validationError) {
    validationMessage.textContent = validationError;
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Processing VMs…";

  try {
    const response = await portalFetch("/api/submitSuppression", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    let result;

    try {
      result = text ? JSON.parse(text) : {};
    } catch {
      result = {
        success: false,
        status: "Failed",
        message: text || "The API returned an invalid response."
      };
    }

    if (response.status === 401) {
      window.location.assign("/");
      return;
    }

    showResult(result, response.status);
  } catch (error) {
    showResult(
      {
        success: false,
        status: "Failed",
        message: `The request could not be submitted: ${error.message}`
      },
      0
    );
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Submit suppression request";
  }
});

loadManualRequester()
  .then(() => {

    loadMySnapshotRequests(
      false
    );

    loadMyBackupRequests(
      false
    );
  })
  .catch((error) => {
  console.error(error);

  authenticatedUserName.textContent =
    "Unable to load requester user name";
  authenticatedProvider.textContent = error.message;

  identityStatus.textContent = "User name error";
  identityStatus.classList.remove("verified");
  identityStatus.classList.add("error");

  validationMessage.textContent =
    "Requester user name is unavailable. Return to the start page and enter it again.";

    submitButton.disabled = true;
    submitButton.textContent = "User name required";

    snapshotSubmitButton.disabled = true;
    snapshotSubmitButton.textContent =
      "User name required";

    backupCheckButton.disabled = true;
    backupCheckButton.textContent =
      "User name required";

    backupSubmitButton.disabled = true;
    backupSubmitButton.textContent =
      "User name required";

    healthSubmitButton.disabled = true;
    healthSubmitButton.textContent =
      "User name required";
  });

updateHostnameCount();
updateSnapshotHostnameCount();
updateSnapshotExpiryPreview();
updateBackupHostnameCount();
updateHealthHostnameCount();

try {
  const storedSnapshotRequestId =
    sessionStorage.getItem(
      "activeSnapshotRequestId"
    );

  if (storedSnapshotRequestId) {
    startSnapshotStatusPolling(
      storedSnapshotRequestId
    );
  }
} catch {
  // Continue without browser session storage.
}

try {
  const storedBackupRequestId =
    localStorage.getItem(
      "activeBackupRequestId"
    );

  if (storedBackupRequestId) {
    startBackupStatusPolling(
      storedBackupRequestId
    );
  }
} catch {
  // Continue without browser local storage.
}

try {
  const storedHealthRequestId =
    sessionStorage.getItem(
      "activeHealthRequestId"
    );

  if (storedHealthRequestId) {
    startHealthStatusPolling(
      storedHealthRequestId
    );
  }
} catch {
  // Continue without browser session storage.
}

const initialOperationTab =
  window.location.hash === "#snapshot"
    ? "snapshot"
    : window.location.hash === "#backup"
      ? "backup"
      : window.location.hash === "#health"
        ? "health"
        : "suppression";

activateOperationTab(
  initialOperationTab
);


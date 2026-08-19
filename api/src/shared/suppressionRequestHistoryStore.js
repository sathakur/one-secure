const { createHash } = require("node:crypto");

const STORAGE_API_VERSION = "2023-11-03";
const MAX_HISTORY_RECORDS = 5;
const MAX_CONCURRENCY_RETRIES = 6;

function getContainerSasUrl() {
  const value =
    process.env.SUPPRESSION_HISTORY_CONTAINER_SAS_URL ||
    process.env.SNAPSHOT_STATUS_CONTAINER_SAS_URL ||
    process.env.BACKUP_STATUS_CONTAINER_SAS_URL;

  if (!value) {
    throw new Error(
      "A server-side history container SAS URL is not configured."
    );
  }

  return value;
}

function normalizeUserId(userId) {
  const value =
    String(userId || "")
      .trim()
      .toLowerCase();

  if (!value) {
    throw new Error(
      "Requester user name is required for Alert Suppression history."
    );
  }

  return value;
}

function getUserHash(userId) {
  return createHash("sha256")
    .update(normalizeUserId(userId), "utf8")
    .digest("hex");
}

function buildHistoryBlobUrl(userId) {
  const sasUrl =
    new URL(getContainerSasUrl());

  sasUrl.pathname =
    `${sasUrl.pathname.replace(/\/$/, "")}/suppression-request-history/${getUserHash(userId)}.json`;

  return sasUrl.toString();
}

async function readHistoryState(url) {
  const response =
    await fetch(url, {
      method: "GET",
      headers: {
        "x-ms-version": STORAGE_API_VERSION,
        Accept: "application/json"
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15000)
    });

  if (response.status === 404) {
    return {
      exists: false,
      etag: null,
      state: {
        version: 1,
        requests: []
      }
    };
  }

  if (!response.ok) {
    throw new Error(
      `Alert Suppression history returned HTTP ${response.status}: ${await response.text()}`
    );
  }

  let state;

  try {
    state = await response.json();
  } catch {
    state = {
      version: 1,
      requests: []
    };
  }

  return {
    exists: true,
    etag: response.headers.get("etag"),
    state: {
      version: 1,
      requests:
        Array.isArray(state?.requests)
          ? state.requests
          : []
    }
  };
}

async function conditionalWriteHistory(
  url,
  state,
  exists,
  etag
) {
  const headers = {
    "x-ms-blob-type": "BlockBlob",
    "x-ms-version": STORAGE_API_VERSION,
    "Content-Type": "application/json; charset=utf-8"
  };

  if (exists && etag) {
    headers["If-Match"] = etag;
  } else {
    headers["If-None-Match"] = "*";
  }

  const response =
    await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(state),
      signal: AbortSignal.timeout(15000)
    });

  if (
    response.status === 409 ||
    response.status === 412
  ) {
    return false;
  }

  if (!response.ok) {
    throw new Error(
      `Alert Suppression history returned HTTP ${response.status}: ${await response.text()}`
    );
  }

  return true;
}

function safeText(value, maxLength) {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function sanitizeSuccessfulResult(item) {
  return {
    hostname: safeText(item?.hostname, 253).toUpperCase(),
    status: safeText(item?.status, 40),
    vmName: safeText(item?.vmName, 253),
    subscriptionName: safeText(item?.subscriptionName, 253),
    subscriptionId: safeText(item?.subscriptionId, 80),
    resourceGroup: safeText(item?.resourceGroup, 253),
    resourceId: safeText(item?.resourceId, 2048),
    ruleName: safeText(item?.ruleName, 253),
    ruleId: safeText(item?.ruleId, 2048)
  };
}

function sanitizeFailedResult(item) {
  const details =
    typeof item?.details === "string"
      ? safeText(item.details, 2000)
      : item?.details && typeof item.details === "object"
        ? safeText(
            item.details.message ||
            item.details.error?.message ||
            JSON.stringify(item.details),
            2000
          )
        : "";

  return {
    hostname:
      safeText(
        item?.hostname ||
        item?.hostnameSubmitted,
        253
      ).toUpperCase(),
    status: safeText(item?.status, 40),
    failureStage: safeText(item?.failureStage, 120),
    vmName: safeText(item?.vmName, 253),
    subscriptionName: safeText(item?.subscriptionName, 253),
    resourceGroup: safeText(item?.resourceGroup, 253),
    httpStatus: safeText(item?.httpStatus, 20),
    message: safeText(item?.message, 1200),
    details
  };
}

function sanitizeExcludedResult(item) {
  const sanitizeTags = (value) => {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((entry) => ({
        TagName: safeText(
          entry?.TagName || entry?.tagName,
          200
        ),
        TagValue: safeText(
          entry?.TagValue || entry?.tagValue,
          500
        )
      }))
      .filter(
        (entry) =>
          entry.TagName ||
          entry.TagValue
      )
      .slice(0, 30);
  };

  return {
    hostname:
      safeText(
        item?.hostname ||
        item?.hostnameSubmitted,
        253
      ).toUpperCase(),
    status: safeText(
      item?.status || "Excluded",
      40
    ),
    failureStage: safeText(
      item?.failureStage || "GxPExclusion",
      120
    ),
    vmName: safeText(item?.vmName, 253),
    subscriptionName:
      safeText(item?.subscriptionName, 253),
    subscriptionId:
      safeText(item?.subscriptionId, 80),
    resourceGroup:
      safeText(item?.resourceGroup, 253),
    resourceId:
      safeText(item?.resourceId, 2048),
    vmGxPStatus:
      safeText(item?.vmGxPStatus, 40),
    subscriptionGxPStatus:
      safeText(
        item?.subscriptionGxPStatus,
        40
      ),
    vmPositiveGxPTags:
      sanitizeTags(item?.vmPositiveGxPTags),
    vmNegativeGxPTags:
      sanitizeTags(item?.vmNegativeGxPTags),
    subscriptionPositiveGxPTags:
      sanitizeTags(
        item?.subscriptionPositiveGxPTags
      ),
    subscriptionNegativeGxPTags:
      sanitizeTags(
        item?.subscriptionNegativeGxPTags
      ),
    message: safeText(item?.message, 1200)
  };
}

function sanitizeHistoryRecord(record) {
  const hostnames =
    Array.isArray(record?.hostnames)
      ? [
          ...new Set(
            record.hostnames
              .map(
                (value) =>
                  safeText(value, 253).toUpperCase()
              )
              .filter(Boolean)
          )
        ].slice(0, 20)
      : [];

  const successfulResults =
    Array.isArray(record?.successfulResults)
      ? record.successfulResults
          .map(sanitizeSuccessfulResult)
          .filter((item) => item.hostname)
          .slice(0, 20)
      : [];

  const failedResults =
    Array.isArray(record?.failedResults)
      ? record.failedResults
          .map(sanitizeFailedResult)
          .filter((item) => item.hostname)
          .slice(0, 20)
      : [];

  const excludedResults =
    Array.isArray(record?.excludedResults)
      ? record.excludedResults
          .map(sanitizeExcludedResult)
          .filter((item) => item.hostname)
          .slice(0, 20)
      : [];

  return {
    requestId: safeText(record?.requestId, 160),
    submittedUtc: safeText(record?.submittedUtc, 80),
    completedUtc: safeText(record?.completedUtc, 80),
    hostnames,
    changeNumber: safeText(record?.changeNumber, 80),
    reason: safeText(record?.reason, 500),
    startDateTime: safeText(record?.startDateTime, 80),
    endDateTime: safeText(record?.endDateTime, 80),
    timeZone: safeText(record?.timeZone, 120),
    startUtc: safeText(record?.startUtc, 80),
    endUtc: safeText(record?.endUtc, 80),
    status: safeText(record?.status, 60),
    message: safeText(record?.message, 1200),
    submittedCount:
      safeNumber(
        record?.submittedCount,
        hostnames.length
      ),
    uniqueCount:
      safeNumber(
        record?.uniqueCount,
        hostnames.length
      ),
    successCount:
      safeNumber(
        record?.successCount,
        successfulResults.length
      ),
    failureCount:
      safeNumber(
        record?.failureCount,
        failedResults.length
      ),
    excludedCount:
      safeNumber(
        record?.excludedCount,
        excludedResults.length
      ),
    successfulResults,
    excludedResults,
    failedResults
  };
}

async function appendSuppressionRequestHistory(
  userId,
  record
) {
  const url =
    buildHistoryBlobUrl(userId);

  const sanitized =
    sanitizeHistoryRecord(record);

  if (
    !sanitized.requestId ||
    !sanitized.submittedUtc
  ) {
    throw new Error(
      "Alert Suppression history record is incomplete."
    );
  }

  for (
    let attempt = 0;
    attempt < MAX_CONCURRENCY_RETRIES;
    attempt += 1
  ) {
    const current =
      await readHistoryState(url);

    const existing =
      current.state.requests.filter(
        (item) =>
          String(item?.requestId || "") !==
          sanitized.requestId
      );

    const requests =
      [sanitized, ...existing]
        .sort(
          (a, b) =>
            Date.parse(b.submittedUtc || 0) -
            Date.parse(a.submittedUtc || 0)
        )
        .slice(0, MAX_HISTORY_RECORDS);

    const nextState = {
      version: 1,
      updatedUtc:
        new Date().toISOString(),
      requests
    };

    const written =
      await conditionalWriteHistory(
        url,
        nextState,
        current.exists,
        current.etag
      );

    if (written) {
      return;
    }
  }

  throw new Error(
    "Alert Suppression history could not be updated because of concurrent changes."
  );
}

async function readSuppressionRequestHistory(userId) {
  const current =
    await readHistoryState(
      buildHistoryBlobUrl(userId)
    );

  return current.state.requests
    .map(sanitizeHistoryRecord)
    .filter((item) => item.requestId)
    .sort(
      (a, b) =>
        Date.parse(b.submittedUtc || 0) -
        Date.parse(a.submittedUtc || 0)
    );
}

module.exports = {
  appendSuppressionRequestHistory,
  readSuppressionRequestHistory
};

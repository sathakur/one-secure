const { app } = require("@azure/functions");
const {
  readSuppressionRequestHistory
} = require("../shared/suppressionRequestHistoryStore");

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 5;

function jsonResponse(status, body) {
  return {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    },
    jsonBody: body
  };
}

function getClientPrincipal(request) {
  const userName =
    String(
      request.headers.get("x-requester-user-name") || ""
    ).trim();

  if (
    !userName ||
    userName.length > 120 ||
    !/^[A-Za-z0-9._@\\-]+$/.test(userName)
  ) {
    return null;
  }

  return {
    identityProvider: "manual",
    userRoles: ["authenticated"],
    userDetails: userName,
    userId: userName.toLowerCase()
  };
}

function clampLimit(value) {
  const parsed =
    Number.parseInt(String(value || ""), 10);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(
    MAX_LIMIT,
    Math.max(1, parsed)
  );
}

app.http("getMySuppressionRequests", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "getMySuppressionRequests",

  handler: async (request, context) => {
    const principal = getClientPrincipal(request);

    if (!principal) {
      return jsonResponse(401, {
        success: false,
        status: "Unauthorized",
        message: "A requester user name is required."
      });
    }

    const limit =
      clampLimit(
        request.query.get("limit")
      );

    try {
      const history =
        await readSuppressionRequestHistory(
          principal.userId
        );

      const requests =
        history.slice(0, limit);

      return jsonResponse(200, {
        success: true,
        count: requests.length,
        requests
      });
    } catch (error) {
      context.error(
        "Unable to read Alert Suppression history.",
        error
      );

      return jsonResponse(503, {
        success: false,
        status: "HistoryUnavailable",
        message:
          "My Alert Suppression Requests is temporarily unavailable."
      });
    }
  }
});

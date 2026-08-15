const { app } = require("@azure/functions");
const {
  readBackupStatus,
  validateBackupRequestId
} = require("../shared/backupStatusStore");

function jsonResponse(status, body) {
  return {
    status,
    headers: {
      "Content-Type":
        "application/json",
      "Cache-Control": "no-store"
    },
    jsonBody: body
  };
}

function getClientPrincipal(request) {
  const userName = String(
    request.headers.get("x-requester-user-name") || ""
  ).trim();

  if (!userName || userName.length > 120) {
    return null;
  }

  if (!/^[A-Za-z0-9._@\\-]+$/.test(userName)) {
    return null;
  }

  return {
    identityProvider: "manual",
    userRoles: ["authenticated"],
    userDetails: userName,
    userId: userName.toLowerCase()
  };
}

function isAuthenticated(
  principal
) {
  return Boolean(
    principal &&
    principal.identityProvider ===
      "aad" &&
    Array.isArray(
      principal.userRoles
    ) &&
    principal.userRoles.includes(
      "authenticated"
    ) &&
    String(
      principal.userId || ""
    ).trim()
  );
}

app.http("getBackupStatus", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "getBackupStatus",

  handler: async (
    request,
    context
  ) => {
    const principal =
      getClientPrincipal(request);

    if (!isAuthenticated(principal)) {
      return jsonResponse(401, {
        success: false,
        status: "Unauthorized",
        message:
          "A requester user name is required."
      });
    }

    const requestId =
      String(
        request.query.get(
          "requestId"
        ) || ""
      )
        .trim()
        .toLowerCase();

    if (
      !validateBackupRequestId(
        requestId
      )
    ) {
      return jsonResponse(400, {
        success: false,
        status:
          "InvalidRequestId",
        message:
          "A valid VM Backup Request ID is required."
      });
    }

    let statusDocument;

    try {
      statusDocument =
        await readBackupStatus(
          requestId
        );
    } catch (error) {
      context.error(
        `Unable to read backup status ${requestId}.`,
        error
      );

      return jsonResponse(503, {
        success: false,
        status:
          "StatusStoreUnavailable",
        message:
          "VM backup status is temporarily unavailable."
      });
    }

    if (!statusDocument) {
      return jsonResponse(404, {
        success: false,
        status: "NotFound",
        message:
          "VM backup request status was not found."
      });
    }

    if (
      String(
        statusDocument
          .requesterUserId || ""
      ) !==
      String(
        principal.userId
      )
    ) {
      return jsonResponse(404, {
        success: false,
        status: "NotFound",
        message:
          "VM backup request status was not found."
      });
    }

    const {
      requesterUserId:
        _requesterUserId,
      ...safeStatus
    } = statusDocument;

    return jsonResponse(200, {
      success: true,
      ...safeStatus
    });
  }
});

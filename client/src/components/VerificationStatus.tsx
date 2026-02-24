import React from "react";

type VerificationStatus = "unverified" | "verified" | "rejected";

interface VerificationStatusBadgeProps {
  status: VerificationStatus;
  isActive?: boolean;
  reason?: string;
  verificationDate?: string;
  verifiedByUsername?: string;
  className?: string;
  showDetails?: boolean;
}

/**
 * Displays verification status with visual indicators
 * Shows combined state: verification status + activity status
 */
export const VerificationStatusBadge: React.FC<
  VerificationStatusBadgeProps
> = ({
  status,
  isActive = false,
  reason,
  verificationDate,
  verifiedByUsername,
  className = "",
  showDetails = false,
}) => {
  // Determine colors and icons based on status
  const getStatusConfig = (s: VerificationStatus, active: boolean) => {
    if (s === "unverified") {
      return {
        icon: "🔴",
        label: "Unverified",
        color: "bg-yellow-100 text-yellow-800 border-yellow-300",
        description: "Awaiting admin review",
      };
    } else if (s === "verified") {
      return {
        icon: "✅",
        label: "Verified",
        color: "bg-green-100 text-green-800 border-green-300",
        description: active ? "Active & Listed" : "Paused",
      };
    } else if (s === "rejected") {
      return {
        icon: "❌",
        label: "Rejected",
        color: "bg-red-100 text-red-800 border-red-300",
        description: reason || "Business blocked",
      };
    }

    return {
      icon: "❓",
      label: "Unknown",
      color: "bg-gray-100 text-gray-800 border-gray-300",
      description: "Unknown status",
    };
  };

  const config = getStatusConfig(status, isActive);

  // Activity status indicator (secondary)
  const getActivityStatus = () => {
    if (status === "rejected") return null; // Rejected blocks activity
    if (!isActive) return "🟡 Paused";
    return "🟢 Active";
  };

  const activityStatus = getActivityStatus();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Primary Status Badge */}
      <div
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-sm font-medium ${config.color}`}
      >
        <span>{config.icon}</span>
        <span>{config.label}</span>
        {isActive && status === "verified" && <span>📍</span>}
      </div>

      {/* Activity Status Badge (if verified) */}
      {activityStatus && (
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs border border-gray-300 font-medium">
          {activityStatus}
        </div>
      )}

      {/* Detail Popover (Optional) */}
      {showDetails && (status === "rejected" || verificationDate) && (
        <div className="text-xs text-gray-600 ml-2">
          {status === "rejected" && reason && (
            <div>
              <strong>Reason:</strong> {reason}
            </div>
          )}
          {verificationDate && (
            <div>
              <strong>Verified:</strong>{" "}
              {new Date(verificationDate).toLocaleDateString()}
              {verifiedByUsername && ` by ${verifiedByUsername}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface VerificationStatusTableProps {
  data: Array<{
    id: number | string;
    status: VerificationStatus;
    isActive: boolean;
    reason?: string;
    verificationDate?: string;
    verifiedByUsername?: string;
  }>;
  className?: string;
}

/**
 * Status column for tables - single cell with status badge
 */
export const VerificationStatusColumn: React.FC<{
  status: VerificationStatus;
  isActive: boolean;
  reason?: string;
}> = ({ status, isActive, reason }) => {
  const getEmoji = (s: VerificationStatus) => {
    switch (s) {
      case "unverified":
        return "🔴";
      case "verified":
        return "✅";
      case "rejected":
        return "❌";
      default:
        return "❓";
    }
  };

  const getText = (s: VerificationStatus, active: boolean) => {
    if (s === "unverified") return "Unverified";
    if (s === "rejected") return `Rejected${reason ? ": " + reason : ""}`;
    return active ? "Verified (Active)" : "Verified (Paused)";
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-lg">{getEmoji(status)}</span>
      <span className="text-sm font-medium">{getText(status, isActive)}</span>
    </div>
  );
};

/**
 * Detailed verification info card
 */
interface VerificationDetailsCardProps {
  businessName: string;
  status: VerificationStatus;
  isActive: boolean;
  verificationDate?: string;
  verifiedByUsername?: string;
  reason?: string;
  createdAt?: string;
}

export const VerificationDetailsCard: React.FC<
  VerificationDetailsCardProps
> = ({
  businessName,
  status,
  isActive,
  verificationDate,
  verifiedByUsername,
  reason,
  createdAt,
}) => {
  const getStatusColor = (s: VerificationStatus) => {
    switch (s) {
      case "unverified":
        return "border-yellow-300 bg-yellow-50";
      case "verified":
        return "border-green-300 bg-green-50";
      case "rejected":
        return "border-red-300 bg-red-50";
      default:
        return "border-gray-300 bg-gray-50";
    }
  };

  return (
    <div className={`border-l-4 p-4 rounded ${getStatusColor(status)}`}>
      <div className="font-semibold mb-2">{businessName}</div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-gray-600 font-medium">Status</div>
          <div className="font-semibold">
            {status === "unverified" && "🔴 Unverified"}
            {status === "verified" &&
              `✅ Verified ${isActive ? "(Active)" : "(Paused)"}`}
            {status === "rejected" && "❌ Rejected"}
          </div>
        </div>

        {verificationDate && (
          <div>
            <div className="text-gray-600 font-medium">Verified Date</div>
            <div>{new Date(verificationDate).toLocaleDateString()}</div>
          </div>
        )}

        {verifiedByUsername && (
          <div>
            <div className="text-gray-600 font-medium">Verified By</div>
            <div>{verifiedByUsername}</div>
          </div>
        )}

        {reason && (
          <div className="col-span-2">
            <div className="text-gray-600 font-medium">
              {status === "rejected" ? "Rejection Reason" : "Notes"}
            </div>
            <div className="text-red-700 font-medium italic">{reason}</div>
          </div>
        )}

        {createdAt && (
          <div>
            <div className="text-gray-600 font-medium">Created</div>
            <div>{new Date(createdAt).toLocaleDateString()}</div>
          </div>
        )}
      </div>
    </div>
  );
};

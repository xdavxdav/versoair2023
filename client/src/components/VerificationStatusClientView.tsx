import React from "react";

type VerificationStatus = "unverified" | "verified" | "rejected";

interface VerificationPathwayProps {
  businessName: string;
  status: VerificationStatus;
  isActive: boolean;
  reason?: string;
  verificationDate?: string;
  verifiedByUsername?: string;
  createdAt?: string;
  className?: string;
}

/**
 * Business Owner View - Shows verification pathway and current status
 * Explains what they need to do to get their business active
 */
export const VerificationPathway: React.FC<VerificationPathwayProps> = ({
  businessName,
  status,
  isActive,
  reason,
  verificationDate,
  verifiedByUsername,
  createdAt,
  className = "",
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Pathway Visualization */}
      <div className="border rounded-lg p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
        <h2 className="text-lg font-bold mb-6 text-gray-800">
          Path to Activation for "{businessName}"
        </h2>

        {/* The Three States */}
        <div className="space-y-4">
          {/* State 1: Unverified */}
          <div
            className={`flex items-start gap-4 p-4 rounded-lg border-2 ${
              status === "unverified"
                ? "border-yellow-400 bg-yellow-50"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <div className="text-3xl">🔴</div>
            <div className="flex-1">
              <div className="font-bold text-gray-800">
                Step 1: Awaiting Verification
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Your business has been submitted and is waiting for our team to
                review it.
              </div>
              {status === "unverified" && (
                <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-sm text-yellow-800">
                  ⏳ Your business is here now. You cannot activate yet.
                </div>
              )}
              {status !== "unverified" && (
                <div className="mt-2 text-xs text-gray-500">✓ Completed</div>
              )}
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center text-2xl text-gray-400">↓</div>

          {/* State 2: Verified or Rejected */}
          <div className="space-y-3">
            {/* Verified Path */}
            <div
              className={`flex items-start gap-4 p-4 rounded-lg border-2 ${
                status === "verified"
                  ? "border-green-400 bg-green-50"
                  : status === "rejected"
                    ? "border-gray-200 bg-gray-50"
                    : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="text-3xl">✅</div>
              <div className="flex-1">
                <div className="font-bold text-gray-800">
                  Step 2: Verified by Admin
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Our team has reviewed and approved your business. You can now
                  activate it.
                </div>
                {status === "verified" && (
                  <div className="mt-3 space-y-2">
                    <div className="p-2 bg-green-100 border border-green-300 rounded text-sm text-green-800">
                      ✓ Verified{" "}
                      {verificationDate &&
                        `on ${new Date(verificationDate).toLocaleDateString()}`}
                      {verifiedByUsername && ` by ${verifiedByUsername}`}
                    </div>
                    <div className="p-3 bg-white border border-green-200 rounded">
                      <div className="text-sm font-semibold text-gray-800 mb-2">
                        Ready to activate! 🚀
                      </div>
                      {!isActive ? (
                        <button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded text-sm">
                          Click "Activate Business" to go live
                        </button>
                      ) : (
                        <div className="text-sm text-green-700 font-semibold">
                          ✓ Your business is now active and visible in our
                          directory!
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {status !== "verified" && status !== "rejected" && (
                  <div className="mt-2 text-xs text-gray-500">
                    ⏳ Waiting for approval
                  </div>
                )}
              </div>
            </div>

            {/* Rejected Path */}
            <div
              className={`flex items-start gap-4 p-4 rounded-lg border-2 ${
                status === "rejected"
                  ? "border-red-400 bg-red-50"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="text-3xl">❌</div>
              <div className="flex-1">
                <div className="font-bold text-gray-800">
                  Alternative: Rejected (Needs Fix)
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Our team found issues with your submission. You cannot
                  activate until this is resolved.
                </div>
                {status === "rejected" && reason && (
                  <div className="mt-3 space-y-2">
                    <div className="p-3 bg-red-100 border border-red-300 rounded text-sm text-red-800">
                      <div className="font-semibold mb-1">
                        Why it was rejected:
                      </div>
                      <div className="italic">{reason}</div>
                    </div>
                    <div className="p-2 bg-white border border-red-200 rounded text-sm text-gray-700">
                      Please fix these issues and contact our support team to
                      request a review.
                    </div>
                  </div>
                )}
                {status !== "rejected" && (
                  <div className="mt-2 text-xs text-gray-500">
                    We hope this doesn't apply to you
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Arrow to Final State */}
          {status === "verified" && (
            <>
              <div className="flex justify-center text-2xl text-gray-400">
                ↓
              </div>

              {/* State 3: Active */}
              <div
                className={`flex items-start gap-4 p-4 rounded-lg border-2 ${
                  isActive
                    ? "border-green-500 bg-green-100"
                    : "border-green-300 bg-green-50"
                }`}
              >
                <div className="text-3xl">🟢</div>
                <div className="flex-1">
                  <div className="font-bold text-gray-800">
                    Step 3: Business is Active
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Your business is verified and activated. You're now visible
                    in our directory!
                  </div>
                  {isActive && (
                    <div className="mt-2 p-2 bg-green-200 border border-green-500 rounded text-sm font-semibold text-green-900">
                      ✓ Your business is currently active and visible
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Current Status Summary Card */}
      <div className="border rounded-lg p-6 bg-white">
        <h3 className="text-lg font-bold mb-4 text-gray-800">
          Your Current Status
        </h3>

        <div className="space-y-3">
          {/* Status Badge */}
          <div className="flex items-center gap-3">
            <div className="text-2xl">
              {status === "unverified" && "🔴"}
              {status === "verified" && "✅"}
              {status === "rejected" && "❌"}
            </div>
            <div>
              <div className="font-bold text-gray-800">
                {status === "unverified" && "Unverified - Awaiting Review"}
                {status === "verified" &&
                  `Verified - ${isActive ? "Active" : "Paused"}`}
                {status === "rejected" && "Rejected - Action Required"}
              </div>
              <div className="text-sm text-gray-600">
                {status === "unverified" &&
                  "Submitted on " +
                    (createdAt
                      ? new Date(createdAt).toLocaleDateString()
                      : "unknown")}
                {status === "verified" &&
                  verificationDate &&
                  `Verified on ${new Date(verificationDate).toLocaleDateString()}`}
                {status === "rejected" && "Please contact support"}
              </div>
            </div>
          </div>

          {/* What You Can Do Now */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <div className="font-semibold text-blue-900 mb-2">
              What you can do now:
            </div>
            <ul className="text-sm text-blue-800 space-y-1">
              {status === "unverified" && (
                <>
                  <li>✓ Review your business information</li>
                  <li>✓ Make sure all details are correct and up-to-date</li>
                  <li>✓ Wait for our team to review (typically 24-48 hours)</li>
                  <li>✓ Check back here for updates</li>
                </>
              )}
              {status === "verified" && (
                <>
                  <li>
                    ✓{" "}
                    {isActive
                      ? "Your business is live"
                      : "Activate your business"}
                  </li>
                  <li>✓ Update your business information</li>
                  <li>✓ Manage your listings and inventory</li>
                  {!isActive && (
                    <li>✓ Click "Activate Business" button above</li>
                  )}
                </>
              )}
              {status === "rejected" && (
                <>
                  <li>✓ Review the rejection reason above</li>
                  <li>✓ Fix the issues identified</li>
                  <li>✓ Contact our support team to request re-review</li>
                  <li>✓ Don't worry - we're here to help!</li>
                </>
              )}
            </ul>
          </div>

          {/* Contact Support */}
          <div className="text-center pt-4 border-t">
            <div className="text-sm text-gray-600 mb-2">Have questions?</div>
            <button className="text-blue-600 hover:text-blue-800 font-semibold text-sm">
              📧 Contact Support Team
            </button>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="border rounded-lg p-6 bg-gray-50">
        <h3 className="text-lg font-bold mb-4 text-gray-800">
          Frequently Asked Questions
        </h3>

        <div className="space-y-4">
          <div>
            <div className="font-semibold text-gray-800">
              Q: Why is my business still unverified?
            </div>
            <div className="text-sm text-gray-600 mt-1">
              A: Our team reviews all submissions to ensure quality and
              legitimacy. This typically takes 24-48 hours. We'll notify you as
              soon as your business is verified.
            </div>
          </div>

          <div>
            <div className="font-semibold text-gray-800">
              Q: What if my business is rejected?
            </div>
            <div className="text-sm text-gray-600 mt-1">
              A: We provide a specific reason for rejection. Please fix the
              identified issues and contact our support team to request a
              review.
            </div>
          </div>

          <div>
            <div className="font-semibold text-gray-800">
              Q: Can I activate my business before verification?
            </div>
            <div className="text-sm text-gray-600 mt-1">
              A: No. Verification is required for activation for the security
              and integrity of our platform.
            </div>
          </div>

          <div>
            <div className="font-semibold text-gray-800">
              Q: What happens after I activate my business?
            </div>
            <div className="text-sm text-gray-600 mt-1">
              A: Your business will appear in our directory and be visible to
              potential customers. You can pause or resume it anytime from your
              dashboard.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Simple status badge for navigation/headers
 * Shows quick status at a glance
 */
interface QuickStatusProps {
  status: VerificationStatus;
  isActive: boolean;
}

export const VerificationQuickStatus: React.FC<QuickStatusProps> = ({
  status,
  isActive,
}) => {
  const getStatus = () => {
    if (status === "unverified") {
      return {
        emoji: "🔴",
        text: "Awaiting Verification",
        color: "bg-yellow-100 text-yellow-800 border-yellow-300",
      };
    }
    if (status === "rejected") {
      return {
        emoji: "❌",
        text: "Rejected - Action Needed",
        color: "bg-red-100 text-red-800 border-red-300",
      };
    }
    if (isActive) {
      return {
        emoji: "🟢",
        text: "Active & Verified",
        color: "bg-green-100 text-green-800 border-green-300",
      };
    }
    return {
      emoji: "🟡",
      text: "Verified - Paused",
      color: "bg-blue-100 text-blue-800 border-blue-300",
    };
  };

  const current = getStatus();

  return (
    <div
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 font-semibold text-sm ${current.color}`}
    >
      <span className="text-lg">{current.emoji}</span>
      <span>{current.text}</span>
    </div>
  );
};

/**
 * Checkpoint banner - shows status before they sign in
 * Used on login/signup pages
 */
interface CheckpointBannerProps {
  businessStatus?: VerificationStatus;
  businessName?: string;
  showBefore?: boolean; // Show before login attempt
}

export const VerificationCheckpoint: React.FC<CheckpointBannerProps> = ({
  businessStatus = "unverified",
  businessName = "Your Business",
  showBefore = true,
}) => {
  if (!showBefore) return null;

  return (
    <div className="w-full bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
      <div className="flex items-start gap-3">
        <div className="text-2xl">ℹ️</div>
        <div className="flex-1">
          <div className="font-bold text-blue-900 mb-1">
            Verification Status:{" "}
            {businessStatus === "unverified"
              ? "🔴 Awaiting Review"
              : businessStatus === "verified"
                ? "✅ Verified"
                : "❌ Rejected"}
          </div>
          <div className="text-sm text-blue-800 mb-2">
            {businessStatus === "unverified" &&
              "Your business is awaiting verification. You can manage your information while we review it, but you cannot activate your business until it's approved."}
            {businessStatus === "verified" &&
              "Great! Your business has been verified. You can now activate it to appear in our directory."}
            {businessStatus === "rejected" &&
              "Your business submission requires attention. Please review the rejection reason and contact our support team."}
          </div>
          <button className="text-blue-700 hover:text-blue-900 font-semibold text-sm underline">
            Learn more about the verification process →
          </button>
        </div>
      </div>
    </div>
  );
};

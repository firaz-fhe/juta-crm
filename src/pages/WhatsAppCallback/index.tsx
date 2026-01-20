import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export default function WhatsAppCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      const client = searchParams.get("client");
      const channels = searchParams.get("channels");
      const state = searchParams.get("state");
      const errorParam = searchParams.get("error");

      // Handle error from 360dialog
      if (errorParam) {
        setStatus("error");
        setErrorMessage("Connection was cancelled or failed.");
        toast.error("WhatsApp connection cancelled");
        setTimeout(() => navigate("/loading"), 2000);
        return;
      }

      // Check for required parameters
      if (!client || !channels) {
        setStatus("error");
        setErrorMessage("Missing connection parameters.");
        toast.error("Connection failed - missing parameters");
        setTimeout(() => navigate("/loading"), 2000);
        return;
      }

      try {
        // Parse state to get company info
        let companyId = "";
        let phoneIndex = 0;

        if (state) {
          try {
            const stateData = JSON.parse(decodeURIComponent(state));
            companyId = stateData.companyId || "";
            phoneIndex = stateData.phoneIndex || 0;
          } catch (e) {
            console.error("Failed to parse state:", e);
          }
        }

        // If no company ID from state, try to get from localStorage
        if (!companyId) {
          const userEmail = localStorage.getItem("userEmail");
          if (userEmail) {
            const userResponse = await fetch(
              `http://localhost:8443/api/user/config?email=${encodeURIComponent(
                userEmail
              )}`
            );
            const userData = await userResponse.json();
            companyId = userData.company_id || "";
          }
        }

        if (!companyId) {
          throw new Error("Could not determine company ID");
        }

        // Parse channels array
        let channelId = "";
        try {
          const channelsArray = JSON.parse(channels);
          channelId = Array.isArray(channelsArray)
            ? channelsArray[0]
            : channels;
        } catch (e) {
          channelId = channels;
        }

        // Call onboard API
        const response = await fetch("/api/whatsapp/360dialog/onboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId,
            phoneIndex,
            clientId: client,
            channelId,
          }),
        });

        const data = await response.json();

        if (data.success) {
          setStatus("success");
          toast.success("WhatsApp connected successfully!");
          setTimeout(() => navigate("/loading"), 1500);
        } else {
          throw new Error(data.error || "Failed to complete connection");
        }
      } catch (e) {
        console.error("Callback error:", e);
        setStatus("error");
        setErrorMessage(
          e instanceof Error ? e.message : "Connection failed. Please try again."
        );
        toast.error("WhatsApp connection failed");
        setTimeout(() => navigate("/loading"), 2000);
      }
    };

    processCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-sm w-full mx-4 text-center">
        {status === "loading" && (
          <>
            <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Connecting WhatsApp...
            </h2>
            <p className="text-sm text-gray-500">
              Please wait while we complete the setup.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Connected!
            </h2>
            <p className="text-sm text-gray-500">
              Your WhatsApp Business account is now connected.
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Connection Failed
            </h2>
            <p className="text-sm text-gray-500">
              {errorMessage || "Something went wrong. Redirecting..."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

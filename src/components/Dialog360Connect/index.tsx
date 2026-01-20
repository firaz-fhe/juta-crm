import React, { useState } from "react";
// Note: Install with: npm install 360dialog-connect-button
// import { ConnectButton } from '360dialog-connect-button';

interface Props {
  companyId: string;
  phoneIndex: number;
  onSuccess: () => void;
  onCancel: () => void;
}

interface CallbackResult {
  client?: string;
  channels?: string[];
  error?: string;
}

export default function Dialog360Connect({
  companyId,
  phoneIndex,
  onSuccess,
  onCancel,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCallback = async (result: CallbackResult) => {
    // Reset error state
    setError(null);

    // Check if user cancelled or no channels returned
    if (!result.channels?.length) {
      onCancel();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/whatsapp/360dialog/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          phoneIndex,
          clientId: result.client,
          channelId: result.channels[0],
        }),
      });

      const data = await res.json();

      if (data.success) {
        onSuccess();
      } else {
        setError(data.error || "Failed to connect WhatsApp");
      }
    } catch (e) {
      console.error("360dialog onboard error:", e);
      setError("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Get partner ID from environment
  const partnerId = import.meta.env.VITE_360DIALOG_PARTNER_ID;

  // Manual connect button handler (opens 360dialog in popup)
  const handleManualConnect = () => {
    if (!partnerId) {
      setError("360dialog is not configured. Please contact support.");
      return;
    }

    // Build the OAuth URL for 360dialog
    const redirectUrl = encodeURIComponent(
      `${window.location.origin}/whatsapp-callback`
    );
    const state = encodeURIComponent(
      JSON.stringify({ companyId, phoneIndex })
    );

    // Open 360dialog embedded signup
    const width = 800;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      `https://hub.360dialog.com/dashboard/app/${partnerId}/permissions?redirect_url=${redirectUrl}&state=${state}`,
      "360dialog_connect",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    );

    // Listen for popup close
    const checkPopup = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkPopup);
        // User closed popup without completing - wait for redirect callback
      }
    }, 1000);
  };

  return (
    <div className="p-6 text-center">
      {/* WhatsApp Icon */}
      <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
        <svg
          className="w-8 h-8 text-green-600"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Connect WhatsApp Business
      </h3>
      <p className="text-sm text-gray-600 mb-6">
        Connect your WhatsApp Business account via Meta
      </p>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Connect Button */}
      {loading ? (
        <div className="py-4 text-center">
          <div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-gray-500 mt-2">Setting up your account...</p>
        </div>
      ) : (
        <>
          {/*
            When 360dialog-connect-button is installed, use:
            <ConnectButton
              partnerId={partnerId}
              callback={handleCallback}
              queryParameters={{
                redirect_url: `${window.location.origin}/whatsapp-callback`,
                state: encodeURIComponent(JSON.stringify({ companyId, phoneIndex })),
              }}
              label="Connect WhatsApp"
              className="w-full py-3 bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold rounded-lg transition-colors"
            />
          */}
          <button
            onClick={handleManualConnect}
            className="w-full py-3 bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Connect WhatsApp
          </button>
        </>
      )}

      {/* Cancel Button */}
      <button
        onClick={onCancel}
        className="mt-4 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        Cancel
      </button>

      {/* Info */}
      <div className="mt-6 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-500">
          You'll be redirected to Facebook to connect your WhatsApp Business account.
          No technical setup required.
        </p>
      </div>
    </div>
  );
}

import React from "react";
import { Dialog } from "@/components/Base/Headless";
import { QrCode, Shield, X } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: "qr" | "official") => void;
}

export default function ConnectionTypeModal({
  isOpen,
  onClose,
  onSelect,
}: Props) {
  return (
    <Dialog open={isOpen} onClose={onClose}>
      <Dialog.Panel className="relative bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <Dialog.Title className="text-xl font-bold text-center mb-2 text-gray-900">
          Connect WhatsApp
        </Dialog.Title>
        <p className="text-sm text-gray-500 text-center mb-6">
          Choose how you want to connect your WhatsApp number
        </p>

        {/* Options */}
        <div className="grid grid-cols-2 gap-4">
          {/* QR Code Option (wwebjs) */}
          <button
            onClick={() => onSelect("qr")}
            className="p-5 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 text-left transition-all duration-200 group"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
              <QrCode className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">QR Code</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Scan with your phone. Free to use.
            </p>
            <div className="mt-3 inline-flex items-center text-xs font-medium text-blue-600">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
              Free
            </div>
          </button>

          {/* Meta Direct API Option */}
          <button
            onClick={() => onSelect("official")}
            className="p-5 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 text-left transition-all duration-200 group"
          >
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-green-200 transition-colors">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Meta Direct</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Connect directly to Meta. No middleman fees.
            </p>
            <div className="mt-3 inline-flex items-center text-xs font-medium text-green-600">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
              1,000 free/month
            </div>
          </button>
        </div>

        {/* Info */}
        <div className="mt-6 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 text-center">
            <strong>QR Code:</strong> Uses WhatsApp Web connection.
            <br />
            <strong>Meta Direct:</strong> Direct integration with Meta's WhatsApp Business API.
          </p>
        </div>
      </Dialog.Panel>
    </Dialog>
  );
}

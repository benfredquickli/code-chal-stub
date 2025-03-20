"use client";

import { useEffect } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

interface FingerprintProps {
  onFingerprint: (fingerprint: string | null) => void;
}

export default function Fingerprint({ onFingerprint }: FingerprintProps) {
  useEffect(() => {
    const getFingerprint = async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        onFingerprint(result.visitorId);
      } catch (error) {
        console.error("Failed to generate fingerprint:", error);
        onFingerprint(null);
      }
    };

    void getFingerprint();
  }, [onFingerprint]);

  return null;
}

"use client";

import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { useEffect } from "react";

type Props = {
  onFingerprint: (fingerprint: string) => void;
};

export default function Fingerprint({ onFingerprint }: Props) {
  useEffect(() => {
    FingerprintJS.load().then(async (fp) => {
      const result = await fp.get();
      onFingerprint(result.visitorId);
      console.log("fingerprint", result.visitorId);
    });
  });

  return null;
}

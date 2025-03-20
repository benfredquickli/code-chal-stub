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
      // Randomize the fingerprint for testing
      const randomizedFP = result.visitorId
        .split("")
        .sort(() => Math.random() - 0.5)
        .join("");
      onFingerprint(randomizedFP);
      console.log("fingerprint", randomizedFP);
    });
  }, [onFingerprint]);

  return null;
}

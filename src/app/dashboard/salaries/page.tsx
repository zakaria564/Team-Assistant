"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SalariesPage() {
  const router = useRouter();
  useEffect(() => {
    router.push("/dashboard");
  }, [router]);
  return null;
}

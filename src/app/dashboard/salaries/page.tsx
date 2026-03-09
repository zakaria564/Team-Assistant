
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SalariesPage() {
  const router = useRouter();
  useEffect(() => {
    router.push("/dashboard");
  }, [router]);
  return (
    <div className="flex justify-center items-center h-full">
      <p>Redirection en cours...</p>
    </div>
  );
}

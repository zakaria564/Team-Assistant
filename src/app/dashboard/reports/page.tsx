
"use client";

import { ClubSettingsForm } from "@/components/settings/club-settings-form";
import { Separator } from "@/components/ui/separator";

export default function ClubRegistrationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inscription du Club</h1>
        <p className="text-muted-foreground">
          Gérez les informations principales de votre club ici.
        </p>
      </div>
      
      <Separator />

      <div className="space-y-8 max-w-4xl">
        <ClubSettingsForm />
      </div>
    </div>
  );
}

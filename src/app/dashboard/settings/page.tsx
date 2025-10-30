
"use client";

import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";
import { ClubSettingsForm } from "@/components/settings/club-settings-form";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { SecuritySettingsForm } from "@/components/settings/security-settings-form";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground">
          Gérez les paramètres de votre compte et les informations de votre club.
        </p>
      </div>
      
      <Separator />

      <div className="space-y-8 max-w-4xl">
        <ProfileSettingsForm />
        <ClubSettingsForm />
        <SecuritySettingsForm />
        <AppearanceSettings />
      </div>
    </div>
  );
}

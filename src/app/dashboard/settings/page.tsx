
"use client";

import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";
import { ClubSettingsForm } from "@/components/settings/club-settings-form";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { SecuritySettingsForm } from "@/components/settings/security-settings-form";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { Loader2 } from "lucide-react";

export default function SettingsPage() {
  const [isVerified, setIsVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleVerification = async () => {
    const user = auth.currentUser;
    if (!user || !user.email) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Utilisateur non trouvé.",
      });
      return;
    }

    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      setIsVerified(true);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Mot de passe incorrect",
        description: "Le mot de passe que vous avez entré est incorrect. Veuillez réessayer.",
      });
    } finally {
      setLoading(false);
      setPassword("");
    }
  };


  if (!isVerified) {
    return (
      <Dialog open={!isVerified} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()} hideCloseButton={true}>
          <DialogHeader>
            <DialogTitle>Vérification requise</DialogTitle>
            <DialogDescription>
              Pour votre sécurité, veuillez entrer votre mot de passe pour accéder aux paramètres.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password-verification" className="text-right">
                Mot de passe
              </Label>
              <Input
                id="password-verification"
                type="password"
                className="col-span-3"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleVerification() }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleVerification} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Vérifier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

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

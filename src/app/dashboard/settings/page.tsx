
"use client";

import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";
import { ClubSettingsForm } from "@/components/settings/club-settings-form";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { SecuritySettingsForm } from "@/components/settings/security-settings-form";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";


export default function SettingsPage() {
  const [user, loadingUser] = useAuthState(auth);
  const [isVerified, setIsVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [storedPassword, setStoredPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSettingsPassword = async () => {
      if (!user) {
        if (!loadingUser) setLoading(false);
        return;
      }
      try {
        const clubDocRef = doc(db, "clubs", user.uid);
        const docSnap = await getDoc(clubDocRef);
        if (docSnap.exists() && docSnap.data().settingsPassword) {
          setStoredPassword(docSnap.data().settingsPassword);
          setIsVerified(false);
        } else {
          // If no password is set, grant access directly
          setIsVerified(true);
        }
      } catch (error) {
        console.error("Error fetching settings password:", error);
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de vérifier la configuration de sécurité.",
        });
      } finally {
        setLoading(false);
      }
    };

    if (!loadingUser) {
      fetchSettingsPassword();
    }
  }, [user, loadingUser, toast]);

  const handleVerification = () => {
    if (password === storedPassword) {
      setIsVerified(true);
    } else {
      toast({
        variant: "destructive",
        title: "Mot de passe incorrect",
        description: "Le mot de passe pour accéder aux paramètres est incorrect.",
      });
    }
  };


  if (loading || loadingUser) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isVerified) {
    return (
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[425px]" hideCloseButton={true}>
          <DialogHeader>
            <DialogTitle>Vérification requise</DialogTitle>
            <DialogDescription>
              Pour votre sécurité, veuillez entrer le mot de passe des paramètres pour continuer.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password-verify" className="text-right">
                Mot de passe
              </Label>
              <Input
                id="password-verify"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="col-span-3"
                onKeyDown={(e) => { if (e.key === 'Enter') handleVerification() }}
              />
            </div>
          </div>
          <Button onClick={handleVerification}>Vérifier</Button>
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

       {!storedPassword && (
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>Sécurité Faible</AlertTitle>
          <AlertDescription>
            Vous n'avez pas encore configuré de mot de passe pour les paramètres. Il est fortement recommandé d'en ajouter un dans la section "Informations du Club".
          </AlertDescription>
        </Alert>
      )}
      
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

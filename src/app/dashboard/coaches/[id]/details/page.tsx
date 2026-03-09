"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, FileDown, User, Phone, Mail, Home, Flag, Star, LogIn, LogOut, Fingerprint, Shield } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface Coach {
  id: string;
  name: string;
  category: string;
  status: "Actif" | "Inactif";
  photoUrl?: string;
  phone?: string;
  email: string;
  specialty?: string;
  entryDate?: string;
  exitDate?: string;
  nationality?: string;
  cin?: string;
  address?: string;
}

const DetailItem = ({ icon: Icon, label, value, href, children }: { icon: React.ElementType, label: string, value?: string, href?: string, children?: React.ReactNode }) => (
  <div className="flex items-start gap-3 break-inside-avoid">
    <Icon className="h-5 w-5 text-muted-foreground mt-1" />
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="text-base font-medium text-gray-800">
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">
            {value || children}
          </a>
        ) : (
          value || children || "Non spécifié"
        )}
      </div>
    </div>
  </div>
);

const SectionTitle = ({ title }: { title: string }) => (
    <h2 className="text-lg font-semibold text-gray-800 border-b-2 border-primary/20 pb-2 mb-4 col-span-full">{title}</h2>
);


const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export default function CoachDetailsPdfPage(props: { params: Promise<{ id: string }>, searchParams: Promise<any> }) {
  const { id: coachId } = React.use(props.params);
  const router = useRouter();
  const [user, loadingUser] = useAuthState(auth);
  const { toast } = useToast();
  
  const [coach, setCoach] = useState<Coach | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [clubName, setClubName] = useState("Votre Club");
  const [clubLogoUrl, setClubLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!coachId) return;

    const fetchCoachAndClub = async () => {
      if (!user && !loadingUser) {
        setLoading(false);
        return;
      }
      if (!user) return;

      setLoading(true);
      try {
        const coachRef = doc(db, "coaches", coachId);
        const coachSnap = await getDoc(coachRef);

        if (coachSnap.exists()) {
          setCoach({ id: coachSnap.id, ...coachSnap.data() } as Coach);
        } else {
          router.push("/dashboard/coaches");
        }
        
        const clubDocRef = doc(db, "clubs", user.uid);
        const clubDoc = await getDoc(clubDocRef);
        if (clubDoc.exists()) {
          const clubData = clubDoc.data();
          setClubName(clubData.clubName || "Votre Club");
          setClubLogoUrl(clubData.logoUrl || null);
        }

      } catch (error) {
        console.error("Error fetching coach:", error);
        router.push("/dashboard/coaches");
      } finally {
        setLoading(false);
      }
    };

    fetchCoachAndClub();
  }, [coachId, user, loadingUser, router]);
  
  const handleDownloadPdf = () => {
    setLoadingPdf(true);
    const cardElement = document.getElementById("printable-details");
    if (cardElement) {
        const originalWidth = cardElement.style.width;
        cardElement.style.width = '800px';

        html2canvas(cardElement, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false
        }).then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasAspectRatio = canvas.width / canvas.height;

            let imgWidth = pdfWidth;
            let imgHeight = pdfWidth / canvasAspectRatio;

            if (imgHeight > pdfHeight) {
                imgHeight = pdfHeight;
                imgWidth = imgHeight * canvasAspectRatio;
            }

            const x = (pdfWidth - imgWidth) / 2;
            const y = (pdfHeight - imgHeight) / 2;

            pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
            pdf.save(`fiche_entraineur_${coach?.name?.replace(/ /g, "_")}.pdf`);
        }).catch((err) => {
            console.error("Erreur PDF:", err);
            toast({
                variant: "destructive",
                title: "Erreur de génération",
                description: "Le PDF n'a pas pu être généré. Vérifiez les photos configurées."
            });
        }).finally(() => {
            if (cardElement) {
              cardElement.style.width = originalWidth;
            }
            setLoadingPdf(false);
        });
    }
  };


  if (loading || loadingUser) {
    return (
      <div className="flex justify-center items-center h-screen bg-muted/40">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!coach) return null;
  
  const coachInitial = coach.name?.charAt(0)?.toUpperCase() || "E";
  const clubInitial = clubName?.charAt(0)?.toUpperCase() || "C";


  return (
    <div className="bg-muted/40 min-h-screen p-4 sm:p-8">
       <div className="w-full max-w-4xl mx-auto space-y-4">
        <div className="flex justify-between items-center print:hidden">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour
          </Button>
          <Button onClick={handleDownloadPdf} disabled={loadingPdf}>
            {loadingPdf ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Téléchargement...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Télécharger
              </>
            )}
          </Button>
        </div>

        <div id="printable-details" className="bg-white p-6 sm:p-8 rounded-lg shadow-sm text-gray-900">
            <header className="flex flex-col sm:flex-row justify-between items-start pb-6 mb-6 border-b-2 border-gray-200">
                 <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                        <AvatarImage src={clubLogoUrl || ''} alt={clubName} />
                        <AvatarFallback className="text-xl">{clubInitial}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-2xl font-bold text-primary">{toTitleCase(clubName)}</h1>
                        <p className="text-muted-foreground">Fiche d'information de l'entraîneur</p>
                    </div>
                </div>
                <div className="text-left sm:text-right mt-4 sm:mt-0">
                    <p className="text-sm">Généré le: {format(new Date(), 'dd/MM/yyyy')}</p>
                </div>
            </header>
            
            <section className="flex flex-col sm:flex-row items-center gap-6 pb-6">
                 <Avatar className="h-32 w-32 border-4 border-primary shadow-md">
                    <AvatarImage src={coach.photoUrl} alt={coach.name} />
                    <AvatarFallback className="text-5xl">{coachInitial}</AvatarFallback>
                </Avatar>
                <div className="text-center sm:text-left">
                    <h1 className="text-4xl font-bold text-gray-800">{toTitleCase(coach.name)}</h1>
                </div>
            </section>
            
            <Separator className="my-6" />

            <main className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <SectionTitle title="Informations Personnelles" />
                    <DetailItem icon={User} label="Nom complet" value={toTitleCase(coach.name)} />
                    <DetailItem icon={Flag} label="Nationalité" value={coach.nationality} />
                    <DetailItem icon={Fingerprint} label="N° CIN" value={coach.cin} />
                    <DetailItem icon={Home} label="Adresse" value={coach.address} />
                    <DetailItem icon={Phone} label="Téléphone" value={coach.phone} />
                    <DetailItem icon={Mail} label="Email" value={coach.email}/>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <SectionTitle title="Informations Sportives" />
                    <DetailItem icon={Star} label="Spécialité" value={coach.specialty} />
                    <DetailItem icon={Shield} label="Catégorie Entraînée" value={coach.category} />
                    <DetailItem icon={LogIn} label="Date d'entrée au club" value={coach.entryDate ? format(new Date(coach.entryDate), 'dd/MM/yyyy', { locale: fr }) : undefined} />
                    <DetailItem icon={LogOut} label="Date de sortie du club" value={coach.exitDate ? format(new Date(coach.exitDate), 'dd/MM/yyyy', { locale: fr }) : undefined} />
                </div>
            </main>
        </div>
      </div>
    </div>
  );
}


"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, FileDown, Trophy, User, Phone, Mail, Home, Flag, Star, LogIn, LogOut, Fingerprint, Shield } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";

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

export default function CoachDetailsPdfPage({ params }: { params: { id: string } }) {
  const { id: coachId } = React.use(params);
  const router = useRouter();
  const [user, loadingUser] = useAuthState(auth);
  
  const [coach, setCoach] = useState<Coach | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [clubName, setClubName] = useState("Votre Club");

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
        // Fetch Coach
        const coachRef = doc(db, "coaches", coachId as string);
        const coachSnap = await getDoc(coachRef);

        if (coachSnap.exists()) {
          setCoach({ id: coachSnap.id, ...coachSnap.data() } as Coach);
        } else {
          console.log("No such document!");
          router.push("/dashboard/coaches");
        }
        
        // Fetch Club Name
        const clubDocRef = doc(db, "clubs", user.uid);
        const clubDoc = await getDoc(clubDocRef);
        if (clubDoc.exists() && clubDoc.data().clubName) {
          setClubName(clubDoc.data().clubName);
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
      html2canvas(cardElement, {
        scale: 2, 
        useCORS: true,
        backgroundColor: '#ffffff',
      }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'pt',
          format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;

        let imgWidth = pdfWidth - 40;
        let imgHeight = imgWidth / ratio;
        
        if (imgHeight > pdf.internal.pageSize.getHeight() - 40) {
            imgHeight = pdf.internal.pageSize.getHeight() - 40;
            imgWidth = imgHeight * ratio;
        }

        const x = (pdfWidth - imgWidth) / 2;
        const y = 20;

        pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
        pdf.save(`fiche_entraineur_${coach?.name?.replace(/ /g, "_")}.pdf`);
      }).finally(() => {
        setLoadingPdf(false);
      });
    } else {
      console.error("Element to print not found.");
      setLoadingPdf(false);
    }
  };


  if (loading || loadingUser) {
    return (
      <div className="flex justify-center items-center h-screen bg-muted/40">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!coach) {
    return (
      <div className="text-center p-8">
        <p>Entraîneur non trouvé.</p>
        <Button onClick={() => router.back()} className="mt-4">Retour</Button>
      </div>
    );
  }
  
  const coachInitial = coach.name?.charAt(0)?.toUpperCase() || "E";

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
                Télécharger en PDF
              </>
            )}
          </Button>
        </div>

        <div id="printable-details" className="bg-white p-6 sm:p-8 rounded-lg shadow-sm text-gray-900">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start pb-6 mb-6 border-b-2 border-gray-200">
                 <div className="flex items-center gap-4">
                    <Trophy className="h-10 w-10 text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold text-primary">{toTitleCase(clubName)}</h1>
                        <p className="text-muted-foreground">Fiche d'information de l'entraîneur</p>
                    </div>
                </div>
                <div className="text-left sm:text-right mt-4 sm:mt-0">
                    <p className="text-sm">Généré le: {format(new Date(), 'dd/MM/yyyy')}</p>
                </div>
            </header>
            
            {/* Coach Info Header */}
            <section className="flex flex-col sm:flex-row items-center gap-6 pb-6">
                 <Avatar className="h-32 w-32 border-4 border-primary shadow-md">
                    <AvatarImage src={coach.photoUrl} alt={coach.name} />
                    <AvatarFallback className="text-5xl">{coachInitial}</AvatarFallback>
                </Avatar>
                <div className="text-center sm:text-left">
                    <h1 className="text-4xl font-bold text-gray-800">{toTitleCase(coach.name)}</h1>
                    <p className="text-xl text-primary font-semibold">{toTitleCase(coach.specialty || '')}</p>
                </div>
            </section>
            
            <Separator className="my-6" />

            {/* Main Content */}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 break-before-page">
                    <SectionTitle title="Informations Sportives" />
                    <DetailItem icon={Star} label="Spécialité" value={coach.specialty} />
                    <DetailItem icon={Shield} label="Catégorie Entraînée" value={coach.category} />
                    <DetailItem icon={LogIn} label="Date d'entrée au club" value={coach.entryDate ? format(new Date(coach.entryDate), 'dd/MM/yyyy', { locale: fr }) : undefined} />
                    <DetailItem icon={LogOut} label="Date de sortie du club" value={coach.exitDate ? format(new Date(coach.exitDate), 'dd/MM/yyyy', { locale: fr }) : undefined} />
                </div>
            </main>
        </div>
      </div>

       <style jsx global>{`
            @media print {
                body {
                    background-color: #fff !important;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .print\\:hidden {
                    display: none;
                }
                 .break-before-page {
                    page-break-before: always;
                }
            }
            .break-inside-avoid {
                break-inside: avoid;
            }
        `}</style>
    </div>
  );
}

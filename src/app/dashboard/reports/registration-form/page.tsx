
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trophy, ArrowLeft, Printer, Link as LinkIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function RegistrationFormPage() {
    const router = useRouter();
    const { toast } = useToast();

    const handlePrint = () => {
        window.print();
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href)
          .then(() => {
            toast({
                title: "Lien copié !",
                description: "Le lien de la page a été copié dans le presse-papiers.",
            });
          })
          .catch(err => {
            console.error('Erreur lors de la copie du lien:', err);
            toast({
                variant: "destructive",
                title: "Erreur",
                description: "Impossible de copier le lien.",
            });
          });
    };

    return (
        <div className="bg-gray-100 dark:bg-gray-900 min-h-screen">
            <style jsx global>{`
                @media print {
                    body {
                        background-color: #fff !important;
                    }
                    .print-hidden {
                        display: none !important;
                    }
                    #printable-form {
                        margin: 0;
                        padding: 0;
                        border: none;
                        box-shadow: none;
                        color: #000 !important;
                        background-color: #fff !important;
                    }
                    #printable-form *, #printable-form *:before, #printable-form *:after {
                        color: #000 !important;
                        background-color: transparent !important;
                    }
                    @page {
                        size: A4;
                        margin: 1.5cm;
                    }
                }
            `}</style>
            <div className="w-full max-w-4xl mx-auto p-4 sm:p-8">
                <div className="mb-8 flex justify-between items-center print-hidden">
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Retour
                    </Button>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={handleCopyLink}>
                            <LinkIcon className="mr-2 h-4 w-4" />
                            Copier le lien
                        </Button>
                        <Button onClick={handlePrint}>
                            <Printer className="mr-2 h-4 w-4" />
                            Imprimer
                        </Button>
                    </div>
                </div>

                <div id="printable-form" className="bg-white rounded-lg border shadow-sm p-8 text-black">
                     <header className="p-8 border-b border-gray-200">
                        <div className="flex flex-col items-center text-center">
                            <Trophy className="h-12 w-12 text-blue-600" />
                            <h1 className="text-2xl font-bold mt-2">FICHE D'INSCRIPTION CLUB DE FOOTBALL</h1>
                            <p className="text-lg font-medium mt-1">Saison sportive : ........................</p>
                        </div>
                    </header>
                    <div className="p-8 space-y-8">
                        <section>
                            <h2 className="text-xl font-semibold border-b border-gray-200 pb-2 mb-4">I. INFORMATIONS DU JOUEUR</h2>
                            <div className="space-y-3">
                                <p><strong>Nom et Prénom :</strong> ............................................................................................................................................</p>
                                <p><strong>Date et Lieu de naissance :</strong> .........................................................................................................................</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <p><strong>Nationalité :</strong> .................................................................</p>
                                    <p><strong>Sexe :</strong> ..........................................................................</p>
                                </div>
                                <p><strong>Adresse :</strong> ......................................................................................................................................................</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <p><strong>Téléphone :</strong> ......................................................................</p>
                                    <p><strong>Adresse e-mail :</strong> ................................................................</p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold border-b border-gray-200 pb-2 mb-4">II. INFORMATIONS DU PARENT / TUTEUR LÉGAL (POUR LES MINEURS)</h2>
                                <div className="space-y-3">
                                <p><strong>Nom et Prénom :</strong> ............................................................................................................................................</p>
                                <p><strong>Lien de parenté :</strong> (Père / Mère / Tuteur) : ..................................................................................................</p>
                                <p><strong>N° de CIN :</strong> ........................................................................................................................................................</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <p><strong>Téléphone :</strong> ......................................................................</p>
                                    <p><strong>Adresse e-mail :</strong> ................................................................</p>
                                </div>
                            </div>
                        </section>
                        
                        <section className="pt-4">
                            <h2 className="text-xl font-semibold border-b border-gray-200 pb-2 mb-4">III. AUTORISATION ET DÉCLARATION</h2>
                            <p className="text-sm leading-relaxed">
                                Je soussigné(e), ......................................................................................................................., certifie que les informations ci-dessus sont exactes. J'autorise mon enfant, ......................................................................................................................., à participer aux activités sportives, aux entraînements et aux matchs organisés par le club.
                            </p>
                             <p className="text-sm font-semibold leading-relaxed mt-4">
                                Je prends également connaissance que cette fiche, une fois remplie et signée, devra être légalisée auprès de la commune urbaine pour être valide.
                            </p>
                        </section>
                    </div>
                     <footer className="p-8 pt-12 border-t border-gray-200">
                        <div className="w-full text-sm">
                            <p className="mb-12">Fait à ........................................................................., le ..............................................................</p>
                            <p className="text-center"><strong>Signature du parent / tuteur (légalisée) :</strong></p>
                            <div className="h-16"></div>
                        </div>
                    </footer>
                </div>
            </div>
        </div>
    );
}


"use client";

import { Button } from "@/components/ui/button";
import { Trophy, ArrowLeft, FileDown } from "lucide-react";
import Link from 'next/link';

export default function RegistrationFormPage() {
    
    // This string contains the raw HTML for the print button.
    // By using a simple `onclick`, we bypass any potential React event handling issues.
    const printButtonHtml = `
        <button 
            onclick="window.print()" 
            class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M12 17h.01"/><path d="M17 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4l-4-2Z"/><path d="M7 2v4h10V2"/><path d="M15 13a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>
            Partager la fiche en tant que fichier (PDF)
        </button>
    `;

    return (
        <div className="bg-gray-100 dark:bg-gray-800 min-h-screen">
            <style jsx global>{`
                body {
                    background-color: white !important;
                }
                @media print {
                    body {
                        background-color: white !important;
                        -webkit-print-color-adjust: exact;
                    }
                    .print-hidden {
                        display: none !important;
                    }
                    .printable-content {
                        box-shadow: none !important;
                        border: none !important;
                        margin: 0;
                        padding: 0;
                    }
                }
            `}</style>

            <div className="max-w-4xl mx-auto p-4 sm:p-8">
                <div className="mb-8 flex justify-between items-center print-hidden">
                    <Button variant="outline" asChild>
                        <Link href="/dashboard/reports">
                           <ArrowLeft className="mr-2 h-4 w-4" />
                           Retour
                        </Link>
                    </Button>
                    {/* We render the button using dangerouslySetInnerHTML to ensure the onclick fires */}
                    <div dangerouslySetInnerHTML={{ __html: printButtonHtml }} />
                </div>

                <div id="printable-form" className="printable-content bg-white rounded-lg border shadow-sm p-8 text-black">
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

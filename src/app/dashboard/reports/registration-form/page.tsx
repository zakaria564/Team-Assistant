
"use client";

import { Button } from "@/components/ui/button";
import { Trophy, ArrowLeft, Printer } from "lucide-react";
import Link from 'next/link';

export default function RegistrationFormPage() {

    const buttonContainerHTML = `
        <div class="mb-8 flex flex-col sm:flex-row justify-start items-center gap-4 print-hidden">
            <a href="/dashboard/reports" class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2 h-4 w-4"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                Retour
            </a>
            <button onclick="window.print()" class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2 h-4 w-4"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
                Imprimer / Enregistrer en PDF
            </button>
        </div>
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
                <div dangerouslySetInnerHTML={{ __html: buttonContainerHTML }} />

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


"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Trophy } from "lucide-react";

export default function RegistrationFormPage() {

    useEffect(() => {
        // Trigger print dialog automatically when the component mounts
        window.print();
    }, []);

    return (
        <div className="bg-white text-black">
            <Card className="w-full mx-auto shadow-none border-none" id="printable-form">
                <CardHeader className="p-8">
                    <div className="flex flex-col items-center text-center">
                        <Trophy className="h-12 w-12 text-primary" />
                        <h1 className="text-2xl font-bold mt-2">FICHE D'INSCRIPTION CLUB DE FOOTBALL</h1>
                        <p className="text-lg font-medium mt-1">Saison sportive : ........................</p>
                    </div>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold border-b pb-2">I. INFORMATIONS DU JOUEUR</h2>
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
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold border-b pb-2">II. INFORMATIONS DU PARENT / TUTEUR LÉGAL (POUR LES MINEURS)</h2>
                            <div className="space-y-3">
                            <p><strong>Nom et Prénom :</strong> ............................................................................................................................................</p>
                            <p><strong>Lien de parenté :</strong> (Père / Mère / Tuteur) : ..................................................................................................</p>
                            <p><strong>N° de CIN :</strong> ........................................................................................................................................................</p>
                            <div className="grid grid-cols-2 gap-4">
                                    <p><strong>Téléphone :</strong> ......................................................................</p>
                                <p><strong>Adresse e-mail :</strong> ................................................................</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold border-b pb-2">III. DOCUMENTS À FOURNIR</h2>
                            <p className="text-sm">Veuillez joindre au dossier les documents suivants :</p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>Copie légalisée de la CIN du joueur ou passeport (si disponible).</li>
                            <li>Copie légalisée de la CIN du parent/tuteur.</li>
                            <li>Extrait d'acte de naissance du joueur.</li>
                            <li>Certificat médical d'aptitude à la pratique du football.</li>
                            <li>Photos d'identité récentes.</li>
                        </ul>
                    </div>

                    <div className="space-y-4 pt-4">
                        <h2 className="text-xl font-semibold border-b pb-2">IV. AUTORISATION ET DÉCLARATION</h2>
                        <p className="text-sm leading-relaxed">
                            Je soussigné(e), ......................................................................................................................., certifie que les informations ci-dessus sont exactes. J'autorise mon enfant, ......................................................................................................................., à participer aux activités sportives, aux entraînements et aux matchs organisés par le club.
                        </p>
                        <p className="text-sm font-semibold leading-relaxed">
                            Je prends également connaissance que cette fiche, une fois remplie et signée, devra être légalisée auprès de la commune urbaine pour être valide.
                        </p>
                    </div>
                </CardContent>
                <CardFooter className="p-8">
                        <div className="w-full text-sm">
                            <p className="mb-12">Fait à ........................................................................., le ..............................................................</p>
                            <p className="text-center"><strong>Signature du parent / tuteur (légalisée) :</strong></p>
                            <div className="h-16"></div>
                        </div>
                </CardFooter>
            </Card>
            <style jsx global>{`
                @media print {
                    body {
                        margin: 0;
                        padding: 0;
                    }
                }
                @page {
                    size: A4;
                    margin: 1.5cm;
                }
            `}</style>
        </div>
    );
}

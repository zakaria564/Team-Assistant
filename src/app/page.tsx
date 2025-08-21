import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, BarChart, Sparkles } from "lucide-react";
import Image from "next/image";

export default function Home() {
  const features = [
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: "Gestion des Joueurs",
      description: "Suivez les informations de vos joueurs, de l'inscription à la performance.",
    },
    {
      icon: <BarChart className="h-8 w-8 text-primary" />,
      title: "Statistiques & Rapports",
      description: "Générez des rapports détaillés sur les présences, les matchs et les finances.",
    },
    {
      icon: <Sparkles className="h-8 w-8 text-primary" />,
      title: "Suggestions par IA",
      description: "Obtenez des recommandations de postes et des régimes d'entraînement personnalisés.",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Trophy className="h-6 w-6 text-primary" />
            <span className="font-bold">Team Assistant</span>
          </Link>
          <div className="flex flex-1 items-center justify-end space-x-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Se connecter</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">S'inscrire</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
          <div className="mx-auto flex max-w-[980px] flex-col items-center gap-2">
            <h1 className="text-center text-3xl font-extrabold leading-tight tracking-tighter sm:text-3xl md:text-5xl lg:text-6xl">
              La gestion de votre club de foot, <br className="hidden sm:inline" />
              simplifiée et intelligente.
            </h1>
            <p className="max-w-[700px] text-center text-lg text-muted-foreground sm:text-xl">
              De la gestion des joueurs aux rapports de performance, Team Assistant est l'outil tout-en-un pour les administrateurs de clubs.
            </p>
          </div>
          <div className="mx-auto flex w-full max-w-sm items-center space-x-4 md:max-w-xl">
            <Button asChild size="lg" className="w-full md:w-auto">
              <Link href="/signup">Commencer gratuitement</Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="w-full md:w-auto">
               <Link href="/dashboard">Voir la démo</Link>
            </Button>
          </div>
          <div className="relative mx-auto mt-8 w-full max-w-5xl">
            <div className="absolute -inset-2 rounded-lg bg-gradient-to-r from-primary to-accent opacity-75 blur"></div>
            <Image
              src="https://placehold.co/1200x600.png"
              alt="Team Assistant Dashboard"
              width={1200}
              height={600}
              className="relative rounded-lg border shadow-lg"
              data-ai-hint="football dashboard"
            />
          </div>
        </section>
        <section id="features" className="container space-y-6 bg-slate-50/50 py-8 dark:bg-transparent md:py-12 lg:py-24">
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
            <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-5xl">
              Fonctionnalités
            </h2>
            <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
              Tout ce dont vous avez besoin pour gérer votre club efficacement.
            </p>
          </div>
          <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
            {features.map((feature, i) => (
              <Card key={i}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {feature.icon}
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
      <footer className="py-6 md:px-8 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
            © {new Date().getFullYear()} Team Assistant. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}

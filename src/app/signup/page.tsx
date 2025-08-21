import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trophy } from "lucide-react"

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="mx-auto max-w-sm w-full">
        <CardHeader className="space-y-2 text-center">
            <Link href="/" className="inline-block">
                <Trophy className="mx-auto h-8 w-8 text-primary" />
            </Link>
            <CardTitle className="text-2xl">Créer un compte</CardTitle>
            <CardDescription>
            Entrez vos informations pour créer un compte
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid gap-4">
            <div className="grid gap-2">
                <Label htmlFor="full-name">Nom complet</Label>
                <Input id="full-name" placeholder="Prénom Nom" required />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                id="email"
                type="email"
                placeholder="m@exemple.com"
                required
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input id="password" type="password" />
            </div>
            <Button type="submit" className="w-full" asChild>
              <Link href="/dashboard">Créer un compte</Link>
            </Button>
            </div>
            <div className="mt-4 text-center text-sm">
            Vous avez déjà un compte?{" "}
            <Link href="/login" className="underline">
                Se connecter
            </Link>
            </div>
        </CardContent>
        </Card>
    </div>
  )
}

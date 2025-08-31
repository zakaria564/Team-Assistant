"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";

export function AppearanceSettings() {
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        const isDark = document.documentElement.classList.contains('dark');
        setIsDarkMode(isDark);
    }, []);

    const toggleDarkMode = (checked: boolean) => {
        setIsDarkMode(checked);
        if (checked) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }

    return (
        <Card>
          <CardHeader>
            <CardTitle>Apparence</CardTitle>
            <CardDescription>Personnalisez l'apparence de l'application.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
                <Switch 
                    id="dark-mode" 
                    checked={isDarkMode}
                    onCheckedChange={toggleDarkMode}
                />
                <Label htmlFor="dark-mode">Mode Sombre</Label>
            </div>
          </CardContent>
        </Card>
    );
}

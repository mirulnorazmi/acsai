import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface AuthCardProps {
  title: string
  description?: string
  children: React.ReactNode
  footerLink?: {
    label: string
    href: string
    text: string
  }
}

export function AuthCard({
  title,
  description,
  children,
  footerLink,
}: AuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-card border-border/50 bg-card/50 backdrop-blur-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            {title}
          </CardTitle>
          {description && (
            <CardDescription className="text-muted-foreground">
              {description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>{children}</CardContent>
        {footerLink && (
          <CardFooter className="justify-center text-sm text-muted-foreground">
            {footerLink.text}{" "}
            <Link
              href={footerLink.href}
              className="ml-1 font-medium text-primary hover:text-primary/80 hover:underline transition-colors"
            >
              {footerLink.label}
            </Link>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}

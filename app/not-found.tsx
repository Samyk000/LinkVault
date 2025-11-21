import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground">
            <h1 className="text-9xl font-black tracking-tighter opacity-10">404</h1>
            <div className="absolute flex flex-col items-center gap-4">
                <h2 className="text-2xl font-bold md:text-4xl">Page Not Found</h2>
                <p className="text-muted-foreground text-center max-w-[500px]">
                    The page you are looking for doesn't exist or has been moved.
                </p>
                <Button asChild className="mt-4">
                    <Link href="/">Return Home</Link>
                </Button>
            </div>
        </div>
    )
}

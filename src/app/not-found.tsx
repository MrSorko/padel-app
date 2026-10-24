import Link from "next/link";
import { BallMark } from "@/components/icons";
import { buttonStyles } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="safe-top court-hero flex flex-1 flex-col px-5 pb-10 text-white">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <BallMark className="size-14" />
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Bollen gick ut</h1>
        <p className="mt-2 mb-8 text-court-200">Sidan finns inte, eller så har den tagits bort.</p>
        <Link href="/" className={buttonStyles.primary}>
          Till startsidan
        </Link>
      </div>
    </main>
  );
}

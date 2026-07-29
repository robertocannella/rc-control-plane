import Image from "next/image";
import { auth, signIn } from "@/auth";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6">
        <h1 className="text-2xl font-semibold">Roberto Cannella</h1>
        <h2 className="text-lg text-gray-600">Docs, Ideas, and Tools.</h2>
        <form

          action={async () => {
            "use server";
            await signIn("google");
          }}
        >
          <button
            type="submit"
            className="rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800"
          >
            Sign in with Google
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4">
      {session.user.image && (
        <Image
          src={session.user.image}
          alt={session.user.name ?? "User avatar"}
          width={64}
          height={64}
          className="rounded-full"
        />
      )}
      <p className="text-lg">Signed in as {session.user.email}</p>
    </main>
  );
}

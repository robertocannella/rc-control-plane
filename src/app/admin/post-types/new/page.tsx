import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listPostTypes } from "@/lib/post-types";
import { PostTypeForm } from "../PostTypeForm";
import { buildIconPickerOptions } from "../icon-options";

export default async function NewPostTypePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  if (!session.user.scopes.includes("admin")) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="text-gray-600">
          Your account ({session.user.email}) doesn&apos;t have admin access.
        </p>
      </main>
    );
  }

  const postTypes = await listPostTypes();
  const iconOptions = await buildIconPickerOptions();

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">New post type</h1>
      <PostTypeForm mode="create" postTypes={postTypes} iconOptions={iconOptions} />
    </main>
  );
}

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/server";

export default async function Home() {
  const session = await getSessionUser();
  redirect(session ? "/recruiting" : "/careers");
}

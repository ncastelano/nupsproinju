import { redirect } from "next/navigation";

// A primeira página do sistema é o formulário.
export default function Home() {
  redirect("/formulario");
}

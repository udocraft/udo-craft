import { CabinetShell } from "./_components/CabinetShell";

export default function CabinetAppLayout({ children }: { children: React.ReactNode }) {
  return <CabinetShell>{children}</CabinetShell>;
}

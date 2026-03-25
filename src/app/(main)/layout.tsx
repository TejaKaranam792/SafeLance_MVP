import AppNavbar from "@/components/AppNavbar";

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AppNavbar />
      <div className="pt-6 pb-20">
        {children}
      </div>
    </>
  );
}

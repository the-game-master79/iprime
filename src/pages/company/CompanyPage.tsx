import { PageTransition } from "@/components/ui-components";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { Hero } from "@/components/shared/Hero";
import { Companies } from "@/components/shared/Companies";
import { Building, Lightning } from "@phosphor-icons/react";

const CompanyPage = () => {
  return (
    <PageTransition>
      <div className="min-h-screen bg-[#F3F4F6]">
        {/* Magic Gradient Background */}
        <div className="fixed inset-0 -z-5 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse-slower" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-r from-pink-500/20 to-orange-500/20 rounded-full blur-3xl animate-pulse-slowest" />
        </div>

        <Navbar />

        <main className="relative z-10">
          <Hero 
            badge={{
              icon: <Building className="h-5 w-5 animate-pulse" />,
              text: "About Us"
            }}
            title="Our Company"
            description="Learn about our mission, vision, and commitment to excellence in trading."
            action={{
              text: "Get Started",
              href: "/auth/login"
            }}
          />

          <Companies />

          {/* Add company-specific content here */}
        </main>

        <Footer />
      </div>
    </PageTransition>
  );
};

export default CompanyPage;

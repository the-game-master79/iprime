import { PageTransition } from "@/components/ui-components";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";

const TermsOfService = () => {
  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container max-w-4xl mx-auto px-4 pt-24 pb-12">
          <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
          
          <div className="prose prose-blue max-w-none space-y-8">
            <p className="text-lg text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p className="mb-4">
                By accessing and using CloudForex's services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Account Registration</h2>
              <p className="mb-4">When registering for an account, you agree to:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Provide accurate and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Be at least 18 years old or legal age in your jurisdiction</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Trading Risks</h2>
              <p className="mb-4">You acknowledge and accept that:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Trading carries inherent financial risks</li>
                <li>Past performance does not guarantee future results</li>
                <li>You may lose some or all of your invested capital</li>
                <li>You should only trade with funds you can afford to lose</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Service Availability</h2>
              <p className="mb-4">
                While we strive to maintain consistent service availability, we cannot guarantee uninterrupted access to our platform. We reserve the right to:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Modify or discontinue services without notice</li>
                <li>Perform maintenance during off-peak hours</li>
                <li>Restrict access in case of suspicious activity</li>
                <li>Update platform features and functionality</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Prohibited Activities</h2>
              <p className="mb-4">Users are prohibited from:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Manipulating market data or platform functionality</li>
                <li>Using unauthorized automated trading systems</li>
                <li>Engaging in fraudulent or illegal activities</li>
                <li>Violating applicable laws and regulations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Termination</h2>
              <p className="mb-4">
                We reserve the right to suspend or terminate accounts that violate these terms, with or without notice. Upon termination:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Access to services will be revoked</li>
                <li>Pending transactions may be cancelled</li>
                <li>Account balances will be settled according to our policies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Contact Us</h2>
              <p className="mb-4">
                For questions about these Terms of Service, please contact us at:
              </p>
              <div className="pl-6">
                <p>Email: support@cloudforex.com</p>
                <p>Address: 123 Trading Street, Financial District</p>
                <p>Phone: +1 (555) 123-4567</p>
              </div>
            </section>
          </div>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default TermsOfService;

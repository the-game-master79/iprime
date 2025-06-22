import { PageTransition } from "@/components/ui-components";
import { Footer } from "@/components/shared/Footer";

const PrivacyPolicy = () => {
  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <main className="container max-w-4xl mx-auto px-4 pt-24 pb-12">
          <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
          
          <div className="prose prose-blue max-w-none space-y-8">
            <p className="text-lg text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
              <p className="mb-4">We collect information that you provide directly to us, including:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Account information (name, email, password)</li>
                <li>Identity verification documents</li>
                <li>Transaction data</li>
                <li>Communication preferences</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
              <p className="mb-4">We use the information we collect to:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Process your transactions and maintain your account</li>
                <li>Verify your identity and prevent fraud</li>
                <li>Send you important updates about our services</li>
                <li>Improve our platform and customer experience</li>
                <li>Comply with legal and regulatory requirements</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Information Security</h2>
              <p className="mb-4">
                We implement appropriate security measures to protect your personal information, including:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Encryption of sensitive data</li>
                <li>Regular security assessments</li>
                <li>Access controls and authentication measures</li>
                <li>Secure data storage and transmission</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Data Sharing and Third Parties</h2>
              <p className="mb-4">
                We may share your information with:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Service providers who assist in our operations</li>
                <li>Financial institutions to process transactions</li>
                <li>Regulatory authorities when required by law</li>
                <li>Law enforcement agencies in case of investigations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Your Rights</h2>
              <p className="mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Access your personal information</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Opt-out of marketing communications</li>
                <li>File a complaint with regulatory authorities</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Contact Us</h2>
              <p className="mb-4">
                If you have any questions about this Privacy Policy, please contact us at:
              </p>
              <div className="pl-6">
                <p>Email: privacy@arthaa.com</p>
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

export default PrivacyPolicy;

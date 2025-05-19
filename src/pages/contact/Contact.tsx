import { PageTransition } from "@/components/ui-components";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const Contact = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Add your form submission logic here
    toast({
      title: "Message sent",
      description: "We'll get back to you as soon as possible.",
    });
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative">
        {/* Decorative background gradient */}
        <div className="absolute inset-0 pointer-events-none -z-10">
          <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary/10 to-transparent blur-2xl" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-secondary/10 to-transparent blur-2xl" />
        </div>
        <Navbar />
        <main className="container max-w-2xl mx-auto px-4 py-12">
          <div className="mb-8 text-center">
            <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-b from-primary to-foreground bg-clip-text text-transparent mb-2">
              Contact Us
            </h1>
            <p className="text-muted-foreground text-lg">
              Our team is here to help. Fill out the form and we’ll be in touch soon.
            </p>
          </div>
          <div className="bg-card border border-border/60 rounded-2xl shadow-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Name</label>
                <Input 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  className="bg-background/80"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Email</label>
                <Input 
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  className="bg-background/80"
                  placeholder="you@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Subject</label>
                <Input 
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  required
                  className="bg-background/80"
                  placeholder="How can we help you?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Message</label>
                <Textarea 
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  required
                  className="min-h-[150px] bg-background/80"
                  placeholder="Type your message here..."
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold text-lg rounded-xl shadow transition"
              >
                Send Message
              </Button>
            </form>
          </div>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default Contact;

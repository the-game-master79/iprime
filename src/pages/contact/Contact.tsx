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
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container max-w-2xl mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold mb-8">Contact Us</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <Input 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <Input 
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Subject</label>
              <Input 
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Message</label>
              <Textarea 
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                required
                className="min-h-[150px]"
              />
            </div>
            <Button type="submit" className="w-full">Send Message</Button>
          </form>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default Contact;

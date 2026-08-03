import { supabase } from '@/integrations/supabase/client';

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string | null;
  image: string;
  text: string;
}

export const fetchTestimonials = async (): Promise<Testimonial[]> => {
  const { data, error } = await supabase
    .from('testimonials')
    .select('id, name, role, company, image_url, text')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching testimonials:', error);
    return [];
  }

  return data.map(testimonial => ({
    id: testimonial.id,
    name: testimonial.name,
    role: testimonial.role,
    company: testimonial.company,
    image: testimonial.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(testimonial.name)}&background=random`,
    text: testimonial.text
  }));
};

export const testimonials = [
  {
    text: "The heavyweight tee feels considered from the first wear. The fit is relaxed without looking oversized.",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=150&h=150&fit=crop&crop=faces",
    name: "Priya Sharma",
    role: "Verified Customer",
  },
  {
    text: "The shirt arrived beautifully packed and the fabric feels far more premium than the price suggests.",
    image: "https://images.unsplash.com/photo-1567532939604-b6b5b0e1607d?w=150&h=150&fit=crop&crop=faces",
    name: "Rajesh Patel",
    role: "Corporate Client",
  },
  {
    text: "Finally, essentials that work together without making the wardrobe feel repetitive.",
    image: "https://images.unsplash.com/photo-1563375853373-15b7816d3c3d?w=150&h=150&fit=crop&crop=faces",
    name: "Ananya Desai",
    role: "Style Consultant",
  },
  {
    text: "Clean silhouettes, great finishing and a genuinely easy buying experience.",
    image: "https://images.unsplash.com/photo-1549476464-37392f717541?w=150&h=150&fit=crop&crop=faces",
    name: "Meera Iyer",
    role: "Creative Director",
  },
  {
    text: "crownveil has become my default for well-cut everyday layers. Everything feels intentional.",
    image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=150&h=150&fit=crop&crop=faces",
    name: "Vikram Singh",
    role: "Verified Customer",
  },
  {
    text: "Fast dispatch, clear updates and pieces that look just as good in person.",
    image: "https://images.unsplash.com/photo-1567532939604-b6b5b0e1607d?w=150&h=150&fit=crop&crop=faces",
    name: "Sunita Reddy",
    role: "Regular Customer",
  },
  {
    text: "The overshirt is the kind of piece that makes every outfit feel more put together.",
    image: "https://images.unsplash.com/photo-1519351414974-61d8e594c5d6?w=150&h=150&fit=crop&crop=faces",
    name: "Arjun Malhotra",
    role: "Entrepreneur",
  },
  {
    text: "The product details are clear and the quality is exactly as described. No guesswork.",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=150&h=150&fit=crop&crop=faces",
    name: "Kavita Nair",
    role: "Verified Customer",
  },
  {
    text: "The tailoring is understated and versatile. I have worn the trousers every week since they arrived.",
    image: "https://images.unsplash.com/photo-1549476464-37392f717541?w=150&h=150&fit=crop&crop=faces",
    name: "Deepak Bose",
    role: "Architect",
  },
];

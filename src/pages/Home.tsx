import React from 'react';
import Header from '../components/Header';
import HeroSection from '../components/HeroSection';
import ProductsSection from '../components/ProductsSection';
import Marquee from '../components/Marquee';
import QuoteCakeSection from '../components/QuoteCakeSection';
import IngredientsSection from '../components/IngredientsSection';
import CallToAction from '../components/CallToAction';
import { Cake, Dessert, Cookie } from 'lucide-react';

const PRODUCTS = [
  { 
    name: "Tortas", 
    desc: "Amapola, Arándanos, Zanahoria y Chocolate. Desde 1/4 libra hasta 1 libra.", 
    isCategory: true, 
    price: 50000, 
    bg: "var(--wine)", 
    color: "var(--blush)", 
    label: "Tortas.", 
    href: "/tortas",
    icon: <Cake size={24} strokeWidth={2.4} color="#7B1A10" />
  },
  { 
    name: "Galletas", 
    desc: "Nutella, Red velvet y Oreo. Individuales ($8.000), combo 3x ($22.000) o caja 6x ($45.000).", 
    isCategory: true, 
    price: 8000, 
    bg: "var(--petal)", 
    color: "var(--wine)", 
    label: "Galletas.", 
    href: "/galletas",
    icon: <Cookie size={24} strokeWidth={2.4} color="#FFF0F3" />
  },
  { 
    name: "Postres", 
    desc: "Genovesa tradicional tres leches y Flan de caramelo artesanal.", 
    isCategory: true, 
    price: 55000, 
    bg: "var(--wine2)", 
    color: "var(--blush)", 
    label: "Postres.", 
    href: "/postres",
    icon: <Dessert size={24} strokeWidth={2.4} color="#7B1A10" />
  }
];

const INGREDIENTS = [
  { name: "1. Elige tu categoría", desc: "Explora nuestras 3 especialidades: Tortas, Galletas o Postres recién horneados." },
  { name: "2. Selecciona la presentación", desc: "Elige la porción adecuada (1/4 lb, 1/2 lb, 1 lb o combos de galletas) para tu ocasión." },
  { name: "3. Confirma tu pedido", desc: "Revisa tu horno (carrito) y procede al checkout con tus datos de envío o vía WhatsApp." },
  { name: "4. Disfruta", desc: "Te entregamos tus delicias frescas y listas para disfrutar." }
];

const Home: React.FC = () => {
  return (
    <>
      <Header />
      <HeroSection />
      <ProductsSection products={PRODUCTS} />
      <Marquee />
      <QuoteCakeSection />
      <IngredientsSection ingredients={INGREDIENTS} />
      <CallToAction />
    </>
  );
};

export default Home;

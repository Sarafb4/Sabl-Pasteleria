export interface Presentation {
  label: string;
  portions?: string;
  price: number;
}

export interface MenuItem {
  id: string;
  name: string;
  category: 'tortas' | 'postres' | 'galletas';
  desc: string;
  badge?: string;
  image?: string;
  images?: string[];
  available?: boolean;
  presentations: Presentation[];
  bg?: string;
  color?: string;
}

export const TORTAS: MenuItem[] = [
  {
    id: 'torta-amapola',
    name: 'Amapola',
    category: 'tortas',
    desc: 'Bizcocho esponjoso con semillas de amapola y suave glaseado artesanal.',
    badge: 'Favorito',
    presentations: [
      { label: '1/4 libra', portions: '8 porciones', price: 60000 },
      { label: '1/2 libra', portions: '16 porciones', price: 70000 },
      { label: '1 libra', portions: '30 porciones', price: 130000 }
    ]
  },
  {
    id: 'torta-arandanos',
    name: 'Arándanos',
    category: 'tortas',
    desc: 'Torta suave con abundantes arándanos frescos de cosecha seleccionada.',
    presentations: [
      { label: '1/4 libra', portions: '8 porciones', price: 65000 },
      { label: '1/2 libra', portions: '16 porciones', price: 80000 },
      { label: '1 libra', portions: '30 porciones', price: 140000 }
    ]
  },
  {
    id: 'torta-zanahoria',
    name: 'Zanahoria',
    category: 'tortas',
    desc: 'Receta tradicional con zanahoria fresca, especias dulces y crema suave.',
    presentations: [
      { label: '1/4 libra', portions: '8 porciones', price: 50000 },
      { label: '1/2 libra', portions: '16 porciones', price: 65000 }
    ]
  },
  {
    id: 'torta-chocolate',
    name: 'Chocolate',
    category: 'tortas',
    desc: 'Intenso bizcochuelo de chocolate puro con generoso relleno de cacao.',
    badge: 'Imperdible',
    presentations: [
      { label: '1/4 libra', portions: '8 porciones', price: 75000 },
      { label: '1/2 libra', portions: '16 porciones', price: 130000 }
    ]
  }
];

export const POSTRES: MenuItem[] = [
  {
    id: 'postre-genovesa',
    name: 'Genovesa',
    category: 'postres',
    desc: 'Bizcochuelo bañado en cremosa mezcla tres leches casera y suave chantilly.',
    badge: 'Especialidad',
    image: '/genovesa.jpg',
    presentations: [
      { label: '1/4 libra', portions: '8 porciones', price: 55000 },
      { label: '1/2 libra', portions: '16 porciones', price: 60000 },
      { label: '1 libra', portions: '20-25 porciones', price: 120000 }
    ]
  },
  {
    id: 'postre-flan-caramelo',
    name: 'Flan de caramelo',
    category: 'postres',
    desc: 'Natilla de caramelo tradicional cocida a fuego lento con textura sedosa.',
    image: '/flan_caramelo.jpg',
    presentations: [
      { label: '1/2 libra', portions: '15-20 porciones', price: 65000 }
    ]
  }
];

export const GALLETAS: MenuItem[] = [
  {
    id: 'galleta-nutella',
    name: 'Nutella',
    category: 'galletas',
    desc: 'Galleta dorada rellena de abundante Nutella derretida.',
    badge: 'Top ventas',
    presentations: [
      { label: '1 Unidad', price: 8000 },
      { label: '3 Unidades (3x)', price: 22000 },
      { label: '6 Unidades (6x)', price: 45000 }
    ]
  },
  {
    id: 'galleta-red-velvet',
    name: 'Red velvet',
    category: 'galletas',
    desc: 'Masa terciopelo rojo con suave corazón y chispas de chocolate.',
    presentations: [
      { label: '1 Unidad', price: 8000 },
      { label: '3 Unidades (3x)', price: 22000 },
      { label: '6 Unidades (6x)', price: 45000 }
    ]
  },
  {
    id: 'galleta-oreo',
    name: 'Oreo',
    category: 'galletas',
    desc: 'Crocante combinación de galleta artesanal con trozos generosos de Oreo.',
    presentations: [
      { label: '1 Unidad', price: 8000 },
      { label: '3 Unidades (3x)', price: 22000 },
      { label: '6 Unidades (6x)', price: 45000 }
    ]
  },
  {
    id: 'galleta-mix-surtido',
    name: 'Mix Surtido Sablée',
    category: 'galletas',
    desc: 'Combina tus sabores preferidos (Nutella, Red velvet y Oreo) en una misma caja.',
    badge: 'Para compartir',
    presentations: [
      { label: 'Caja x3 (Surtida)', price: 22000 },
      { label: 'Caja x6 (Surtida)', price: 45000 }
    ]
  }
];


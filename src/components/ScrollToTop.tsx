import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Cada vez que el usuario cambia de página o ruta (ej: de Home a /tortas),
 * este componente devuelve automáticamente la vista al inicio (arriba del todo).
 */
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    });
  }, [pathname]);

  return null;
};

export default ScrollToTop;


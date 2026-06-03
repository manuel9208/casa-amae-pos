import React, { useState } from 'react';
import FormularioProducto from './menu/FormularioProducto';
import ListaProductos from './menu/ListaProductos';

const AdminMenu = ({
  productos, clasificaciones, catalogoIngredientes, EMOJIS_POR_GIRO, 
  baseUrl, apiUrl, refrescarDatos, showAlert, showConfirm
}) => {
  const [categoriaSelect, setCategoriaSelect] = useState('');
  const [productoEditando, setProductoEditando] = useState(null);

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-12 px-4">
      
      <FormularioProducto 
        productos={productos}
        clasificaciones={clasificaciones}
        catalogoIngredientes={catalogoIngredientes}
        EMOJIS_POR_GIRO={EMOJIS_POR_GIRO}
        apiUrl={apiUrl}
        refrescarDatos={refrescarDatos}
        showAlert={showAlert}
        categoriaSelect={categoriaSelect}
        setCategoriaSelect={setCategoriaSelect}
        productoEditando={productoEditando}
        setProductoEditando={setProductoEditando}
      />

      <ListaProductos 
        productos={productos}
        clasificaciones={clasificaciones}
        categoriaSelect={categoriaSelect}
        baseUrl={baseUrl}
        apiUrl={apiUrl}
        refrescarDatos={refrescarDatos}
        showAlert={showAlert}
        showConfirm={showConfirm}
        setProductoEditando={setProductoEditando}
      />

    </div>
  );
};

export default AdminMenu;
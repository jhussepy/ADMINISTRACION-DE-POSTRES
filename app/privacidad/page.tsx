import { PageHeader } from "@/components/page-header";
export const metadata = { title: "Privacidad" };
export default function Privacy() {
  return (
    <>
      <PageHeader />
      <main className="state-page privacy">
        <span className="eyebrow">REPOSTERÍA YEMAPE</span>
        <h1>Tus datos, con claridad.</h1>
        <h2>Cuando armas tu carrito</h2>
        <p>
          Guardamos en este navegador los identificadores de los productos y sus
          cantidades para conservar tu selección. Puedes quitarlos desde el
          carrito o borrando los datos de este sitio en tu navegador.
        </p>
        <h2>Cuando coordinas por WhatsApp</h2>
        <p>
          Usamos el nombre, dirección si solicitas delivery, fecha deseada y
          observaciones que escribas para preparar el mensaje de tu pedido. Los
          datos se procesan para generar el enlace, pero no se guardan como un
          pedido confirmado en la web. Tú decides enviar el mensaje desde
          WhatsApp; allí también se aplican las condiciones de ese servicio.
        </p>
        <h2>Si eliges crear una cuenta</h2>
        <p>
          Cuando el servicio de cuentas esté habilitado, usaremos Supabase para
          autenticar tu correo y guardar los datos de perfil que decidas
          completar. La sesión utiliza cookies. Tu contraseña es gestionada por
          el servicio de autenticación y no se publica ni se guarda en el código
          de la tienda.
        </p>
        <h2>Información de pedidos</h2>
        <p>
          Cuando coordinas una compra, el negocio puede registrar los datos
          necesarios para prepararla, gestionar adelantos y entregas. El panel
          de administración requiere autorización.
        </p>
        <h2>Consultas sobre tus datos</h2>
        <p>
          Puedes pedirnos revisar, corregir o eliminar tus datos escribiendo al
          WhatsApp de Repostería Yemape:{" "}
          <a className="text-link" href="https://wa.me/51934219749">
            934 219 749
          </a>
          .
        </p>
      </main>
    </>
  );
}

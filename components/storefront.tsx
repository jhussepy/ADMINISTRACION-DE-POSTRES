"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CakeSlice,
  IceCreamBowl,
  ChefHat,
  Cookie,
  Heart,
  Instagram,
  Menu,
  MessageCircle,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Truck,
  UserRound,
  X,
  Sandwich,
  Check,
  MapPin,
} from "lucide-react";
import {
  CART_KEY,
  MAX_QUANTITY,
  cartSummary,
  checkoutError,
  limaToday,
  money,
  normalizeCart,
} from "@/lib/cart";
import { prepareCheckout } from "@/app/checkout-action";
import type { CartItem, CheckoutDetails, Product, Profile } from "@/lib/types";
import { categories } from "@/lib/types";
import { ProductDetails } from "./product-details";
import { StoreFaq } from "./store-faq";
type Account = {
  name: string;
  email: string;
  profile: Profile | null;
  isAdmin: boolean;
} | null;
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const categoryIcons = {
  Todos: Heart,
  Cheesecakes: CakeSlice,
  Tortas: ChefHat,
  Kekes: Cookie,
  Postres: IceCreamBowl,
  Salados: Sandwich,
};
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Yemape, inicio">
      <span>
        Yemape<span className="brand-dot">♡</span>
      </span>
      <small>REPOSTERÍA ARTESANAL</small>
    </Link>
  );
}
export function Storefront({
  products,
  account,
}: {
  products: Product[];
  account: Account;
}) {
  const [cart, setCart] = useState<CartItem[]>([]),
    [ready, setReady] = useState(false),
    [storageError, setStorageError] = useState(false);
  const [category, setCategory] = useState("Todos"),
    [query, setQuery] = useState(""),
    [menu, setMenu] = useState(false),
    [cartOpen, setCartOpen] = useState(false),
    [notice, setNotice] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const detailTrigger = useRef<HTMLElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    try {
      setCart(
        normalizeCart(
          JSON.parse(localStorage.getItem(CART_KEY) ?? "[]"),
          products,
        ),
      );
    } catch {
      setCart([]);
    }
    setReady(true);
  }, [products]);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
      } catch {
        setStorageError(true);
      }
  }, [cart, ready]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const summary = cartSummary(cart, products);
  const featured =
    products.find((p) => p.id === "torta-chocolate") ?? products[0];
  const visible = products.filter(
    (p) =>
      (category === "Todos" || p.category === category) &&
      normalize(`${p.name} ${p.description}`).includes(normalize(query.trim())),
  );
  function scrollToCatalog() {
    document.getElementById("catalogo")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
  const choose = (value: string) => {
    setCategory(value);
    scrollToCatalog();
  };
  function quantity(id: string, amount: number) {
    setCart((prev) => {
      const current = prev.find((p) => p.id === id)?.quantity ?? 0;
      const next = current + amount;
      if (next < 1) return prev.filter((p) => p.id !== id);
      if (next > MAX_QUANTITY) return prev;
      return current
        ? prev.map((p) => (p.id === id ? { ...p, quantity: next } : p))
        : [...prev, { id, quantity: next }];
    });
  }
  function add(product: Product, amount = 1) {
    quantity(product.id, amount);
    setNotice(`${amount} × ${product.name} agregado a tu carrito`);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(""), 3000);
  }
  return (
    <>
      <a className="skip-link" href="#catalogo">
        Ir al catálogo
      </a>
      <div className="announcement">
        Hecho para compartir, preparado con cariño{" "}
        <Heart size={13} aria-hidden="true" />
      </div>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <form
            className="header-search"
            onSubmit={(e) => {
              e.preventDefault();
              scrollToCatalog();
            }}
          >
            <Search size={19} aria-hidden="true" />
            <input
              aria-label="Buscar postres"
              placeholder="¿Qué se te antoja hoy?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setQuery("");
              }}
            />
            {query && (
              <button
                type="button"
                className="search-clear"
                aria-label="Limpiar búsqueda"
                onClick={() => setQuery("")}
              >
                <X size={17} />
              </button>
            )}
          </form>
          <div className="header-actions">
            <Link
              className="account-link"
              href="/cuenta"
              aria-label={account ? "Mi cuenta" : "Iniciar sesión"}
            >
              <UserRound size={21} />
              <span>
                <small>
                  {account ? "Qué gusto verte" : "Bienvenido a Yemape"}
                </small>
                {account
                  ? account.name.split(" ")[0] || "Mi cuenta"
                  : "Iniciar sesión"}
              </span>
            </Link>
            <button
              className="cart-trigger"
              onClick={() => setCartOpen(true)}
              aria-label={`Abrir carrito, ${summary.count} productos`}
            >
              <ShoppingBag size={20} />
              <span className="cart-word">Mi carrito</span>
              <b>{summary.count}</b>
            </button>
            <button
              className="icon-button mobile-menu"
              aria-expanded={menu}
              aria-label="Abrir menú"
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        <nav
          className={`main-nav ${menu ? "is-open" : ""}`}
          aria-label="Navegación principal"
        >
          <a href="#catalogo" onClick={() => setMenu(false)}>
            Nuestra carta
          </a>
          <a href="#hecho-con-carino" onClick={() => setMenu(false)}>
            El toque Yemape
          </a>
          <a href="#como-pedir" onClick={() => setMenu(false)}>
            Cómo pedir
          </a>
          <a href="https://wa.me/51934219749" target="_blank" rel="noreferrer">
            Hablemos por WhatsApp <ArrowRight size={14} />
          </a>
          {account?.isAdmin && <Link href="/admin">Administración</Link>}
        </nav>
      </header>
      <main>
        <section
          className={`hero photo-hero ${featured ? "" : "hero-without-product"}`}
          aria-labelledby="hero-title"
        >
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="little-line" /> REPOSTERÍA YEMAPE · HECHA CON
              CARIÑO
            </span>
            <h1 id="hero-title">
              La vida sabe
              <br />
              mejor con <em>postre.</em>
            </h1>
            <p>
              Tortas, kekes y pequeños antojos para compartir. Elige tu favorito
              y coordinamos cada detalle por WhatsApp.
            </p>
            <a href="#catalogo" className="button">
              Ver catálogo <ArrowRight size={18} />
            </a>
            <div className="hero-note">
              <Heart size={17} />
              <span>Elige a tu ritmo. Coordinamos por WhatsApp.</span>
            </div>
          </div>
          {featured && (
            <div className="hero-visual">
              <Image
                src={featured.image}
                alt={featured.name}
                fill
                preload
                sizes="(max-width: 620px) 100vw, (max-width: 1440px) 55vw, 790px"
                className="hero-image"
              />
              <div className="hero-caption">
                <span>UN MOMENTO PARA DISFRUTAR</span>
                <strong>{featured.name}</strong>
                <button
                  type="button"
                  onClick={(e) => {
                    detailTrigger.current = e.currentTarget;
                    setSelectedProduct(featured);
                  }}
                  aria-label={`Descubrir ${featured.name}`}
                >
                  <ArrowRight />
                </button>
              </div>
            </div>
          )}
        </section>
        <div className="shopping-benefits" aria-label="Cómo comprar en Yemape">
          <span>
            <ShoppingBag size={18} aria-hidden="true" /> Pide sin crear una
            cuenta
          </span>
          <span>
            <MessageCircle size={18} aria-hidden="true" /> Atención por WhatsApp
          </span>
          <span>
            <Truck size={18} aria-hidden="true" /> Delivery y recojo por
            coordinar
          </span>
        </div>
        <section
          className="category-section"
          aria-label="Categorías de postres"
        >
          <div className="category-list">
            {(["Todos", ...categories] as const).map((c) => {
              const Icon = categoryIcons[c];
              return (
                <button
                  className={`category ${category === c ? "selected" : ""}`}
                  key={c}
                  onClick={() => choose(c)}
                  aria-pressed={category === c}
                >
                  <span className="category-icon">
                    <Icon size={27} strokeWidth={1.4} />
                  </span>
                  <span>{c === "Todos" ? "Todos los antojos" : c}</span>
                </button>
              );
            })}
          </div>
        </section>
        <section id="catalogo" className="catalog section-wrap">
          <div className="section-heading">
            <div>
              <span className="eyebrow">NUESTRA CARTA</span>
              <h2>¿Qué compartimos hoy?</h2>
              <p>Encuentra ese antojo que hace especial tu día.</p>
            </div>
            <span className="catalog-count" role="status" aria-live="polite">
              {visible.length} {visible.length === 1 ? "opción" : "opciones"}{" "}
              para ti
            </span>
          </div>
          <div className="mobile-search">
            <Search size={19} />
            <input
              aria-label="Buscar en catálogo"
              placeholder="Busca tu antojo favorito"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setQuery("");
              }}
            />
            {query && (
              <button
                type="button"
                className="search-clear"
                aria-label="Limpiar búsqueda"
                onClick={() => setQuery("")}
              >
                <X size={17} />
              </button>
            )}
          </div>
          {visible.length ? (
            <div className="product-grid">
              {visible.map((p, i) => {
                const count = cart.find((x) => x.id === p.id)?.quantity ?? 0;
                return (
                  <article className={`product-card card-${i % 4}`} key={p.id}>
                    <button
                      type="button"
                      className="product-photo product-photo-button"
                      onClick={(e) => {
                        detailTrigger.current = e.currentTarget;
                        setSelectedProduct(p);
                      }}
                      aria-label={`Ver detalles de ${p.name}`}
                    >
                      <Image
                        src={p.image}
                        alt={`Imagen referencial de ${p.name}`}
                        fill
                        sizes="(max-width: 359px) 100vw, (max-width: 1020px) 50vw, 25vw"
                      />
                      <span className="product-label">{p.category}</span>
                      <span className="product-discover">
                        Ver detalles <ArrowRight size={15} />
                      </span>
                    </button>
                    <div className="product-info">
                      <span className="product-presentation">
                        {p.presentation}
                      </span>
                      <h3>
                        <button
                          className="product-title-button"
                          onClick={(e) => {
                            detailTrigger.current = e.currentTarget;
                            setSelectedProduct(p);
                          }}
                        >
                          {p.name}
                        </button>
                      </h3>
                      <p>{p.description}</p>
                      <div className="product-buy">
                        <strong>
                          {p.price_cents === null
                            ? "Precio por consultar"
                            : money(p.price_cents)}
                        </strong>
                        <button
                          className={`add-button ${count ? "has-items" : ""}`}
                          disabled={!ready || count >= MAX_QUANTITY}
                          onClick={() => add(p)}
                          aria-label={`Agregar ${p.name} al carrito`}
                        >
                          {count ? <Check size={18} /> : <Plus size={18} />}
                          <span>
                            {count ? `Agregar (${count})` : "Agregar"}
                          </span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <Cookie size={40} />
              <h3>
                {query
                  ? "No encontramos ese antojo"
                  : "Estamos preparando esta categoría"}
              </h3>
              <p>
                {query
                  ? "Prueba con otro nombre o explora todas las opciones."
                  : "Puedes consultarnos por WhatsApp o descubrir el resto de la carta."}
              </p>
              <button
                className="button secondary"
                onClick={() => {
                  setCategory("Todos");
                  setQuery("");
                }}
              >
                Ver toda la carta
              </button>
            </div>
          )}
          <p className="catalog-footnote">
            Fotografías y diseños de referencia. Consulta tamaños y porciones.
            Confirmaremos presentación, disponibilidad y precio por WhatsApp.
          </p>
        </section>
        <section id="hecho-con-carino" className="brand-section section-wrap">
          <div className="brand-art">
            <Image
              src="/images/emblema.webp"
              alt="Emblema de Repostería Artesanal Yemape"
              width={300}
              height={300}
            />
          </div>
          <div className="brand-story">
            <span className="eyebrow">EL TOQUE YEMAPE</span>
            <h2>
              No solo hacemos postres.
              <br />
              <em>Acompañamos tus momentos.</em>
            </h2>
            <p>
              Ese cumpleaños que esperabas, una tarde en familia o un detalle
              para alguien especial. Nos encanta ser parte de lo que celebras.
            </p>
            <a
              className="text-link"
              href="https://wa.me/51934219749"
              target="_blank"
              rel="noreferrer"
            >
              Cuéntanos qué tienes en mente <ArrowRight size={18} />
            </a>
          </div>
        </section>
        <section id="como-pedir" className="how-section section-wrap">
          <div className="section-heading">
            <div>
              <span className="eyebrow">ASÍ DE FÁCIL</span>
              <h2>De un antojo a tu mesa.</h2>
            </div>
            <span className="no-account">
              <UserRound size={17} /> Con cuenta o sin ella
            </span>
          </div>
          <div className="steps">
            <article>
              <span>01</span>
              <ShoppingBag />
              <h3>Llena tu carrito</h3>
              <p>Elige tus postres y las cantidades que quieres compartir.</p>
            </article>
            <article>
              <span>02</span>
              <MapPin />
              <h3>Cuéntanos los detalles</h3>
              <p>Indica tu fecha deseada y si prefieres recojo o delivery.</p>
            </article>
            <article>
              <span>03</span>
              <MessageCircle />
              <h3>Lo coordinamos contigo</h3>
              <p>
                Envía tu carrito por WhatsApp. Confirmamos disponibilidad,
                importe y pago.
              </p>
            </article>
          </div>
        </section>
        <StoreFaq />
        <section className="contact-band">
          <div>
            <span className="eyebrow">CADA CELEBRACIÓN ES DIFERENTE</span>
            <h2>¿Tienes algo especial en mente?</h2>
            <p>
              Hablemos de tu torta, tu reunión o ese detalle que quieres
              regalar.
            </p>
          </div>
          <a
            href="https://wa.me/51934219749"
            target="_blank"
            rel="noreferrer"
            className="button"
          >
            <MessageCircle size={19} /> Escríbenos
          </a>
        </section>
      </main>
      <footer
        className={`site-footer ${summary.count > 0 ? "has-cart-dock" : ""}`}
      >
        <div className="footer-top">
          <Brand />
          <div>
            <h3>Un antojo, un mensaje</h3>
            <a
              href="https://wa.me/51934219749"
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp · 934 219 749
            </a>
            <p>Recojo y delivery previa coordinación.</p>
          </div>
          <div>
            <h3>Sigamos compartiendo</h3>
            <a
              href="https://www.instagram.com/reposteria_yemape/"
              target="_blank"
              rel="noreferrer"
            >
              <Instagram size={17} /> @reposteria_yemape
            </a>
            <a
              href="https://www.tiktok.com/@reposteriayemape11"
              target="_blank"
              rel="noreferrer"
            >
              TikTok · @reposteriayemape11
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>Yemape · Repostería artesanal</span>
          <div>
            <Link href="/privacidad">Privacidad</Link>
            <Link href="/cuenta">Mi cuenta</Link>
            <Link href="/admin">Administración</Link>
          </div>
        </div>
      </footer>
      <div
        className={`toast ${notice ? "show" : ""} ${summary.count > 0 ? "above-dock" : ""}`}
        role="status"
      >
        {notice && (
          <>
            <Check size={17} />
            {notice}
            <button onClick={() => setCartOpen(true)}>Ver carrito</button>
          </>
        )}
      </div>
      {storageError && (
        <div className="storage-warning" role="status">
          Tu navegador no permite guardar el carrito. Mantenlo abierto hasta
          finalizar.
        </div>
      )}
      {summary.count > 0 && (
        <div className="mobile-cart-dock" aria-label="Acceso rápido al carrito">
          <div>
            <strong>
              {summary.count} {summary.count === 1 ? "producto" : "productos"}
            </strong>
            <span>
              {summary.unpriced
                ? "Importe por confirmar"
                : money(summary.subtotal)}
            </span>
          </div>
          <button className="button" onClick={() => setCartOpen(true)}>
            <ShoppingBag size={18} /> Ver mi carrito <ArrowRight size={16} />
          </button>
        </div>
      )}
      {selectedProduct && (
        <ProductDetails
          key={selectedProduct.id}
          product={selectedProduct}
          returnFocusTo={detailTrigger.current}
          inCart={
            cart.find((item) => item.id === selectedProduct.id)?.quantity ?? 0
          }
          onClose={() => setSelectedProduct(null)}
          onAdd={(amount) => {
            add(selectedProduct, amount);
            setSelectedProduct(null);
          }}
        />
      )}
      <CartDialog
        open={cartOpen}
        close={() => setCartOpen(false)}
        cart={cart}
        products={products}
        account={account}
        change={quantity}
        remove={(id) => setCart((prev) => prev.filter((p) => p.id !== id))}
      />
    </>
  );
}
function CartDialog({
  open,
  close,
  cart,
  products,
  account,
  change,
  remove,
}: {
  open: boolean;
  close: () => void;
  cart: CartItem[];
  products: Product[];
  account: Account;
  change: (id: string, q: number) => void;
  remove: (id: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<"cart" | "details">("cart");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [details, setDetails] = useState<CheckoutDetails>({
    name: account?.profile?.full_name ?? "",
    address: account?.profile?.address ?? "",
    date: "",
    delivery: "recojo",
    notes: "",
  });
  const [today, setToday] = useState("");
  const { lines, count, subtotal, unpriced } = cartSummary(cart, products);
  useEffect(() => {
    if (open) {
      ref.current?.showModal();
      setToday(limaToday());
      setStep("cart");
      setError("");
      document.body.style.overflow = "hidden";
    } else {
      ref.current?.close();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  useEffect(() => {
    if (open) ref.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [step, open]);
  const update = <K extends keyof CheckoutDetails>(
    key: K,
    value: CheckoutDetails[K],
  ) => setDetails((d) => ({ ...d, [key]: value }));
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem = checkoutError(details);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        const result = await prepareCheckout(cart, details);
        if (result.error || !result.url) {
          setError(result.error ?? "No pudimos abrir WhatsApp.");
          return;
        }
        window.location.assign(result.url);
      } catch {
        setError(
          "No pudimos conectar. Tu carrito sigue guardado; vuelve a intentarlo.",
        );
      }
    });
  }
  return (
    <dialog
      ref={ref}
      className="cart-dialog"
      aria-labelledby="cart-title"
      onCancel={close}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <div className="cart-content">
        <div className="cart-heading">
          <div>
            <span className="eyebrow">UN POQUITO DE FELICIDAD</span>
            <h2 id="cart-title">
              {step === "cart" ? "Tu carrito" : "Los detalles de tu pedido"}
            </h2>
          </div>
          <button
            className="icon-button"
            onClick={close}
            aria-label="Cerrar carrito"
          >
            <X />
          </button>
        </div>
        {!count ? (
          <div className="empty-state">
            <ShoppingBag size={48} />
            <h3>Aquí comienza tu antojo</h3>
            <p>Agrega tus favoritos y coordinamos tu pedido por WhatsApp.</p>
            <button className="button" onClick={close}>
              Explorar la carta <ArrowRight size={17} />
            </button>
          </div>
        ) : (
          <>
            <div className="cart-progress">
              <span className={step === "cart" ? "active" : ""}>
                01 · Tu selección
              </span>
              <span className={step === "details" ? "active" : ""}>
                02 · Coordinar pedido
              </span>
            </div>
            {step === "cart" ? (
              <>
                <div className="cart-items">
                  {lines.map((l) => (
                    <article className="cart-item" key={l.id}>
                      <Image
                        src={l.product.image}
                        alt={l.product.name}
                        width={82}
                        height={92}
                      />
                      <div className="cart-item-info">
                        <h3>{l.product.name}</h3>
                        <p>{l.product.presentation}</p>
                        <strong>
                          {l.product.price_cents === null
                            ? "Por cotizar"
                            : money(l.product.price_cents * l.quantity)}
                        </strong>
                        <div className="quantity">
                          <button
                            aria-label={`Quitar una unidad de ${l.product.name}`}
                            onClick={() => change(l.id, -1)}
                          >
                            <Minus size={14} />
                          </button>
                          <span aria-label="Cantidad">{l.quantity}</span>
                          <button
                            aria-label={`Sumar una unidad de ${l.product.name}`}
                            disabled={l.quantity >= MAX_QUANTITY}
                            onClick={() => change(l.id, 1)}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                      <button
                        className="remove-button"
                        onClick={() => remove(l.id)}
                        aria-label={`Eliminar ${l.product.name}`}
                      >
                        <X size={17} />
                      </button>
                    </article>
                  ))}
                </div>
                <div className="cart-total">
                  <span>
                    {unpriced
                      ? "Productos con precio"
                      : "Subtotal de productos"}
                  </span>
                  <strong>
                    {unpriced && subtotal === 0
                      ? "Por cotizar"
                      : money(subtotal)}
                  </strong>
                </div>
                {unpriced && (
                  <p className="helper">
                    Tu selección incluye productos por cotizar. Confirmaremos el
                    importe final por WhatsApp.
                  </p>
                )}
                <p className="helper">
                  Delivery y disponibilidad se confirman al coordinar.
                </p>
                <button
                  className="button full"
                  onClick={() => setStep("details")}
                >
                  Continuar {account ? "" : "como invitado"}{" "}
                  <ArrowRight size={18} />
                </button>
                {!account && (
                  <p className="account-prompt">
                    ¿Ya tienes cuenta? <Link href="/cuenta">Inicia sesión</Link>
                    . Tu carrito se conserva.
                  </p>
                )}
                <button className="text-button" onClick={close}>
                  Seguir eligiendo
                </button>
              </>
            ) : (
              <form onSubmit={submit} className="checkout-form">
                <button
                  type="button"
                  className="text-button back-button"
                  onClick={() => setStep("cart")}
                >
                  ← Revisar mi carrito ({count})
                </button>
                <label>
                  Tu nombre
                  <input
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={100}
                    value={details.name}
                    onChange={(e) => update("name", e.target.value)}
                  />
                </label>
                <fieldset>
                  <legend>¿Cómo prefieres recibirlo?</legend>
                  <div className="delivery-options">
                    <label
                      className={details.delivery === "recojo" ? "chosen" : ""}
                    >
                      <input
                        type="radio"
                        name="delivery"
                        value="recojo"
                        checked={details.delivery === "recojo"}
                        onChange={() => update("delivery", "recojo")}
                      />
                      <ShoppingBag size={18} /> Recojo
                    </label>
                    <label
                      className={
                        details.delivery === "delivery" ? "chosen" : ""
                      }
                    >
                      <input
                        type="radio"
                        name="delivery"
                        value="delivery"
                        checked={details.delivery === "delivery"}
                        onChange={() => update("delivery", "delivery")}
                      />
                      <Truck size={18} /> Delivery
                    </label>
                  </div>
                </fieldset>
                {details.delivery === "delivery" ? (
                  <label>
                    Distrito y dirección
                    <input
                      autoComplete="street-address"
                      required
                      minLength={8}
                      maxLength={250}
                      value={details.address}
                      onChange={(e) => update("address", e.target.value)}
                    />
                    <small>
                      Confirmaremos cobertura y costo de envío por WhatsApp.
                    </small>
                  </label>
                ) : (
                  <p className="helper">
                    <MapPin size={15} /> Coordinaremos contigo el punto y
                    horario de recojo.
                  </p>
                )}
                <label>
                  Fecha deseada
                  <input
                    type="date"
                    required
                    min={today}
                    value={details.date}
                    onChange={(e) => update("date", e.target.value)}
                  />
                  <small>La fecha está sujeta a disponibilidad.</small>
                </label>
                <label>
                  ¿Algo que debamos saber? <small>(opcional)</small>
                  <textarea
                    maxLength={500}
                    rows={3}
                    placeholder="Presentación, número de personas, temática de la torta…"
                    value={details.notes}
                    onChange={(e) => update("notes", e.target.value)}
                  />
                </label>
                <section
                  className="checkout-review"
                  aria-labelledby="checkout-review-title"
                >
                  <div className="checkout-review-heading">
                    <h3 id="checkout-review-title">Revisa tu selección</h3>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setStep("cart")}
                    >
                      Editar
                    </button>
                  </div>
                  <ul>
                    {lines.map((line) => (
                      <li key={line.id}>
                        <span>
                          {line.quantity} × {line.product.name}
                          <small>{line.product.presentation}</small>
                        </span>
                        <strong>
                          {line.product.price_cents === null
                            ? "Por cotizar"
                            : money(line.product.price_cents * line.quantity)}
                        </strong>
                      </li>
                    ))}
                  </ul>
                  <div className="review-total">
                    <span>
                      {unpriced
                        ? "Importe de productos"
                        : "Subtotal de productos"}
                    </span>
                    <strong>
                      {unpriced
                        ? subtotal > 0
                          ? `${money(subtotal)} + por cotizar`
                          : "Por cotizar"
                        : money(subtotal)}
                    </strong>
                  </div>
                  <p>
                    {details.delivery === "delivery"
                      ? "Costo de delivery pendiente de confirmar."
                      : "Punto y horario de recojo por coordinar."}
                  </p>
                </section>
                <div className="order-notice">
                  <MessageCircle size={20} />
                  <p>
                    Se abrirá WhatsApp con tu pedido listo para enviar.
                    Confirmaremos disponibilidad, precio final y forma de pago
                    contigo.
                  </p>
                </div>
                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}
                <button
                  disabled={pending}
                  className="button whatsapp-button full"
                  type="submit"
                >
                  <MessageCircle size={19} />
                  {pending
                    ? "Preparando tu pedido…"
                    : "Finalizar pedido por WhatsApp"}
                </button>
                <p className="form-privacy">
                  Usaremos estos datos para coordinar tu pedido.{" "}
                  <Link href="/privacidad">Ver privacidad</Link>.
                </p>
              </form>
            )}
          </>
        )}
      </div>
    </dialog>
  );
}
